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
    { id: 'newbie',       labelRu: 'Newbie',        minPercent: 0,  color: '#555570' },
    { id: 'beginner',     labelRu: 'Beginner',      minPercent: 20, color: '#3498db' },
    { id: 'intermediate', labelRu: 'Intermediate',  minPercent: 45, color: '#f39c12' },
    { id: 'advanced',     labelRu: 'Advanced',      minPercent: 70, color: '#e74c3c' },
    { id: 'pro',          labelRu: 'Pro',           minPercent: 90, color: '#6c5ce7' }
  ],

  categories: {
    theory:       { labelRu: 'Theory',    icon: 'T' },
    ear_training: { labelRu: 'Ear',       icon: 'E' },
    practical:    { labelRu: 'Practical',  icon: 'P' }
  }
};
