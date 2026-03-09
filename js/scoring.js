// Scoring System
var Scoring = (function() {
  var answers = [];
  var startTime = 0;

  function reset() {
    answers = [];
    startTime = Date.now();
  }

  function recordAnswer(questionId, correct, points, category, difficulty, timeSpent) {
    var multiplier = SCORING_RULES.difficultyMultipliers[difficulty] || 1;
    var score = correct ? Math.round(points * multiplier) : 0;

    if (correct && SCORING_RULES.timeBonus.enabled && timeSpent !== undefined) {
      var timeLimit = 60;
      var bonusFactor = Math.max(0, 1 - timeSpent / timeLimit);
      score += Math.round(points * multiplier * SCORING_RULES.timeBonus.maxBonusPercent / 100 * bonusFactor);
    }

    answers.push({
      questionId: questionId,
      correct: correct,
      score: score,
      maxScore: Math.round(points * multiplier * (1 + SCORING_RULES.timeBonus.maxBonusPercent / 100)),
      category: category,
      difficulty: difficulty,
      timeSpent: timeSpent
    });

    return score;
  }

  function recordAccuracyAnswer(questionId, accuracy, points, category, difficulty) {
    var multiplier = SCORING_RULES.difficultyMultipliers[difficulty] || 1;
    var rules = SCORING_RULES.interactiveAccuracy;
    var percent = 0;

    if (accuracy <= rules.perfect.maxDeviation) percent = rules.perfect.pointsPercent;
    else if (accuracy <= rules.good.maxDeviation) percent = rules.good.pointsPercent;
    else if (accuracy <= rules.partial.maxDeviation) percent = rules.partial.pointsPercent;
    else percent = rules.miss.pointsPercent;

    var score = Math.round(points * multiplier * percent / 100);
    var correct = accuracy <= rules.good.maxDeviation;

    answers.push({
      questionId: questionId,
      correct: correct,
      score: score,
      maxScore: Math.round(points * multiplier),
      category: category,
      difficulty: difficulty,
      accuracy: accuracy
    });

    return score;
  }

  function getTotalScore() {
    return answers.reduce(function(sum, a) { return sum + a.score; }, 0);
  }

  function getMaxScore() {
    return answers.reduce(function(sum, a) { return sum + a.maxScore; }, 0);
  }

  function getPercentScore() {
    var max = getMaxScore();
    return max > 0 ? Math.round(getTotalScore() / max * 100) : 0;
  }

  function getLevel() {
    var percent = getPercentScore();
    var level = SCORING_RULES.levels[0];
    for (var i = SCORING_RULES.levels.length - 1; i >= 0; i--) {
      if (percent >= SCORING_RULES.levels[i].minPercent) {
        level = SCORING_RULES.levels[i];
        break;
      }
    }
    return level;
  }

  function getCategoryBreakdown() {
    var cats = {};
    Object.keys(SCORING_RULES.categories).forEach(function(key) {
      cats[key] = { score: 0, max: 0, correct: 0, total: 0 };
    });

    answers.forEach(function(a) {
      if (cats[a.category]) {
        cats[a.category].score += a.score;
        cats[a.category].max += a.maxScore;
        cats[a.category].total++;
        if (a.correct) cats[a.category].correct++;
      }
    });

    return cats;
  }

  function getCorrectCount() {
    return answers.filter(function(a) { return a.correct; }).length;
  }

  function getTotalTime() {
    return Math.round((Date.now() - startTime) / 1000);
  }

  function getShareText() {
    var level = getLevel();
    var percent = getPercentScore();
    var breakdown = getCategoryBreakdown();
    var cats = SCORING_RULES.categories;

    var text = 'Mixing Dynamics Test\n';
    text += level.label + ' (' + percent + '%)\n';

    Object.keys(cats).forEach(function(key) {
      var b = breakdown[key];
      var catPercent = b.max > 0 ? Math.round(b.score / b.max * 100) : 0;
      text += cats[key].icon + ' ' + cats[key].label + ': ' + catPercent + '% ';
    });

    return text.trim();
  }

  function saveProgress(currentIndex) {
    try {
      localStorage.setItem('mdt-progress', JSON.stringify({
        currentIndex: currentIndex,
        answers: answers,
        startTime: startTime
      }));
    } catch(e) {}
  }

  function loadProgress() {
    try {
      var data = JSON.parse(localStorage.getItem('mdt-progress'));
      if (data && data.answers) {
        answers = data.answers;
        startTime = data.startTime || Date.now();
        return data.currentIndex || 0;
      }
    } catch(e) {}
    return -1;
  }

  function clearProgress() {
    try { localStorage.removeItem('mdt-progress'); } catch(e) {}
  }

  return {
    reset: reset,
    recordAnswer: recordAnswer,
    recordAccuracyAnswer: recordAccuracyAnswer,
    getTotalScore: getTotalScore,
    getMaxScore: getMaxScore,
    getPercentScore: getPercentScore,
    getLevel: getLevel,
    getCategoryBreakdown: getCategoryBreakdown,
    getCorrectCount: getCorrectCount,
    getTotalTime: getTotalTime,
    getShareText: getShareText,
    saveProgress: saveProgress,
    loadProgress: loadProgress,
    clearProgress: clearProgress,
    getAnswers: function() { return answers; }
  };
})();
