/*
  مشروع MARO Smart Sign Glove
  قفاز ذكي للمساعدة في تحويل بعض أوضاع اليد إلى نص وصوت

  وصف البرنامج:
  - قراءة خمسة حساسات انحناء للأصابع
  - قراءة اتجاه اليد من وحدة MPU6050
  - تدريب حتى ثماني إشارات ثابتة وحفظها في ذاكرة ESP32
  - عرض اسم الإشارة على شاشة OLED
  - تشغيل ملف صوتي مرتبط بالإشارة عبر DFPlayer Mini

  حدود النسخة:
  - هذه نسخة أولية قابلة للتدريب وليست مترجما معتمدا للغة الإشارة المصرية
  - يجب جمع عينات حقيقية والتحقق من كل إشارة مع مستخدمين مختصين
  - الحركات المتتابعة وتعبيرات الوجه غير مدعومة في هذا الإصدار
  - يجب معايرة الحساسات عند كل تشغيل في هذه النسخة

  احتياطات كهربائية:
  - لا توصل أي إشارة أعلى من 3.3 فولت إلى مداخل ESP32
  - استخدم مقسم جهد مستقل لكل حساس انحناء
  - اجعل الأرضي GND مشتركا بين الوحدات
  - لا توصل بطارية الليثيوم مباشرة بمداخل الطاقة دون دائرة تنظيم وحماية مناسبة
*/

/*
  A Voice for Every Sign
  قفاز ذكي لترجمة الإشارات باستخدام ESP32 - برنامج قابل لتدريب الإشارات

  المكونات الإلكترونية:
  - ESP32-WROOM-32
  - خمسة حساسات انحناء، وكل حساس موصل بدائرة مقسم جهد
  - وحدة قياس الحركة MPU6050 عبر I2C
  - شاشة OLED من نوع SSD1306 بدقة 128×64 وعنوان I2C يساوي 0x3C
  - وحدة DFPlayer Mini وبطاقة microSD وسماعة

  تنبيه مهم:
  هذا البرنامج مكتمل كنموذج أولي لقفاز يتعرف على الإشارات الثابتة بعد تدريبها.
  لا يحتوي البرنامج على قاعدة بيانات موثقة للغة الإشارة المصرية.
  يجب تدريب كل إشارة باستخدام القفاز الفعلي والمستخدم الفعلي من خلال
  أوامر نافذة المراقبة التسلسلية من 1 إلى 8. أما الإشارات الحركية وتعابير الوجه
  فتحتاج إلى حساسات ونماذج إضافية ولا تغطيها هذه النسخة.

  أوامر نافذة المراقبة التسلسلية:
    من 1 إلى 8 = تدريب خانة الإشارة المقابلة مع تثبيت وضع اليد
    s = عرض خانات الإشارات المحفوظة
    c = إعادة معايرة وضع اليد المفتوحة والقبضة
    x = مسح جميع الإشارات المدربة
    ? = عرض قائمة الأوامر

  ملفات الصوت الخاصة بوحدة DFPlayer:
    /MP3/0001.mp3 ... /MP3/0008.mp3
  يسجل في كل ملف صوتي نطق العبارة الخاصة بخانة الإشارة المقابلة.
*/

#include <Arduino.h>
#include <Wire.h>
#include <math.h>
#include <Preferences.h>

#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DFRobotDFPlayerMini.h>

// -------------------- تحديد أطراف التوصيل --------------------
static const uint8_t FLEX_PINS[5] = {32, 33, 34, 35, 36};
// الترتيب: الإبهام، السبابة، الوسطى، البنصر، الخنصر

static const int I2C_SDA_PIN = 21;
static const int I2C_SCL_PIN = 22;

static const int DFPLAYER_RX_PIN = 16; // طرف استقبال ESP32 رقم 2 يستقبل من إرسال DFPlayer
static const int DFPLAYER_TX_PIN = 17; // طرف إرسال ESP32 رقم 2 يرسل إلى استقبال DFPlayer

static const uint8_t OLED_ADDRESS = 0x3C;
static const int OLED_WIDTH = 128;
static const int OLED_HEIGHT = 64;

// -------------------- إعدادات التعرف على الإشارات --------------------
static const uint8_t FLEX_BEND_THRESHOLD = 50;
static const uint16_t CALIBRATION_TIME_MS = 2500;
static const uint16_t TRAINING_TIME_MS = 2200;
static const uint16_t STABLE_TIME_MS = 450;
static const uint16_t RECOGNITION_LOCKOUT_MS = 1400;
static const uint16_t SENSOR_SAMPLE_DELAY_MS = 15;

