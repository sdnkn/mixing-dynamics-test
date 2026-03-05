// All 20 questions for the dynamics test
const QUESTIONS = [
  // ─── BEGINNER (7 questions) ───────────────────────────────────
  {
    id: 'b1',
    type: 'theory',
    difficulty: 'beginner',
    category: 'theory',
    question: 'What does a compressor do to an audio signal?',
    questionRu: 'Что делает компрессор с аудиосигналом?',
    options: [
      'Reduces the dynamic range by attenuating loud parts',
      'Boosts all frequencies equally',
      'Adds reverb to the signal',
      'Removes low frequencies'
    ],
    optionsRu: [
      'Сужает динамический диапазон, ослабляя громкие части',
      'Усиливает все частоты одинаково',
      'Добавляет реверберацию к сигналу',
      'Убирает низкие частоты'
    ],
    correctIndex: 0,
    explanation: 'Компрессор уменьшает разницу между самыми громкими и самыми тихими частями сигнала, делая звук более ровным.',
    points: 10
  },
  {
    id: 'b2',
    type: 'theory',
    difficulty: 'beginner',
    category: 'theory',
    question: 'What happens when you lower the threshold on a compressor?',
    questionRu: 'Что происходит при снижении порога (threshold) компрессора?',
    options: [
      'More of the signal gets compressed',
      'Less of the signal gets compressed',
      'The attack time changes',
      'The output volume increases'
    ],
    optionsRu: [
      'Больше сигнала подвергается компрессии',
      'Меньше сигнала подвергается компрессии',
      'Меняется время атаки',
      'Увеличивается громкость на выходе'
    ],
    correctIndex: 0,
    explanation: 'Чем ниже порог, тем больше сигнала превышает его, и тем больше компрессии применяется.',
    points: 10
  },
  {
    id: 'b3',
    type: 'theory',
    difficulty: 'beginner',
    category: 'theory',
    question: 'What is the difference between ratio 2:1 and 8:1?',
    questionRu: 'Чем отличается ratio 2:1 от 8:1?',
    options: [
      'At 8:1 the dynamic range is compressed much more aggressively',
      'At 2:1 the compression is stronger',
      'Ratio does not affect the amount of compression',
      'At 8:1 only high frequencies are compressed'
    ],
    optionsRu: [
      'При 8:1 динамический диапазон сжимается значительно сильнее',
      'При 2:1 компрессия сильнее',
      'Ratio не влияет на количество компрессии',
      'При 8:1 компрессируются только высокие частоты'
    ],
    correctIndex: 0,
    explanation: 'Ratio определяет степень сжатия. При 2:1 сигнал на 2 дБ выше порога превращается в 1 дБ, при 8:1 — 8 дБ превращаются в 1 дБ.',
    points: 10
  },
  {
    id: 'b4',
    type: 'detection',
    difficulty: 'beginner',
    category: 'ear_training',
    question: 'Which variant has MORE compression?',
    questionRu: 'Какой вариант имеет БОЛЬШЕ компрессии?',
    audioSource: 'drums',
    settingsA: { threshold: -10, ratio: 2, attack: 0.02, release: 0.1 },
    settingsB: { threshold: -30, ratio: 8, attack: 0.003, release: 0.05 },
    correctAnswer: 'B',
    explanation: 'Вариант B имеет более низкий порог (-30 дБ) и более высокий ratio (8:1), что даёт значительно больше компрессии.',
    points: 15
  },
  {
    id: 'b5',
    type: 'detection',
    difficulty: 'beginner',
    category: 'ear_training',
    question: 'Which variant has FASTER attack? (listen to the transients)',
    questionRu: 'Где атака БЫСТРЕЕ? (слушай транзиенты)',
    audioSource: 'drums',
    settingsA: { threshold: -20, ratio: 4, attack: 0.001, release: 0.1 },
    settingsB: { threshold: -20, ratio: 4, attack: 0.1, release: 0.1 },
    correctAnswer: 'A',
    explanation: 'При быстрой атаке (1 мс) компрессор мгновенно "ловит" удар, делая транзиенты менее выраженными. При медленной атаке (100 мс) удар проходит, и компрессия наступает позже.',
    points: 15
  },
  {
    id: 'b6',
    type: 'identify',
    difficulty: 'beginner',
    category: 'ear_training',
    question: 'What ratio is applied to this audio?',
    questionRu: 'Какой ratio применён к этому аудио?',
    audioSource: 'bass',
    hiddenSettings: { threshold: -20, ratio: 8, attack: 0.005, release: 0.1 },
    paramToIdentify: 'ratio',
    options: ['2:1', '4:1', '8:1', '20:1'],
    correctIndex: 2,
    explanation: 'Ratio 8:1 — это тяжёлая компрессия. Бас становится очень ровным, почти без динамических колебаний.',
    points: 20
  },
  {
    id: 'b7',
    type: 'identify',
    difficulty: 'beginner',
    category: 'ear_training',
    question: 'Is this a compressor or a limiter?',
    questionRu: 'Здесь компрессор или лимитер?',
    audioSource: 'drums',
    hiddenSettings: { threshold: -6, ratio: 20, attack: 0.001, release: 0.05 },
    paramToIdentify: 'type',
    options: ['Compressor (ratio < 10:1)', 'Limiter (ratio >= 10:1)'],
    optionsRu: ['Компрессор (ratio < 10:1)', 'Лимитер (ratio >= 10:1)'],
    correctIndex: 1,
    explanation: 'При ratio 20:1 и очень низком пороге сигнал фактически "упирается в стену". Это лимитирование — пики срезаются жёстко.',
    points: 20
  },

  // ─── INTERMEDIATE (7 questions) ───────────────────────────────
  {
    id: 'i1',
    type: 'theory',
    difficulty: 'intermediate',
    category: 'theory',
    question: 'What is parallel compression?',
    questionRu: 'Что такое параллельная компрессия?',
    options: [
      'Mixing a heavily compressed signal with the dry (uncompressed) signal',
      'Using two compressors in series',
      'Compressing the left and right channels separately',
      'Applying compression only to the mid channel'
    ],
    optionsRu: [
      'Смешивание сильно сжатого сигнала с сухим (необработанным)',
      'Использование двух компрессоров последовательно',
      'Компрессия левого и правого каналов по отдельности',
      'Компрессия только среднего канала'
    ],
    correctIndex: 0,
    explanation: 'Параллельная (New York) компрессия сохраняет динамику оригинала, но добавляет "тело" и плотность от сильно сжатой копии.',
    points: 10
  },
  {
    id: 'i2',
    type: 'matching',
    difficulty: 'intermediate',
    category: 'practical',
    question: 'Match the compressor settings to the target sound.',
    questionRu: 'Подбери настройки компрессора под целевой звук.',
    audioSource: 'vocal',
    targetSettings: { threshold: -20, ratio: 4, attack: 0.01, release: 0.15 },
    startSettings: { threshold: -10, ratio: 2, attack: 0.05, release: 0.3 },
    tolerance: { threshold: 5, ratio: 1, attack: 0.015, release: 0.06 },
    points: 30
  },
  {
    id: 'i3',
    type: 'matching',
    difficulty: 'intermediate',
    category: 'practical',
    question: 'Match the attack and release to get the right groove on drums.',
    questionRu: 'Подбери attack и release, чтобы получить правильный грув на ударных.',
    audioSource: 'drums',
    targetSettings: { threshold: -18, ratio: 4, attack: 0.03, release: 0.08 },
    startSettings: { threshold: -18, ratio: 4, attack: 0.001, release: 0.3 },
    tolerance: { threshold: 5, ratio: 1, attack: 0.02, release: 0.04 },
    points: 30
  },
  {
    id: 'i4',
    type: 'detection',
    difficulty: 'intermediate',
    category: 'ear_training',
    question: 'Which variant uses soft knee?',
    questionRu: 'Где используется мягкое колено (soft knee)?',
    audioSource: 'vocal',
    settingsA: { threshold: -20, ratio: 4, attack: 0.01, release: 0.1, knee: 0 },
    settingsB: { threshold: -20, ratio: 4, attack: 0.01, release: 0.1, knee: 30 },
    correctAnswer: 'B',
    explanation: 'Мягкое колено (knee=30) создаёт плавный переход в компрессию, звук кажется более естественным. Жёсткое колено (knee=0) — резкое включение компрессии.',
    points: 15
  },
  {
    id: 'i5',
    type: 'identify',
    difficulty: 'intermediate',
    category: 'ear_training',
    question: 'What is the approximate attack time?',
    questionRu: 'Какое приблизительное время атаки?',
    audioSource: 'drums',
    hiddenSettings: { threshold: -15, ratio: 6, attack: 0.05, release: 0.15 },
    paramToIdentify: 'attack',
    options: ['1 ms (very fast)', '10 ms (fast)', '50 ms (medium)', '200 ms (slow)'],
    optionsRu: ['1 мс (очень быстрая)', '10 мс (быстрая)', '50 мс (средняя)', '200 мс (медленная)'],
    correctIndex: 2,
    explanation: 'При атаке 50 мс часть транзиента проходит до срабатывания компрессора — слышен удар, но "хвост" становится ровнее.',
    points: 20
  },
  {
    id: 'i6',
    type: 'identify',
    difficulty: 'intermediate',
    category: 'ear_training',
    question: 'Is the release fast or slow?',
    questionRu: 'Release быстрый или медленный?',
    audioSource: 'bass',
    hiddenSettings: { threshold: -18, ratio: 4, attack: 0.01, release: 0.5 },
    paramToIdentify: 'release',
    options: ['Fast (< 100 ms)', 'Slow (> 300 ms)'],
    optionsRu: ['Быстрый (< 100 мс)', 'Медленный (> 300 мс)'],
    correctIndex: 1,
    explanation: 'При медленном release (500 мс) компрессор долго "отпускает" сигнал, создавая ощущение плавности и связности.',
    points: 20
  },
  {
    id: 'i7',
    type: 'theory',
    difficulty: 'intermediate',
    category: 'theory',
    question: 'How does dynamic EQ differ from static EQ + compressor?',
    questionRu: 'Чем динамическая EQ отличается от статической EQ + компрессора?',
    options: [
      'Dynamic EQ only affects specific frequencies when they exceed a threshold',
      'Dynamic EQ works on all frequencies simultaneously',
      'There is no difference',
      'Dynamic EQ only boosts frequencies'
    ],
    optionsRu: [
      'Динамическая EQ воздействует на конкретные частоты только когда они превышают порог',
      'Динамическая EQ работает со всеми частотами одновременно',
      'Разницы нет',
      'Динамическая EQ только усиливает частоты'
    ],
    correctIndex: 0,
    explanation: 'Динамическая EQ — это "умная" EQ: она вырезает или усиливает частоту только тогда, когда та становится проблемной (превышает порог).',
    points: 10
  },

  // ─── ADVANCED (6 questions) ───────────────────────────────────
  {
    id: 'a1',
    type: 'multiband',
    difficulty: 'advanced',
    category: 'practical',
    question: 'Set up the 3-band multiband compressor to match the target.',
    questionRu: 'Настрой мультибенд компрессор (3 полосы) под целевой звук.',
    audioSource: 'mix',
    targetBands: {
      low:  { threshold: -24, ratio: 3 },
      mid:  { threshold: -18, ratio: 2 },
      high: { threshold: -20, ratio: 4 }
    },
    startBands: {
      low:  { threshold: -10, ratio: 2 },
      mid:  { threshold: -10, ratio: 2 },
      high: { threshold: -10, ratio: 2 }
    },
    tolerance: { threshold: 6, ratio: 1.5 },
    points: 35
  },
  {
    id: 'a2',
    type: 'multiband',
    difficulty: 'advanced',
    category: 'practical',
    question: 'De-ess the vocal: compress only the 3-8 kHz range.',
    questionRu: 'Де-эссинг: компрессируй только диапазон 3-8 кГц на вокале.',
    audioSource: 'vocal',
    targetBands: {
      low:  { threshold: 0, ratio: 1 },
      mid:  { threshold: 0, ratio: 1 },
      high: { threshold: -15, ratio: 6 }
    },
    startBands: {
      low:  { threshold: -10, ratio: 2 },
      mid:  { threshold: -10, ratio: 2 },
      high: { threshold: -10, ratio: 2 }
    },
    tolerance: { threshold: 5, ratio: 2 },
    points: 35
  },
  {
    id: 'a3',
    type: 'matching',
    difficulty: 'advanced',
    category: 'practical',
    question: 'Match all compressor parameters on this full mix (subtle differences).',
    questionRu: 'Подбери все параметры компрессора на миксе (тонкие различия).',
    audioSource: 'mix',
    targetSettings: { threshold: -14, ratio: 3, attack: 0.02, release: 0.12 },
    startSettings: { threshold: -8, ratio: 2, attack: 0.05, release: 0.25 },
    tolerance: { threshold: 3, ratio: 0.8, attack: 0.01, release: 0.04 },
    points: 30
  },
  {
    id: 'a4',
    type: 'sidechain',
    difficulty: 'advanced',
    category: 'practical',
    question: 'Set up kick ducking for the bass.',
    questionRu: 'Настрой сайдчейн: бочка должна "продавливать" бас.',
    targetSettings: { depth: 12, attack: 0.01, release: 0.15 },
    startSettings: { depth: 0, attack: 0.05, release: 0.3 },
    tolerance: { depth: 4, attack: 0.02, release: 0.06 },
    points: 30
  },
  {
    id: 'a5',
    type: 'theory',
    difficulty: 'advanced',
    category: 'theory',
    question: 'When is multiband compression better than single-band?',
    questionRu: 'Когда мультибенд-компрессия лучше однополосной?',
    options: [
      'When different frequency ranges need different compression amounts',
      'Always, multiband is strictly better',
      'When you need to add reverb',
      'When working with mono signals only'
    ],
    optionsRu: [
      'Когда разные частотные диапазоны требуют разной степени компрессии',
      'Всегда, мультибенд строго лучше',
      'Когда нужно добавить реверберацию',
      'Только при работе с моно-сигналами'
    ],
    correctIndex: 0,
    explanation: 'Мультибенд незаменим, когда, например, бас нужно сжать сильно, а верха оставить динамичными. Однополосный компрессор не может этого.',
    points: 10
  },
  {
    id: 'a6',
    type: 'identify',
    difficulty: 'advanced',
    category: 'ear_training',
    question: 'Is sidechain compression applied to this track?',
    questionRu: 'Применена ли сайдчейн-компрессия к этому треку?',
    audioSource: 'sidechain_demo',
    hiddenSidechain: true,
    options: ['No sidechain', 'Yes, sidechain is active'],
    optionsRu: ['Нет сайдчейна', 'Да, сайдчейн активен'],
    correctIndex: 1,
    explanation: 'Слышен характерный "пампинг" — бас проседает в момент удара бочки, создавая ритмичное "дыхание" микса.',
    points: 20
  }
];
