document.getElementById('year').textContent = new Date().getFullYear();
const menuToggle=document.getElementById('menuToggle'), mainNav=document.getElementById('mainNav');
menuToggle.addEventListener('click',()=>{const open=mainNav.classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));});
mainNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mainNav.classList.remove('open');menuToggle.setAttribute('aria-expanded','false');}));

// اختبار اتصال USB Serial: قراءة المخرجات النصية فقط من ESP32.
const connectBtn=document.getElementById('connectBtn'),disconnectBtn=document.getElementById('disconnectBtn');
const serialOutput=document.getElementById('serialOutput'),lineCount=document.getElementById('lineCount');
const connectionDot=document.getElementById('connectionDot'),connectionText=document.getElementById('connectionText');
const serialSupport=document.getElementById('serialSupport');
let serialPort=null,reader=null,keepReading=false,serialLines=0;
if(!('serial' in navigator)){serialSupport.textContent='متصفحك لا يدعم Web Serial. جرّب Chrome أو Edge على كمبيوتر عبر HTTPS.';connectBtn.disabled=true;}
else{serialSupport.textContent='Web Serial متاح في هذا المتصفح. الاتصال يتطلب HTTPS أو localhost.';}
function addSerialLine(line){
  const empty=serialOutput.querySelector('.terminal-muted');if(empty)empty.remove();
  const p=document.createElement('p');p.className='terminal-line';p.textContent=line;
  serialOutput.appendChild(p);serialOutput.scrollTop=serialOutput.scrollHeight;
  serialLines++;lineCount.textContent=serialLines+' سطر';
}
connectBtn.addEventListener('click',async()=>{
  if(!('serial' in navigator))return;
  try{
    serialPort=await navigator.serial.requestPort();
    await serialPort.open({baudRate:115200});
    connectionDot.parentElement.classList.add('connected');connectionText.textContent='متصل بلوحة ESP32';
    connectBtn.disabled=true;disconnectBtn.disabled=false;keepReading=true;
    const decoder=new TextDecoderStream();
    const closed=serialPort.readable.pipeTo(decoder.writable);
    reader=decoder.readable.getReader();
    let buffer='';
    while(keepReading){
      const {value,done}=await reader.read();if(done)break;
      buffer+=value;
      const parts=buffer.split(/\r?\n/);buffer=parts.pop();
      parts.forEach(line=>{if(line.trim())addSerialLine(line.trim());});
    }
    if(buffer.trim())addSerialLine(buffer.trim());
    await closed.catch(()=>{});
  }catch(err){
    if(err.name!=='NotFoundError')addSerialLine('Serial error: '+err.message);
    await closeSerial();
  }
});
async function closeSerial(){
  keepReading=false;
  try{if(reader){await reader.cancel();reader.releaseLock();}}catch(e){}
  reader=null;
  try{if(serialPort){await serialPort.close();}}catch(e){}
  serialPort=null;connectionDot.parentElement.classList.remove('connected');connectionText.textContent='غير متصل';
  connectBtn.disabled=!('serial' in navigator);disconnectBtn.disabled=true;
}
disconnectBtn.addEventListener('click',closeSerial);
window.addEventListener('beforeunload',()=>{if(reader)reader.cancel().catch(()=>{});});

