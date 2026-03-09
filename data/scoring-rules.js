const SCORING_RULES = {
  difficultyMultipliers: {
    beginner: 1.0,
    intermediate: 1.5,
    advanced: 2.0
  },

  timeBonus: {
    enabled: true,
    maxBonusPercent: 30
  },

  interactiveAccuracy: {
    perfect:  { maxDeviation: 0.2, pointsPercent: 100 },
    good:     { maxDeviation: 0.5, pointsPercent: 70 },
    partial:  { maxDeviation: 0.8, pointsPercent: 40 },
    miss:     { pointsPercent: 10 }
  },

  levels: [
    { id: 'newbie',       label: 'Новичок',       minPercent: 0,  color: '#4a4845' },
    { id: 'beginner',     label: 'Начинающий',    minPercent: 20, color: '#5a9a5e' },
    { id: 'intermediate', label: 'Уверенный',     minPercent: 45, color: '#c9a96e' },
    { id: 'advanced',     label: 'Продвинутый',   minPercent: 70, color: '#b85450' },
    { id: 'pro',          label: 'Микс-инженер',  minPercent: 90, color: '#c9a96e' }
  ],

  categories: {
    theory:       { label: 'Теория',           icon: 'T' },
    ear_training: { label: 'Слух',             icon: 'S' },
    practical:    { label: 'Практика',         icon: 'P' },
    diagnostic:   { label: 'Диагностика',      icon: 'D' }
  }
};
