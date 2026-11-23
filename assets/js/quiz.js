document.addEventListener('DOMContentLoaded', () => {
  const questions = [
    {
      q: 'ما المتحكم الرئيسي المستخدم في القفاز؟',
      a: ['Arduino UNO', 'ESP32-WROOM-32', 'Raspberry Pi', 'STM32'],
      c: 1,
      e: 'ESP32 هو وحدة المعالجة والتحكم الرئيسية في التصميم.'
    },
    {
      q: 'كم عدد حساسات الانحناء Flex Sensors؟',
      a: ['حساس واحد', 'ثلاثة حساسات', 'خمسة حساسات', 'عشرة حساسات'],
      c: 2,
      e: 'يوجد حساس لكل إصبع من أصابع اليد الخمسة.'
    },
    {
      q: 'ما وظيفة وحدة MPU6050؟',
      a: ['تشغيل ملفات الصوت', 'قياس الحركة والتسارع والدوران', 'شحن البطارية', 'عرض النصوص'],
      c: 1,
      e: 'تقيس MPU6050 التسارع والدوران للمساعدة في تحديد اتجاه اليد وحركتها.'
    },
    {
      q: 'ما وظيفة شاشة OLED؟',
      a: ['عرض اسم الإشارة وحالة النظام', 'قياس انحناء الإصبع', 'تخزين ملفات MP3', 'شحن القفاز'],
      c: 0,
      e: 'شاشة SSD1306 تعرض حالة النظام واسم الإشارة المتعرف عليها.'
    },
    {
      q: 'ما وظيفة DFPlayer Mini؟',
      a: ['قراءة حركة اليد', 'تشغيل ملفات MP3', 'معايرة Flex', 'تخزين قوالب الإشارات'],
      c: 1,
      e: 'يشغل ملفات صوتية مسجلة مسبقا من بطاقة microSD.'
    },
    {
      q: 'كيف يتعرف النموذج الحالي على الإشارات؟',
      a: ['يفهم أي إشارة تلقائيا', 'يقارن القراءات بقوالب ثابتة تم تدريبها', 'يرسل الفيديو إلى الإنترنت', 'يستخدم ChatGPT مباشرة'],
      c: 1,
      e: 'النسخة الحالية تستخدم مطابقة رقمية لقوالب ثابتة ولا تستخدم نموذجا للذكاء الاصطناعي بعد.'
    },
    {
      q: 'ما الإجراء الصحيح قبل توصيل حساسات Flex بمداخل ESP32؟',
      a: ['توصيل 5V مباشرة إلى GPIO', 'استخدام مقسم جهد وضمان ألا يتجاوز دخل GPIO 3.3V', 'إزالة مقاومات الحماية', 'توصيل الحساس بالسماعة'],
      c: 1,
      e: 'يجب استخدام مقسم جهد لكل حساس وألا يتجاوز جهد أي GPIO مستوى 3.3V.'
    },
    {
      q: 'هل النموذج الحالي مترجم كامل ومعتمد للغة الإشارة المصرية؟',
      a: ['نعم، لكل الإشارات', 'نعم، مع فهم الجمل', 'لا، هو نموذج أولي لإشارات ثابتة مدربة', 'لا يحتاج إلى اختبار'],
      c: 2,
      e: 'يجب جمع بيانات حقيقية والتحقق من معاني الإشارات ودقتها بالتعاون مع مستخدمي لغة الإشارة المصرية.'
    }
  ];

  let current = 0;
  let answers = Array(questions.length).fill(null);

  const quizContent = document.getElementById('quizContent');
  const progressText = document.getElementById('quizProgressText');
  const progressBar = document.getElementById('quizProgressBar');
  const prevBtn = document.getElementById('prevQuestion');
  const nextBtn = document.getElementById('nextQuestion');
  const resultBox = document.getElementById('quizResult');

  if (!quizContent || !progressText || !progressBar ||
      !prevBtn || !nextBtn || !resultBox) {
    console.error('Quiz initialization failed: HTML elements are missing.');
    return;
  }

  function renderQuestion() {
    const item = questions[current];

    progressText.textContent =
      `السؤال ${current + 1} من ${questions.length}`;

    progressBar.style.width =
      `${((current + 1) / questions.length) * 100}%`;

    quizContent.replaceChildren();

    const h = document.createElement('h3');
    h.className = 'question-title';
    h.textContent = item.q;
    quizContent.appendChild(h);

    const list = document.createElement('div');
    list.className = 'answers';

    item.a.forEach((answer, index) => {
      const label = document.createElement('label');

      label.className = 'answer-option' +
        (answers[current] === index ? ' selected' : '');

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'quiz-answer';
      input.value = index;
      input.checked = answers[current] === index;

      input.addEventListener('change', () => {
        answers[current] = index;
        renderQuestion();
      });

      const span = document.createElement('span');
      span.textContent = answer;

      label.append(input, span);
      list.appendChild(label);
    });

    quizContent.appendChild(list);

    prevBtn.disabled = current === 0;
    nextBtn.disabled = false;

    nextBtn.textContent =
      current === questions.length - 1
        ? 'إنهاء الاختبار'
        : 'التالي';
  }

  prevBtn.addEventListener('click', () => {
    if (current > 0) {
      current--;
      renderQuestion();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (answers[current] === null) {
      alert('اختر إجابة قبل الانتقال للسؤال التالي');
      return;
    }

    if (current < questions.length - 1) {
      current++;
      renderQuestion();
    } else {
      showResult();
    }
  });

  function showResult() {
    const score = questions.reduce(
      (sum, q, i) => sum + (answers[i] === q.c ? 1 : 0),
      0
    );

    const percent = Math.round(
      (score / questions.length) * 100
    );

    resultBox.replaceChildren();

    const heading = document.createElement('h3');
    heading.textContent = 'نتيجتك في الاختبار';

    const scoreNumber = document.createElement('div');
    scoreNumber.className = 'score-number';
    scoreNumber.textContent = `${score} / ${questions.length}`;

    const evaluation = document.createElement('b');
    evaluation.textContent =
      `${percent}% — ${
        percent >= 80 ? 'ممتاز!' :
        percent >= 60 ? 'جيد جدا، واصل التعلم' :
        'راجع شرح المشروع وحاول مرة أخرى'
      }`;

    resultBox.append(heading, scoreNumber, evaluation);

    const reviewContainer = document.createElement('div');
    reviewContainer.style.marginTop = '14px';

    questions.forEach((q, i) => {
      const ok = answers[i] === q.c;

      const review = document.createElement('div');
      review.className = 'review-item';

      const status = document.createElement('strong');
      status.className = ok ? 'correct' : 'wrong';
      status.textContent =
        `${i + 1}. ${ok ? 'إجابة صحيحة' : 'إجابة غير صحيحة'}`;

      const question = document.createElement('span');
      question.textContent = q.q;

      const correctAnswer = document.createElement('span');
      correctAnswer.textContent = `الإجابة الصحيحة: ${q.a[q.c]}`;

      const explanation = document.createElement('span');
      explanation.style.color = '#9eb4c7';
      explanation.textContent = q.e;

      review.append(
        status,
        question,
        document.createElement('br'),
        correctAnswer,
        document.createElement('br'),
        explanation
      );

      reviewContainer.appendChild(review);
    });

    resultBox.appendChild(reviewContainer);

    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn primary';
    retryBtn.style.marginTop = '15px';
    retryBtn.textContent = 'إعادة الاختبار';

    retryBtn.addEventListener('click', () => {
      answers = Array(questions.length).fill(null);
      current = 0;

      resultBox.hidden = true;
      nextBtn.disabled = false;

      renderQuestion();

      document.getElementById('quiz').scrollIntoView({
        behavior: 'smooth'
      });
    });

    resultBox.appendChild(retryBtn);

    resultBox.hidden = false;

    nextBtn.disabled = true;
    prevBtn.disabled = true;

    resultBox.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  renderQuestion();

  console.log('MARO Quiz initialized successfully');
});