// اختبار المعرفة: الأسئلة مبنية على وصف النموذج والوثائق المرفقة بالمشروع.
const questions=[
 {q:'ما المتحكم الرئيسي المستخدم في القفاز؟',a:['Arduino UNO','ESP32-WROOM-32','Raspberry Pi','STM32'],c:1,e:'ESP32 هو وحدة المعالجة والتحكم الرئيسية في التصميم.'},
 {q:'كم عدد حساسات الانحناء Flex Sensors؟',a:['حساس واحد','ثلاثة حساسات','خمسة حساسات','عشرة حساسات'],c:2,e:'يوجد حساس لكل إصبع من أصابع اليد الخمسة.'},
 {q:'ما وظيفة وحدة MPU6050؟',a:['تشغيل ملفات الصوت','قياس الحركة والتسارع والدوران','شحن البطارية','عرض النصوص'],c:1,e:'تقيس MPU6050 التسارع والدوران للمساعدة في تحديد اتجاه اليد وحركتها.'},
 {q:'ما وظيفة شاشة OLED؟',a:['عرض اسم الإشارة وحالة النظام','قياس انحناء الإصبع','تخزين ملفات MP3','شحن القفاز'],c:0,e:'شاشة SSD1306 تعرض حالة النظام واسم الإشارة المتعرف عليها.'},
 {q:'ما وظيفة DFPlayer Mini؟',a:['قراءة حركة اليد','تشغيل ملفات MP3','معايرة Flex','تخزين قوالب الإشارات'],c:1,e:'يشغل ملفات صوتية مسجلة مسبقا من بطاقة microSD.'},
 {q:'كيف يتعرف النموذج الحالي على الإشارات؟',a:['يفهم أي إشارة تلقائيا','يقارن القراءات بقوالب ثابتة تم تدريبها','يرسل الفيديو إلى الإنترنت','يستخدم ChatGPT مباشرة'],c:1,e:'النسخة الحالية تستخدم مطابقة رقمية لقوالب ثابتة؛ لا تستخدم نموذجا للذكاء الاصطناعي بعد.'},
 {q:'ما الإجراء الصحيح قبل توصيل حساسات Flex بمداخل ESP32؟',a:['توصيل 5V مباشرة إلى GPIO','استخدام مقسم جهد وضمان ألا يتجاوز دخل GPIO 3.3V','إزالة مقاومات الحماية','توصيل الحساس بالسماعة'],c:1,e:'يجب استخدام مقسم جهد لكل حساس وألا يتجاوز جهد أي GPIO مستوى 3.3V.'},
 {q:'هل النموذج الحالي مترجم كامل ومعتمد للغة الإشارة المصرية؟',a:['نعم، لكل الإشارات','نعم، مع فهم الجمل','لا، هو نموذج أولي لإشارات ثابتة مدربة','لا يحتاج إلى اختبار'],c:2,e:'يجب جمع بيانات حقيقية والتحقق من معاني الإشارات ودقتها بالتعاون مع مستخدمي لغة الإشارة المصرية.'}
];
let current=0,answers=Array(questions.length).fill(null);
const quizContent=document.getElementById('quizContent'),progressText=document.getElementById('quizProgressText'),progressBar=document.getElementById('quizProgressBar');
const prevBtn=document.getElementById('prevQuestion'),nextBtn=document.getElementById('nextQuestion'),resultBox=document.getElementById('quizResult');
function renderQuestion(){
 const item=questions[current];progressText.textContent=`السؤال ${current+1} من ${questions.length}`;
 progressBar.style.width=((current+1)/questions.length*100)+'%';
 quizContent.innerHTML='';
 const h=document.createElement('h3');h.className='question-title';h.textContent=item.q;quizContent.appendChild(h);
 const list=document.createElement('div');list.className='answers';
 item.a.forEach((answer,index)=>{
  const label=document.createElement('label');label.className='answer-option'+(answers[current]===index?' selected':'');
  const input=document.createElement('input');input.type='radio';input.name='quiz-answer';input.value=index;input.checked=answers[current]===index;
  input.addEventListener('change',()=>{answers[current]=index;renderQuestion();});
  const span=document.createElement('span');span.textContent=answer;label.append(input,span);list.appendChild(label);
 });quizContent.appendChild(list);
 prevBtn.disabled=current===0;nextBtn.textContent=current===questions.length-1?'إنهاء الاختبار':'التالي';
}
prevBtn.addEventListener('click',()=>{if(current>0){current--;renderQuestion();}});
nextBtn.addEventListener('click',()=>{
 if(answers[current]===null){alert('اختر إجابة قبل الانتقال للسؤال التالي');return;}
 if(current<questions.length-1){current++;renderQuestion();}else showResult();
});
function showResult(){
 const score=questions.reduce((sum,q,i)=>sum+(answers[i]===q.c?1:0),0);
 const percent=Math.round(score/questions.length*100);
 resultBox.hidden=false;
 let html=`<h3>نتيجتك في الاختبار</h3><div class="score-number">${score} / ${questions.length}</div><b>${percent}% — ${percent>=80?'ممتاز!':percent>=60?'جيد جدا، واصل التعلم':'راجع شرح المشروع وحاول مرة أخرى'}</b><div style="margin-top:14px">`;
 questions.forEach((q,i)=>{
  const ok=answers[i]===q.c;
  html+=`<div class="review-item"><strong class="${ok?'correct':'wrong'}">${i+1}. ${ok?'إجابة صحيحة':'إجابة غير صحيحة'}</strong><span>${q.q}</span><br><span>الإجابة الصحيحة: ${q.a[q.c]}</span><br><span style="color:#9eb4c7">${q.e}</span></div>`;
 });
 html+='</div><button class="btn primary" id="retryQuiz" style="margin-top:15px">إعادة الاختبار</button>';
 resultBox.innerHTML=html;resultBox.scrollIntoView({behavior:'smooth',block:'start'});
 document.getElementById('retryQuiz').addEventListener('click',()=>{answers=Array(questions.length).fill(null);current=0;resultBox.hidden=true;renderQuestion();document.getElementById('quiz').scrollIntoView({behavior:'smooth'});});
 nextBtn.disabled=true;prevBtn.disabled=true;
}
renderQuestion();

