// All questions for the dynamics test
const QUESTIONS = [
  // ─── BEGINNER: Theory ───────────────────────────────────
  {
    id: 'b1', type: 'theory', difficulty: 'beginner', category: 'theory',
    question: 'Что делает компрессор с аудиосигналом?',
    options: [
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
    id: 'b2', type: 'theory', difficulty: 'beginner', category: 'theory',
    question: 'Что происходит при снижении порога (threshold) компрессора?',
    options: [
      'Больше сигнала подвергается компрессии',
      'Меньше сигнала подвергается компрессии',
      'Меняется время атаки',
      'Увеличивается громкость на выходе'
    ],
    correctIndex: 0,
    explanation: 'Чем ниже порог, тем больше сигнала превышает его, и тем больше компрессии применяется.',
    points: 10
  },
  // ─── BEGINNER: Ear Training ─────────────────────────────
  {
    id: 'b4', type: 'detection', difficulty: 'beginner', category: 'ear_training',
    question: 'Какой вариант имеет БОЛЬШЕ компрессии?',
    audioSource: 'drums',
    settingsA: { threshold: -10, ratio: 2, attack: 0.02, release: 0.1 },
    settingsB: { threshold: -30, ratio: 8, attack: 0.003, release: 0.05 },
    correctAnswer: 'B',
    explanation: 'Вариант B имеет более низкий порог (-30 дБ) и более высокий ratio (8:1), что даёт значительно больше компрессии.',
    points: 15
  },
  {
    id: 'b7', type: 'identify', difficulty: 'beginner', category: 'ear_training',
    question: 'Здесь компрессор или лимитер?',
    audioSource: 'vocal',
    hiddenSettings: { threshold: -6, ratio: 20, attack: 0.001, release: 0.05 },
    paramToIdentify: 'type',
    options: ['Компрессор (ratio < 10:1)', 'Лимитер (ratio ≥ 10:1)'],
    correctIndex: 1,
    explanation: 'При ratio 20:1 и быстрой атаке сигнал фактически «упирается в стену». Это лимитирование — пики срезаются жёстко.',
    points: 20
  },

  // ─── INTERMEDIATE: Theory ───────────────────────────────
  {
    id: 'i1', type: 'theory', difficulty: 'intermediate', category: 'theory',
    question: 'Что такое параллельная компрессия?',
    options: [
      'Смешивание сильно сжатого сигнала с сухим (необработанным)',
      'Использование двух компрессоров последовательно',
      'Компрессия левого и правого каналов по отдельности',
      'Компрессия только среднего канала'
    ],
    correctIndex: 0,
    explanation: 'Параллельная (New York) компрессия сохраняет динамику оригинала, но добавляет «тело» и плотность от сильно сжатой копии. Andrew Scheps — один из главных популяризаторов этой техники.',
    points: 10
  },
  {
    id: 'i2', type: 'theory', difficulty: 'intermediate', category: 'theory',
    question: 'Как динамическая EQ отличается от статической EQ + компрессора?',
    options: [
      'Динамическая EQ воздействует на конкретные частоты только когда они превышают порог',
      'Динамическая EQ работает со всеми частотами одновременно',
      'Разницы нет',
      'Динамическая EQ только усиливает частоты'
    ],
    correctIndex: 0,
    explanation: 'Динамическая EQ — это «умная» EQ: она вырезает или усиливает частоту только тогда, когда та становится проблемной. Это тема 11-й недели курса SAE AUD214.',
    points: 10
  },

  // ─── INTERMEDIATE: Matching ─────────────────────────────
  {
    id: 'i5', type: 'matching', difficulty: 'intermediate', category: 'practical',
    question: 'Подбери настройки компрессора под целевой звук.',
    audioSource: 'vocal',
    targetSettings: { threshold: -20, ratio: 4, attack: 0.01, release: 0.15 },
    startSettings: { threshold: -10, ratio: 2, attack: 0.05, release: 0.3 },
    tolerance: { threshold: 5, ratio: 1, attack: 0.015, release: 0.06 },
    points: 30
  },
  {
    id: 'i6', type: 'matching', difficulty: 'intermediate', category: 'practical',
    question: 'Подбери attack и release, чтобы получить правильный грув на ударных.',
    audioSource: 'drums',
    targetSettings: { threshold: -18, ratio: 4, attack: 0.03, release: 0.08 },
    startSettings: { threshold: -18, ratio: 4, attack: 0.001, release: 0.3 },
    tolerance: { threshold: 5, ratio: 1, attack: 0.02, release: 0.04 },
    notchMode: true,
    notchConfig: {
      attack: [0.001, 0.005, 0.012, 0.02, 0.03, 0.045, 0.06, 0.07, 0.1, 0.15],
      release: [0.01, 0.04, 0.08, 0.12, 0.18, 0.25, 0.5, 0.8],
      ratio: [4, 8, 12, 20]
    },
    points: 30
  },

  // ─── INTERMEDIATE: Detection ────────────────────────────
  {
    id: 'i7', type: 'detection', difficulty: 'intermediate', category: 'ear_training',
    question: 'Где используется мягкое колено (soft knee)?',
    audioSource: 'vocal',
    settingsA: { threshold: -20, ratio: 4, attack: 0.01, release: 0.1, knee: 0 },
    settingsB: { threshold: -20, ratio: 4, attack: 0.01, release: 0.1, knee: 30 },
    correctAnswer: 'B',
    explanation: 'Мягкое колено (knee=30) создаёт плавный переход в компрессию, звук кажется более естественным. Жёсткое колено (knee=0) — резкое включение компрессии.',
    points: 15
  },
  {
    id: 'i8', type: 'identify', difficulty: 'intermediate', category: 'ear_training',
    question: 'Какое приблизительное время атаки?',
    audioSource: 'drums',
    hiddenSettings: { threshold: -15, ratio: 6, attack: 0.05, release: 0.15 },
    paramToIdentify: 'attack',
    options: ['1 мс (очень быстрая)', '10 мс (быстрая)', '50 мс (средняя)', '200 мс (медленная)'],
    correctIndex: 2,
    explanation: 'При атаке 50 мс часть транзиента проходит до срабатывания компрессора — слышен удар, но «хвост» становится ровнее.',
    points: 20
  },

  {
    id: 'i10', type: 'fix_mix', difficulty: 'intermediate', category: 'diagnostic',
    question: 'Барабаны звучат безжизненно и плоско. Какая техника вернёт им энергию?',
    scenario: 'Запись барабанов чистая, но после компрессии они потеряли удар и стали звучать скучно. Транзиенты срезаны.',
    options: [
      'Добавить ещё один компрессор последовательно',
      'Параллельная компрессия с агрессивными настройками',
      'Убрать компрессию полностью',
      'Добавить длинный реверб'
    ],
    correctIndex: 1,
    explanation: 'Параллельная компрессия — техника Andrew Scheps и CLA. Сухой сигнал сохраняет транзиенты, а подмешанный crush-компрессор добавляет тело и энергию.',
    points: 20
  },

  // ─── ADVANCED: Multiband ────────────────────────────────
  {
    id: 'a4', type: 'multiband', difficulty: 'advanced', category: 'practical',
    question: 'Настрой мультибенд-компрессор (3 полосы) под целевой звук.',
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
    id: 'a5', type: 'multiband', difficulty: 'advanced', category: 'practical',
    question: 'Де-эссинг: компрессируй только верхний диапазон (3-8 кГц) на вокале.',
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

  // ─── ADVANCED: Matching ─────────────────────────────────
  {
    id: 'a6', type: 'matching', difficulty: 'advanced', category: 'practical',
    question: 'Подбери все параметры компрессора на полном миксе (тонкие различия).',
    audioSource: 'mix',
    targetSettings: { threshold: -14, ratio: 3, attack: 0.02, release: 0.12 },
    startSettings: { threshold: -8, ratio: 2, attack: 0.05, release: 0.25 },
    tolerance: { threshold: 3, ratio: 0.8, attack: 0.01, release: 0.04 },
    points: 30
  },

  // ─── ADVANCED: Sidechain ────────────────────────────────
  {
    id: 'a7', type: 'sidechain', difficulty: 'advanced', category: 'practical',
    question: 'Настрой сайдчейн: бочка должна «продавливать» бас.',
    targetSettings: { depth: 12, attack: 0.01, release: 0.15 },
    startSettings: { depth: 0, attack: 0.05, release: 0.3 },
    tolerance: { depth: 4, attack: 0.02, release: 0.06 },
    points: 30
  },

  // ─── ADVANCED: Fix Mix ──────────────────────────────────
  {
    id: 'a8', type: 'fix_mix', difficulty: 'advanced', category: 'diagnostic',
    question: 'Микс не «склеивается» — инструменты звучат как отдельные элементы. Что делать?',
    scenario: 'Каждый инструмент записан и обработан отлично, но вместе они звучат как набор треков, а не как единый микс. Нет ощущения «целостности».',
    options: [
      'Bus-компрессия на мастер-шине (SSL-стиль, 2-4 дБ GR)',
      'Поднять громкость каждого инструмента',
      'Добавить больше реверба на каждый канал',
      'Применить лимитер к каждому каналу отдельно'
    ],
    correctIndex: 0,
    explanation: 'Glue compression на мастер-шине — классический приём. SSL G-Bus compressor при 2-4 дБ gain reduction «склеивает» элементы в единое целое, создавая ощущение одной записи.',
    points: 20
  },

  // ─── ADVANCED: Identify ─────────────────────────────────
  {
    id: 'a9', type: 'identify', difficulty: 'advanced', category: 'ear_training',
    question: 'Применена ли сайдчейн-компрессия к этому треку?',
    audioSource: 'sidechain_demo',
    hiddenSidechain: true,
    options: ['Нет сайдчейна', 'Да, сайдчейн активен'],
    correctIndex: 1,
    explanation: 'Слышен характерный «пампинг» — бас проседает в момент удара бочки, создавая ритмичное «дыхание» микса.',
    points: 20
  }
];