// أقصى مسافة بين قراءة الحساسات والنموذج المحفوظ لقبول الإشارة.
// القيمة الأقل تعني مطابقة أكثر صرامة، ويجب ضبطها بعد اختبار القراءات الفعلية.
static const float MATCH_DISTANCE_LIMIT = 22.0f;

static const uint8_t GESTURE_SLOTS = 8;
static const uint8_t FEATURE_COUNT = 8; // خمسة قياسات انحناء وثلاثة محاور تسارع بعد التطبيع

// -------------------- إنشاء كائنات المكتبات --------------------
Adafruit_MPU6050 mpu;
Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);
HardwareSerial dfSerial(2);
DFRobotDFPlayerMini dfPlayer;
Preferences preferences;

// -------------------- متغيرات حالة الوحدات --------------------
bool oledReady = false;
bool mpuReady = false;
bool audioReady = false;
bool calibrationReady = false;

// -------------------- بيانات الحساسات --------------------
int openReading[5] = {0, 0, 0, 0, 0};
int fistReading[5] = {0, 0, 0, 0, 0};
int rawFlex[5] = {0, 0, 0, 0, 0};
uint8_t bendPercent[5] = {0, 0, 0, 0, 0};

float accelUnit[3] = {0.0f, 0.0f, 1.0f};
float gyroMagnitude = 0.0f;
float currentFeatures[FEATURE_COUNT] = {0};

// -------------------- قاعدة بيانات الإشارات --------------------
struct GestureTemplate {
  bool valid;
  float features[FEATURE_COUNT];
};

GestureTemplate gestureDB[GESTURE_SLOTS];

// يمكن تعديل الأسماء، ويجب مطابقة كل خانة مع العبارة المسجلة في مجلد MP3.
const char *gestureNames[GESTURE_SLOTS] = {
  "HELLO",
  "THANK YOU",
  "YES",
  "NO",
  "HELP",
  "WATER",
  "PLEASE",
  "GOODBYE"
};

uint8_t lastRecognizedSlot = 255;
unsigned long lastRecognizedAt = 0;
unsigned long lastMaskChangedAt = 0;
uint8_t previousFlexMask = 255;

// -------------------- العرض والشاشة التسلسلية --------------------
void showMessage(const char *line1, const char *line2) {
  Serial.print(line1);
  Serial.print(" | ");
  Serial.println(line2);

  if (!oledReady) return;

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 12);
  display.println(line1);
  display.setCursor(0, 34);
  display.println(line2);
  display.display();
}

void showReadyScreen() {
  if (!oledReady) return;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("A VOICE FOR EVERY SIGN");
  display.println("---------------------");
  display.println("System: READY");
  display.print("MPU6050: ");
  display.println(mpuReady ? "OK" : "NOT FOUND");
  display.print("Audio: ");
  display.println(audioReady ? "OK" : "NOT FOUND");
  display.println("Show a trained sign");
  display.display();
}

// -------------------- قراءة الحساسات --------------------
int readFlexAverage(uint8_t pin) {
  uint32_t total = 0;
  const uint8_t samples = 10;

  for (uint8_t i = 0; i < samples; i++) {
    total += analogRead(pin);
    delay(2);
  }
  return (int)(total / samples);
}

void readFlexSensors() {
  for (uint8_t i = 0; i < 5; i++) {
    rawFlex[i] = readFlexAverage(FLEX_PINS[i]);

    int span = fistReading[i] - openReading[i];
    if (abs(span) < 80) {
      bendPercent[i] = 0;
    } else {
      long value = ((long)(rawFlex[i] - openReading[i]) * 100L) / span;
      bendPercent[i] = (uint8_t)constrain(value, 0L, 100L);
    }
  }
}

void readMotionSensor() {
  if (!mpuReady) {
    accelUnit[0] = 0.0f;
    accelUnit[1] = 0.0f;
    accelUnit[2] = 1.0f;
    gyroMagnitude = 0.0f;
    return;
  }

  sensors_event_t accelEvent, gyroEvent, tempEvent;
  mpu.getEvent(&accelEvent, &gyroEvent, &tempEvent);

  float ax = accelEvent.acceleration.x;
  float ay = accelEvent.acceleration.y;
  float az = accelEvent.acceleration.z;

  float magnitude = sqrtf(ax * ax + ay * ay + az * az);
  if (magnitude > 0.01f) {
    accelUnit[0] = ax / magnitude;
    accelUnit[1] = ay / magnitude;
    accelUnit[2] = az / magnitude;
  }

  gyroMagnitude = sqrtf(
    gyroEvent.gyro.x * gyroEvent.gyro.x +
    gyroEvent.gyro.y * gyroEvent.gyro.y +
    gyroEvent.gyro.z * gyroEvent.gyro.z
  );
}

