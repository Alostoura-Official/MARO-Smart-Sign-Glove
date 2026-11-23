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
