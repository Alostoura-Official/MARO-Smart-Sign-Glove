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

/* ================================================================
   33) 📲 نظام تثبيت التطبيق PWA
   ================================================================ */
(function () {
  'use strict';

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://');

  const installedFlag = localStorage.getItem('app-installed') === 'true';

  if (isStandalone || installedFlag) {
    console.log('✅ التطبيق مثبت - لن يظهر بانر التثبيت');
    const b = document.getElementById('installBanner');
    const h = document.getElementById('installHeaderBtn');
    if (b) b.style.display = 'none';
    if (h) h.style.display = 'none';
    return;
  }

  console.log('⚠️ التطبيق غير مثبت - سيعرض البانر عند الإمكان');

  let deferredPrompt = null;
  const banner = document.getElementById('installBanner');
  const installBtn = document.getElementById('installBtn');
  const closeBtn = document.getElementById('installClose');
  const headerBtn = document.getElementById('installHeaderBtn');
  const iosModal = document.getElementById('iosModal');
  const installOverlay = document.getElementById('installOverlay');

  if (!banner) return;

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);
  const isDesktop = !isIOS && !isAndroid;

  const dismissedTime = localStorage.getItem('install-dismissed');
  if (dismissedTime) {
    const daysSince = (Date.now() - +dismissedTime) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) {
      console.log('⏸️ المستخدم رفض التثبيت قبل ' + Math.round(daysSince) + ' أيام');
      return;
    }
  }

  function showBanner() {
    if (localStorage.getItem('app-installed') === 'true') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (banner) {
      banner.style.display = 'flex';
      const views = +(localStorage.getItem('install-banner-views') || 0);
      localStorage.setItem('install-banner-views', (views + 1).toString());
    }
  }

  function hideBanner(permanent = false) {
    if (banner) banner.style.display = 'none';
    if (permanent) localStorage.setItem('install-dismissed', Date.now().toString());
  }

  function showHeaderBtn() {
    if (localStorage.getItem('app-installed') === 'true') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (headerBtn) headerBtn.style.display = 'inline-block';
  }

  window.openInstallModal = function () {
    if (localStorage.getItem('app-installed') === 'true' ||
        window.matchMedia('(display-mode: standalone)').matches) {
      alert('✅ التطبيق مثبت بالفعل على جهازك');
      return;
    }
    if (isIOS) {
      if (iosModal) iosModal.style.display = 'block';
      if (installOverlay) installOverlay.style.display = 'block';
      document.body.style.overflow = 'hidden';
    } else if (deferredPrompt) {
      showBanner();
    } else {
      alert(
        '💡 لإضافة التطبيق:\n\n' +
        (isDesktop
          ? '• Chrome: اضغط ⊕ في شريط العنوان\n• أو: القائمة ⋮ → تثبيت'
          : '• Chrome: القائمة ⋮ → "تثبيت التطبيق"')
      );
    }
  };

  window.closeIosModal = function () {
    if (iosModal) iosModal.style.display = 'none';
    if (installOverlay) installOverlay.style.display = 'none';
    document.body.style.overflow = '';
  };

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('📲 التطبيق قابل للتثبيت');
    showHeaderBtn();
    setTimeout(() => { if (window.scrollY < 300) showBanner(); }, 3000);
  });

  if (isIOS) {
    showHeaderBtn();
    if (banner) {
      const bannerSubtitle = banner.querySelector('.install-text span');
      if (bannerSubtitle) bannerSubtitle.textContent = 'اضغط على زر المشاركة ⬆️ ثم "إضافة للشاشة"';
    }
    setTimeout(() => { if (window.scrollY < 300) showBanner(); }, 5000);
  }

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (isIOS) { window.openInstallModal(); return; }
      if (!deferredPrompt) { window.openInstallModal(); return; }
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('✅ المستخدم وافق على التثبيت');
        localStorage.setItem('app-installed', 'true');
        localStorage.setItem('app-installed-date', Date.now().toString());
        hideBanner();
        if (headerBtn) headerBtn.style.display = 'none';
      } else {
        console.log('❌ المستخدم رفض التثبيت');
        hideBanner(true);
      }
      deferredPrompt = null;
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => { hideBanner(true); });
  }

  window.addEventListener('appinstalled', () => {
    console.log('🎉 التطبيق اتثبت بنجاح');
    localStorage.setItem('app-installed', 'true');
    localStorage.setItem('app-installed-date', Date.now().toString());
    localStorage.removeItem('install-dismissed');
    hideBanner();
    if (headerBtn) headerBtn.style.display = 'none';
    deferredPrompt = null;
    setTimeout(() => {
      const toast = document.createElement('div');
      toast.textContent = '🎉 تم تثبيت التطبيق بنجاح!';
      toast.style.cssText = `
        position: fixed; bottom: 30px; left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #22c55e, #16a34a);
        color: #fff; padding: 14px 24px; border-radius: 14px;
        font-family: 'Tajawal', sans-serif; font-weight: 700; font-size: 15px;
        box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4);
        z-index: 100002; animation: slideUp 0.5s ease;
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    }, 500);
  });

  let scrollTriggered = false;
  window.addEventListener('scroll', () => {
    if (localStorage.getItem('app-installed') === 'true') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (scrollTriggered) return;
    if (window.scrollY > 500) {
      scrollTriggered = true;
      if (!localStorage.getItem('install-dismissed')) showBanner();
    }
  }, { passive: true });

  setInterval(() => {
    if (localStorage.getItem('app-installed') === 'true' ||
        window.matchMedia('(display-mode: standalone)').matches) {
      if (banner && banner.style.display !== 'none') banner.style.display = 'none';
      if (headerBtn && headerBtn.style.display !== 'none') headerBtn.style.display = 'none';
    }
  }, 30000);
})();