uint8_t getFlexMask() {
  uint8_t mask = 0;
  for (uint8_t i = 0; i < 5; i++) {
    if (bendPercent[i] >= FLEX_BEND_THRESHOLD) {
      mask |= (1U << i);
    }
  }
  return mask;
}

void buildFeatureVector() {
  for (uint8_t i = 0; i < 5; i++) {
    currentFeatures[i] = (float)bendPercent[i];
  }

  // يتم تطبيع اتجاه التسارع وتحويله إلى نطاق تقريبي من 0 إلى 100.
  // هذا يلتقط اتجاه اليد الثابت ولا يسجل مسار الحركة الديناميكية كاملا.
  currentFeatures[5] = (accelUnit[0] + 1.0f) * 50.0f;
  currentFeatures[6] = (accelUnit[1] + 1.0f) * 50.0f;
  currentFeatures[7] = (accelUnit[2] + 1.0f) * 50.0f;
}

void readAllSensors() {
  readFlexSensors();
  readMotionSensor();
  buildFeatureVector();
}

// -------------------- المعايرة --------------------
void captureCalibrationPosition(int destination[5], const char *instruction) {
  showMessage("معايرة حساسات الانحناء", instruction);
  Serial.println();
  Serial.println(instruction);
  Serial.println("حافظ على ثبات الأصابع أثناء أخذ القراءات.");

  uint32_t sums[5] = {0, 0, 0, 0, 0};
  uint16_t samples = 0;
  unsigned long started = millis();

  while (millis() - started < CALIBRATION_TIME_MS) {
    for (uint8_t i = 0; i < 5; i++) {
      sums[i] += analogRead(FLEX_PINS[i]);
    }
    samples++;
    delay(20);
  }

  if (samples == 0) samples = 1;
  for (uint8_t i = 0; i < 5; i++) {
    destination[i] = (int)(sums[i] / samples);
  }
}

void calibrateFlexSensors() {
  captureCalibrationPosition(openReading, "STEP 1: OPEN HAND");
  delay(700);
  captureCalibrationPosition(fistReading, "STEP 2: MAKE A FIST");

  calibrationReady = true;

  Serial.println();
  Serial.println("Calibration results:");
  for (uint8_t i = 0; i < 5; i++) {
    Serial.printf("Finger %u: open=%d, fist=%d\n",
                  (unsigned)(i + 1), openReading[i], fistReading[i]);
  }

  showMessage("المعايرة DONE", "Train gestures: 1 to 8");
}

// -------------------- تخزين قاعدة البيانات --------------------
String featureKey(uint8_t slot, uint8_t feature) {
  return "g" + String(slot) + "f" + String(feature);
}

void loadGestureDatabase() {
  preferences.begin("sign-glove", false);

  for (uint8_t slot = 0; slot < GESTURE_SLOTS; slot++) {
    String validKey = "g" + String(slot) + "v";
    gestureDB[slot].valid = preferences.getBool(validKey.c_str(), false);

    for (uint8_t f = 0; f < FEATURE_COUNT; f++) {
      String key = featureKey(slot, f);
      gestureDB[slot].features[f] = preferences.getFloat(
        key.c_str(), 0.0f
      );
    }
  }
}

void saveGesture(uint8_t slot) {
  String validKey = "g" + String(slot) + "v";
  preferences.putBool(validKey.c_str(), true);

  for (uint8_t f = 0; f < FEATURE_COUNT; f++) {
    String key = featureKey(slot, f);
    preferences.putFloat(key.c_str(), gestureDB[slot].features[f]);
  }
  gestureDB[slot].valid = true;
}

void clearGestureDatabase() {
  for (uint8_t slot = 0; slot < GESTURE_SLOTS; slot++) {
    String validKey = "g" + String(slot) + "v";
    preferences.putBool(validKey.c_str(), false);
    gestureDB[slot].valid = false;
  }
  showMessage("GESTURES CLEARED", "Train slots 1 to 8");
  Serial.println("تم مسح قوالب الإشارات.");
}