<!-- =================== سكربت محاكاة الكاميرا (CV) =================== -->

import { FilesetResolver, HandLandmarker, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/vision_bundle.mjs";

  const video = document.getElementById('webcam');
  const canvas = document.getElementById('overlay');
  const ctx = canvas.getContext('2d');
  const oledText = document.getElementById('oledText');
  const oledSub = document.getElementById('oledSub');
  const statusBox = document.getElementById('statusBox');
  const trainedList = document.getElementById('trainedList');
  const placeholder = document.getElementById('videoPlaceholder');
  const trainBtn = document.getElementById('trainBtn');
  const trainingPanel = document.getElementById('trainingPanel');
  const startCameraBtn = document.getElementById('startCameraBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const gestureNameInput = document.getElementById('gestureName');

  let handLandmarker = null;
  let lastVideoTime = -1;
  let trainedGestures = [];
  let isTrainingMode = false;
  let trainingSamples = [];
  let trainingName = '';
  let currentFingerAngles = [];

  // --- إعدادات التعرف (State Machine) ---
  let currentRecognizedGesture = null;
  let lastSpokenGesture = null;
  let stableFrames = 0;
  const REQUIRED_STABLE_FRAMES = 10;
  let lastSeenTime = 0;

  // --- قفل زمني للنطق (Cooldown) ---
  let lastSpokenTime = 0;
  const SPEAK_COOLDOWN_MS = 3000;

  // --- تهيئة MediaPipe ---
  async function initMediaPipe() {
    statusBox.innerText = '⏳ جاري تحميل نماذج الذكاء الاصطناعي...';
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm"
      );
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      statusBox.innerText = '✅ جاهز! اضغط تشغيل الكاميرا';
    } catch (e) {
      statusBox.innerText = '⚠️ تعذّر تحميل النموذج. تحقق من الاتصال بالإنترنت.';
      statusBox.classList.add('error');
    }
  }
  initMediaPipe();

  // --- تشغيل الكاميرا ---
  async function startCamera() {
    if (!handLandmarker) { alert('النموذج لا يزال يُحمّل، انتظر قليلاً.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      placeholder.style.display = 'none';
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        requestAnimationFrame(processFrame);
      };
      statusBox.innerText = '⚡ الكاميرا تعمل... ابدأ بعمل إشارة';
    } catch (e) {
      statusBox.innerText = '⚠️ تعذّر الوصول للكاميرا. اسمح بالوصول من المتصفح.';
      statusBox.classList.add('error');
    }
  }

  // --- حلقة معالجة الفيديو ---
  function processFrame() {
    if (!handLandmarker || video.readyState < 2) {
      requestAnimationFrame(processFrame);
      return;
    }

    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const results = handLandmarker.detectForVideo(video, performance.now());

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const drawingUtils = new DrawingUtils(ctx);

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {color: '#00e5ff', lineWidth: 3});
        drawingUtils.drawLandmarks(landmarks, {color: '#7c4dff', lineWidth: 1, radius: 3});

        currentFingerAngles = calculateFingerAngles(landmarks);
        lastSeenTime = Date.now();

        if (isTrainingMode) {
          trainingSamples.push([...currentFingerAngles]);
          if (trainingSamples.length >= 30) {
            finishTraining();
          }
        } else if (trainedGestures.length > 0) {
          recognizeGesture();
        }
      } else {
        currentFingerAngles = [];
        if (Date.now() - lastSeenTime > 500) {
          resetRecognitionState();
        }
      }
    }
    requestAnimationFrame(processFrame);
  }

  // --- حساب زوايا الإصابع ---
  function calculateFingerAngles(landmarks) {
    const fingers = [
      [1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]
    ];
    let angles = [];
    fingers.forEach(finger => {
      const p1 = landmarks[finger[1]];
      const p2 = landmarks[finger[2]];
      const p3 = landmarks[finger[3]];
      const v1 = {x: p2.x - p1.x, y: p2.y - p1.y};
      const v2 = {x: p3.x - p2.x, y: p3.y - p2.y};
      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.sqrt(v1.x**2 + v1.y**2);
      const mag2 = Math.sqrt(v2.x**2 + v2.y**2);
      let angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
      angles.push(angle);
    });
    return angles;
  }

  function resetRecognitionState() {
    currentRecognizedGesture = null;
    stableFrames = 0;
    oledText.innerText = 'WAITING';
    oledText.style.color = 'var(--cv-primary)';
    oledSub.innerText = 'No gesture detected';
  }

  // --- دالة تبديل وضع التدريب ---
  function toggleTraining() {
    if (isTrainingMode) {
      isTrainingMode = false;
      trainingSamples = [];
      trainingName = '';
      trainBtn.innerText = 'بدء التدريب';
      trainBtn.classList.remove('cv-btn-danger');
      trainBtn.classList.add('cv-btn-secondary');
      trainingPanel.classList.remove('training-active');
      statusBox.innerText = '⚡ تم إلغاء التدريب. جاهز للتعرف...';
      return;
    }

    const name = gestureNameInput.value.trim();
    if (!name) { alert('الرجاء إدخال اسم الإشارة'); return; }
    if (currentFingerAngles.length === 0) { alert('لم يتم اكتشاف يد. قف أمام الكاميرا أولاً.'); return; }

    isTrainingMode = true;
    trainingSamples = [];
    trainingName = name;
    trainBtn.innerText = 'إلغاء التدريب';
    trainBtn.classList.remove('cv-btn-secondary');
    trainBtn.classList.add('cv-btn-danger');
    trainingPanel.classList.add('training-active');
    statusBox.innerText = '📸 جاري تسجيل الإشارة... (' + name + ')';

    resetRecognitionState();
  }

  // --- إنهاء التدريب وحفظ الإشارة ---
  function finishTraining() {
    if (trainingSamples.length < 10) {
      statusBox.innerText = '⚠️ لم يتم تسجيل عينات كافية. حاول مرة أخرى.';
      isTrainingMode = false;
      trainBtn.innerText = 'بدء التدريب';
      trainBtn.classList.remove('cv-btn-danger');
      trainBtn.classList.add('cv-btn-secondary');
      trainingPanel.classList.remove('training-active');
      return;
    }

    let avgAngles = [0, 0, 0, 0, 0];
    trainingSamples.forEach(s => {
      for (let i = 0; i < 5; i++) avgAngles[i] += s[i];
    });
    for (let i = 0; i < 5; i++) avgAngles[i] /= trainingSamples.length;

    trainedGestures.push({ name: trainingName, angles: avgAngles });
    updateTrainedList();

    isTrainingMode = false;
    trainingSamples = [];
    trainingName = '';
    trainBtn.innerText = 'بدء التدريب';
    trainBtn.classList.remove('cv-btn-danger');
    trainBtn.classList.add('cv-btn-secondary');
    trainingPanel.classList.remove('training-active');

    gestureNameInput.value = '';
    statusBox.innerText = '✅ تم تدريب الإشارة بنجاح! جاهز للتعرف التلقائي.';
    speak("تم التدريب بنجاح");

    resetRecognitionState();
    lastSpokenGesture = null;
  }

  // --- التعرف التلقائي (State Machine + Cooldown) ---
  function recognizeGesture() {
    if (currentFingerAngles.length === 0) return;

    let bestMatch = null;
    let minDiff = Infinity;

    trainedGestures.forEach(g => {
      let diff = 0;
      for (let i = 0; i < 5; i++) {
        diff += Math.abs(currentFingerAngles[i] - g.angles[i]);
      }
      diff /= 5;
      if (diff < minDiff) {
        minDiff = diff;
        bestMatch = g;
      }
    });

    if (bestMatch && minDiff < 25) {
      if (currentRecognizedGesture !== bestMatch.name) {
        currentRecognizedGesture = bestMatch.name;
        stableFrames = 1;
      } else {
        stableFrames++;
      }

      if (stableFrames >= REQUIRED_STABLE_FRAMES) {
        const now = Date.now();
        const timeSinceLastSpoken = now - lastSpokenTime;

        const isNewGesture = currentRecognizedGesture !== lastSpokenGesture;
        const cooldownPassed = timeSinceLastSpoken >= SPEAK_COOLDOWN_MS;

        if (isNewGesture || cooldownPassed) {
          oledText.innerText = bestMatch.name;
          oledText.style.color = 'var(--cv-primary)';
          oledSub.innerText = 'Match: ' + (100 - minDiff).toFixed(1) + '%';
          speak(bestMatch.name);
          lastSpokenGesture = currentRecognizedGesture;
          lastSpokenTime = now;
        } else {
          oledText.innerText = bestMatch.name;
          oledText.style.color = 'var(--cv-primary)';
          oledSub.innerText = 'Match: ' + (100 - minDiff).toFixed(1) + '% (Narrated)';
        }
      }
    } else {
      if (currentRecognizedGesture !== null) {
        currentRecognizedGesture = null;
        stableFrames = 0;
        oledText.innerText = 'UNKNOWN';
        oledText.style.color = 'var(--cv-danger)';
        oledSub.innerText = 'No match found';
      }
    }
  }

  function updateTrainedList() {
    if (trainedGestures.length === 0) {
      trainedList.innerText = 'لا توجد إشارات مدربة بعد.';
      return;
    }
    trainedList.innerHTML = trainedGestures.map((g, i) =>
      `<div class="cv-trained-row">
        <span>${i+1}. ${g.name}</span>
        <span class="ang">${g.angles.map(a=>a.toFixed(0)).join(' | ')}</span>
      </div>`
    ).join('');
  }

  function clearAll() {
    trainedGestures = [];
    updateTrainedList();
    resetRecognitionState();
    lastSpokenGesture = null;
    lastSpokenTime = 0;
    statusBox.innerText = '⚡ تم مسح الإشارات';
  }

  function speak(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }

  // ربط الأحداث (بدل onclick inline)
  startCameraBtn.addEventListener('click', startCamera);
  trainBtn.addEventListener('click', toggleTraining);
  clearAllBtn.addEventListener('click', clearAll);