void listGestureDatabase() {
  Serial.println();
  Serial.println("----- SAVED GESTURES -----");
  for (uint8_t i = 0; i < GESTURE_SLOTS; i++) {
    Serial.printf("%u: %s\n",
                  (unsigned)(i + 1),
                  gestureDB[i].valid ? gestureNames[i] : "NOT TRAINED");
  }
  Serial.println("--------------------------");
}

// -------------------- التدريب --------------------
void trainGesture(uint8_t slot) {
  if (slot >= GESTURE_SLOTS) return;

  char title[24];
  snprintf(title, sizeof(title), "TRAIN SLOT %u", (unsigned)(slot + 1));
  showMessage(title, "Hold sign steady");

  Serial.println();
  Serial.printf("Training slot %u: %s\n",
                (unsigned)(slot + 1), gestureNames[slot]);
  Serial.println("ثبت الإشارة المطلوبة لمدة تقارب 2.2 ثانية.");

  float sums[FEATURE_COUNT] = {0};
  uint16_t samples = 0;
  unsigned long started = millis();

  while (millis() - started < TRAINING_TIME_MS) {
    readAllSensors();
    for (uint8_t f = 0; f < FEATURE_COUNT; f++) {
      sums[f] += currentFeatures[f];
    }
    samples++;
    delay(SENSOR_SAMPLE_DELAY_MS);
  }

  if (samples == 0) samples = 1;

  for (uint8_t f = 0; f < FEATURE_COUNT; f++) {
    gestureDB[slot].features[f] = sums[f] / samples;
  }

  saveGesture(slot);

  Serial.printf("Saved: %s\n", gestureNames[slot]);
  Serial.println("أعد التدريب إذا لم يكن وضع اليد صحيحا.");

  showMessage("GESTURE SAVED", gestureNames[slot]);
  delay(900);
  showReadyScreen();
}

// -------------------- التعرف --------------------
float calculateDistance(const float a[FEATURE_COUNT],
                        const float b[FEATURE_COUNT]) {
  float total = 0.0f;

  // قراءات انحناء الأصابع هي السمات الأساسية في عملية المطابقة.
  for (uint8_t i = 0; i < 5; i++) {
    float difference = a[i] - b[i];
    total += difference * difference;
  }

  // اتجاه اليد له وزن أقل في حساب المطابقة.
  for (uint8_t i = 5; i < FEATURE_COUNT; i++) {
    float difference = a[i] - b[i];
    total += 0.35f * difference * difference;
  }

  return sqrtf(total / 6.05f);
}

int findBestGesture(float &bestDistance) {
  int bestSlot = -1;
  bestDistance = 100000.0f;

  for (uint8_t slot = 0; slot < GESTURE_SLOTS; slot++) {
    if (!gestureDB[slot].valid) continue;

    float distance = calculateDistance(
      currentFeatures, gestureDB[slot].features
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      bestSlot = slot;
    }
  }

  if (bestDistance > MATCH_DISTANCE_LIMIT) return -1;
  return bestSlot;
}

void announceGesture(uint8_t slot, float distance) {
  Serial.println();
  Serial.printf("RECOGNIZED: %s | distance=%.2f\n",
                gestureNames[slot], distance);

  showMessage("RECOGNIZED SIGN", gestureNames[slot]);

  if (audioReady) {
    // مسار الملفات على بطاقة الذاكرة: /MP3/0001.mp3 حتى /MP3/0008.mp3
    dfPlayer.playMp3Folder(slot + 1);
  }
}

void recognizeCurrentGesture() {
  float distance = 0.0f;
  int slot = findBestGesture(distance);

  if (slot < 0) {
    showMessage("UNKNOWN SIGN", "Please train this sign");
    Serial.println("لم يتم العثور على إشارة مطابقة ضمن الإشارات المدربة.");
    return;
  }

  announceGesture((uint8_t)slot, distance);
}

// -------------------- تهيئة المكونات الإلكترونية --------------------
void initializeOLED() {
  oledReady = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS);

  if (!oledReady) {
    Serial.println("OLED not detected. سيستمر البرنامج دون شاشة.");
    return;
  }

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("A VOICE FOR EVERY SIGN");
  display.println("Initializing...");
  display.display();
}

void initializeMPU6050() {
  mpuReady = mpu.begin(0x68, &Wire);

  if (!mpuReady) {
    Serial.println("MPU6050 not detected. سيعتمد النظام على حساسات الانحناء فقط.");
    return;
  }

  mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  Serial.println("MPU6050 initialized.");
}

void initializeDFPlayer() {
  dfSerial.begin(9600, SERIAL_8N1, DFPLAYER_RX_PIN, DFPLAYER_TX_PIN);
  delay(700);

  audioReady = dfPlayer.begin(dfSerial, true, true);

  if (!audioReady) {
    Serial.println("DFPlayer Mini not detected. سيظل التعرف النصي متاحا.");
    return;
  }

  dfPlayer.volume(22); // النطاق المسموح للصوت من 0 إلى 30
  Serial.println("DFPlayer Mini initialized.");
}

void initializeFlexPins() {
  analogReadResolution(12);

  for (uint8_t i = 0; i < 5; i++) {
    pinMode(FLEX_PINS[i], INPUT);
    analogSetPinAttenuation(FLEX_PINS[i], ADC_11db);
  }
}

// -------------------- أوامر المنفذ التسلسلي --------------------
void printHelp() {
  Serial.println();
  Serial.println("===== A VOICE FOR EVERY SIGN =====");
  Serial.println("1..8 : Train the corresponding gesture slot");
  Serial.println("s    : Show trained gesture slots");
  Serial.println("c    : Recalibrate flex sensors");
  Serial.println("x    : Clear all trained gestures");
  Serial.println("?    : Show this help");
  Serial.println("=================================");
}

void handleSerialCommands() {
  while (Serial.available()) {
    char command = Serial.read();

    if (command >= '1' && command <= '8') {
      trainGesture((uint8_t)(command - '1'));
      lastRecognizedSlot = 255;
      lastRecognizedAt = millis();
    } else if (command == 's' || command == 'S') {
      listGestureDatabase();
    } else if (command == 'c' || command == 'C') {
      calibrateFlexSensors();
      lastRecognizedSlot = 255;
    } else if (command == 'x' || command == 'X') {
      clearGestureDatabase();
    } else if (command == '?') {
      printHelp();
    }
  }
}

// -------------------- عرض بيانات الفحص --------------------
void printSensorDebug() {
  Serial.print("Bend% [thumb,index,middle,ring,little] = ");
  for (uint8_t i = 0; i < 5; i++) {
    Serial.print(bendPercent[i]);
    if (i < 4) Serial.print(", ");
  }

  Serial.printf(" | Accel unit = %.2f, %.2f, %.2f",
                accelUnit[0], accelUnit[1], accelUnit[2]);
  Serial.printf(" | Gyro = %.2f rad/s\n", gyroMagnitude);
}

// -------------------- إعداد النظام عند التشغيل --------------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("A Voice for Every Sign - ESP32 Smart Glove");
  Serial.println("Starting hardware...");

  initializeFlexPins();

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  initializeOLED();
  initializeMPU6050();
  initializeDFPlayer();

  loadGestureDatabase();

  showMessage("SMART GLOVE", "Starting calibration");
  delay(700);

  calibrateFlexSensors();
  listGestureDatabase();
  printHelp();

  showReadyScreen();
}

// -------------------- الحلقة الرئيسية المستمرة --------------------
void loop() {
  handleSerialCommands();

  if (!calibrationReady) {
    delay(20);
    return;
  }

  readAllSensors();

  uint8_t flexMask = getFlexMask();

  if (flexMask != previousFlexMask) {
    previousFlexMask = flexMask;
    lastMaskChangedAt = millis();
  }

  bool stable = (millis() - lastMaskChangedAt) >= STABLE_TIME_MS;
  bool lockoutFinished =
    (millis() - lastRecognizedAt) >= RECOGNITION_LOCKOUT_MS;

  if (stable && lockoutFinished) {
    float distance = 0.0f;
    int candidate = findBestGesture(distance);

    if (candidate >= 0) {
      if (candidate != lastRecognizedSlot) {
        announceGesture((uint8_t)candidate, distance);
        lastRecognizedSlot = (uint8_t)candidate;
        lastRecognizedAt = millis();
      }
    } else if (lastRecognizedSlot != 255) {
      showMessage("UNKNOWN SIGN", "Try a trained sign");
      lastRecognizedSlot = 255;
      lastRecognizedAt = millis();
    }
  }

  static unsigned long lastDebugTime = 0;
  if (millis() - lastDebugTime >= 700) {
    lastDebugTime = millis();
    printSensorDebug();
  }

  delay(20);
}
