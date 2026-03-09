// Main App Controller
(function() {
  var currentIndex = 0;
  var questionStartTime = 0;
  var activeChains = {};
  var abState = 'user';
  var vizRAF = null;

  var DIFF_LABELS = { beginner: 'Начинающий', intermediate: 'Средний', advanced: 'Продвинутый' };
  var TYPE_LABELS = {
    theory: 'Теория', detection: 'A/B', matching: 'Настройка',
    identify: 'Определи', multiband: 'Мультибенд', sidechain: 'Сайдчейн',
    fix_mix: 'Диагностика'
  };

  function qText(q, field) {
    return q[field + 'Ru'] || q[field];
  }
  function qOptions(q) {
    return q.optionsRu || q.options;
  }

  function shuffleOptions(options, correctIndex) {
    var indices = options.map(function(_, i) { return i; });
    for (var i = indices.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = indices[i];
      indices[i] = indices[j];
      indices[j] = temp;
    }
    var shuffled = indices.map(function(i) { return options[i]; });
    var newCorrectIndex = indices.indexOf(correctIndex);
    return { options: shuffled, correctIndex: newCorrectIndex };
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    var screen = document.getElementById('screen-' + id);
    if (screen) screen.classList.add('active');
  }

  function updateProgress() {
    var counter = document.getElementById('question-counter');
    var fill = document.getElementById('progress-fill');
    var diffBadge = document.getElementById('question-difficulty');
    var typeBadge = document.getElementById('question-type');
    var q = QUESTIONS[currentIndex];

    if (counter) counter.textContent = (currentIndex + 1) + ' / ' + QUESTIONS.length;
    if (fill) fill.style.width = ((currentIndex + 1) / QUESTIONS.length * 100) + '%';
    if (diffBadge && q) {
      diffBadge.textContent = DIFF_LABELS[q.difficulty] || q.difficulty;
      diffBadge.className = 'diff-badge ' + q.difficulty;
    }
    if (typeBadge && q) {
      typeBadge.textContent = TYPE_LABELS[q.type] || q.type;
    }
  }

  function setLoadingStatus(text, percent) {
    var loadText = document.querySelector('.loading-text');
    var progress = document.getElementById('loading-progress');
    if (loadText) loadText.textContent = text;
    if (progress) progress.style.width = percent + '%';
  }

  function startTest(fromIndex) {
    if (fromIndex === undefined || fromIndex < 0) {
      Scoring.reset();
      currentIndex = 0;
    } else {
      currentIndex = fromIndex;
    }

    showScreen('loading');

    if (typeof Tone === 'undefined') {
      setLoadingStatus('Ошибка: Tone.js не загружен (проверь интернет)', 0);
      return;
    }

    setLoadingStatus('Инициализация аудио...', 10);

    AudioEngine.init().then(function() {
      setLoadingStatus('Загрузка аудио...', 20);
      return AudioEngine.preloadAll(function(name, pct) {
        setLoadingStatus('Загрузка: ' + name + '...', 20 + pct * 0.7);
      });
    }).then(function() {
      setLoadingStatus('Готово!', 100);
      Mascot.init();
      Mascot.show();
      Mascot.trigger('test_start', { duration: 5000 });
      setTimeout(function() {
        showScreen('question');
        renderQuestion();
      }, 500);
    }).catch(function(err) {
      console.error('Audio init error:', err);
      setLoadingStatus('Ошибка: ' + (err.message || err), 0);
      var loadText = document.querySelector('.loading-text');
      if (loadText) loadText.style.color = '#ff6b9d';
    });
  }

  function renderQuestion() {
    stopAllAudio();
    var q = QUESTIONS[currentIndex];
    if (!q) { showResults(); return; }

    updateProgress();
    questionStartTime = Date.now();

    var container = document.getElementById('question-container');
    container.innerHTML = '';

    var hasAudio = ['detection', 'matching', 'identify', 'multiband', 'sidechain'].indexOf(q.type) !== -1;
    var stopBtn = document.getElementById('global-stop-btn');
    if (stopBtn) stopBtn.hidden = !hasAudio;

    switch (q.type) {
      case 'theory': renderTheory(container, q); break;
      case 'detection': renderDetection(container, q); break;
      case 'matching': renderMatching(container, q); break;
      case 'identify': renderIdentify(container, q); break;
      case 'multiband': renderMultiband(container, q); break;
      case 'sidechain': renderSidechain(container, q); break;
      case 'fix_mix': renderFixMix(container, q); break;
    }

    var mascotEvent = {
      theory: 'question_theory',
      detection: 'question_audio',
      matching: 'question_interactive',
      identify: 'question_audio',
      multiband: 'question_multiband',
      sidechain: 'question_sidechain',
      fix_mix: 'question_diagnostic'
    }[q.type] || 'question_theory';

    setTimeout(function() {
      Mascot.resetPosition();
      Mascot.trigger(mascotEvent);
    }, 300);

    if (currentIndex === Math.floor(QUESTIONS.length / 2)) {
      setTimeout(function() { Mascot.trigger('halfway'); }, 1000);
    }
    if (currentIndex === QUESTIONS.length - 2) {
      setTimeout(function() { Mascot.trigger('almost_done'); }, 1000);
    }
  }

  function nextQuestion() {
    currentIndex++;
    Scoring.saveProgress(currentIndex);
    if (currentIndex >= QUESTIONS.length) {
      showResults();
    } else {
      renderQuestion();
    }
  }

  function stopAllAudio() {
    AudioEngine.stop();
    activeChains = {};
    abState = 'user';
    if (vizRAF) { cancelAnimationFrame(vizRAF); vizRAF = null; }
  }

  // ─── Theory ───
  function renderTheory(container, q) {
    var shuffled = shuffleOptions(qOptions(q), q.correctIndex);
    var html = '<p class="question-text">' + qText(q, 'question') + '</p>';
    html += '<div class="options-list">';
    shuffled.options.forEach(function(opt, i) {
      html += '<div class="option-item" data-index="' + i + '">' + opt + '</div>';
    });
    html += '</div>';
    html += '<div class="explanation" hidden></div>';
    html += '<div class="question-actions"><button class="btn btn-primary btn-small" id="next-btn" hidden>Далее</button></div>';

    container.innerHTML = html;

    var answered = false;
    container.querySelectorAll('.option-item').forEach(function(item) {
      item.addEventListener('click', function() {
        if (answered) return;
        answered = true;

        var idx = parseInt(item.dataset.index);
        var correct = idx === shuffled.correctIndex;
        var timeSpent = (Date.now() - questionStartTime) / 1000;

        item.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) {
          container.querySelectorAll('.option-item')[shuffled.correctIndex].classList.add('correct');
        }
        container.querySelectorAll('.option-item').forEach(function(o) { o.classList.add('disabled'); });

        Scoring.recordAnswer(q.id, correct, q.points, q.category, q.difficulty, timeSpent);
        Mascot.trigger(correct ? 'correct_answer' : 'wrong_answer');

        var explEl = container.querySelector('.explanation');
        if (explEl && q.explanation) { explEl.textContent = q.explanation; explEl.hidden = false; }
        document.getElementById('next-btn').hidden = false;
      });
    });

    document.getElementById('next-btn').addEventListener('click', nextQuestion);
  }

  // ─── Detection (A/B) ───
  function renderDetection(container, q) {
    var html = '<p class="question-text">' + qText(q, 'question') + '</p>';
    html += '<div class="audio-controls">' +
      '<button class="btn-play" id="play-a">&#9654; A</button>' +
      '<button class="btn-play" id="play-b">&#9654; B</button>' +
      '</div>';
    html += '<div class="waveform-row">' +
      '<div class="waveform-container"><div class="waveform-label">A</div><canvas class="waveform-canvas" id="wave-a" width="280" height="80"></canvas></div>' +
      '<div class="waveform-container"><div class="waveform-label">B</div><canvas class="waveform-canvas" id="wave-b" width="280" height="80"></canvas></div>' +
      '</div>';
    html += '<div class="options-list">' +
      '<div class="option-item" data-answer="A">A</div>' +
      '<div class="option-item" data-answer="B">B</div>' +
      '</div>';
    html += '<div class="explanation" hidden></div>';
    html += '<div class="question-actions"><button class="btn btn-primary btn-small" id="next-btn" hidden>Далее</button></div>';

    container.innerHTML = html;

    var chainA = AudioEngine.createCompressorChain(q.settingsA);
    var chainB = AudioEngine.createCompressorChain(q.settingsB);
    chainA.makeup.gain.value = estimateMakeupGain(q.settingsA);
    chainB.makeup.gain.value = estimateMakeupGain(q.settingsB);

    var canvasA = document.getElementById('wave-a');
    var canvasB = document.getElementById('wave-b');
    var playingChain = null;

    function startViz() {
      if (vizRAF) cancelAnimationFrame(vizRAF);
      function loop() {
        applyRealtimeGainComp(chainA);
        applyRealtimeGainComp(chainB);
        if (playingChain === 'A') {
          CompressorUI.drawWaveform(canvasA, AudioEngine.getAnalyserData(chainA.analyser), '#00e5ff');
        } else if (playingChain === 'B') {
          CompressorUI.drawWaveform(canvasB, AudioEngine.getAnalyserData(chainB.analyser), '#00e5ff');
        }
        vizRAF = requestAnimationFrame(loop);
      }
      loop();
    }

    document.getElementById('play-a').addEventListener('click', function() {
      AudioEngine.stop();
      AudioEngine.play(q.audioSource, chainA);
      playingChain = 'A';
      document.getElementById('play-a').classList.add('playing');
      document.getElementById('play-b').classList.remove('playing');
      startViz();
    });

    document.getElementById('play-b').addEventListener('click', function() {
      AudioEngine.stop();
      AudioEngine.play(q.audioSource, chainB);
      playingChain = 'B';
      document.getElementById('play-b').classList.add('playing');
      document.getElementById('play-a').classList.remove('playing');
      startViz();
    });

    var answered = false;
    container.querySelectorAll('.option-item').forEach(function(item) {
      item.addEventListener('click', function() {
        if (answered) return;
        answered = true;

        var chosen = item.dataset.answer;
        var correct = chosen === q.correctAnswer;
        var timeSpent = (Date.now() - questionStartTime) / 1000;

        item.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) {
          container.querySelector('[data-answer="' + q.correctAnswer + '"]').classList.add('correct');
        }
        container.querySelectorAll('.option-item').forEach(function(o) { o.classList.add('disabled'); });

        Scoring.recordAnswer(q.id, correct, q.points, q.category, q.difficulty, timeSpent);
        Mascot.trigger(correct ? 'correct_answer' : 'wrong_answer');

        var explEl = container.querySelector('.explanation');
        if (explEl && q.explanation) { explEl.textContent = q.explanation; explEl.hidden = false; }
        document.getElementById('next-btn').hidden = false;
      });
    });

    document.getElementById('next-btn').addEventListener('click', nextQuestion);
  }

  function estimateMakeupGain(settings) {
    var reduction = Math.max(0, -settings.threshold) * (1 - 1 / settings.ratio);
    return Math.pow(10, reduction * 0.3 / 20);
  }

  function applyRealtimeGainComp(chain) {
    if (!chain || !chain.compressor) return;
    var gr = Math.abs(chain.compressor.reduction);
    var comp = Math.pow(10, gr * 0.7 / 20);
    chain.makeup.gain.value = Math.min(comp, 4);
  }

  // ─── Matching ───
  function renderMatching(container, q) {
    var html = '<p class="question-text">' + qText(q, 'question') + '</p>';
    html += '<div class="audio-controls">' +
      '<button class="btn-play" id="play-btn">&#9654; Play</button>' +
      '<button class="btn-ab" id="ab-btn">A/B: Твой</button>' +
      '</div>';
    html += '<div class="waveform-container"><canvas class="waveform-canvas" id="wave-main" width="600" height="80"></canvas></div>';
    html += '<div class="gr-meter"><span class="gr-meter-label">GR</span><div class="gr-meter-bar"><div class="gr-meter-fill" id="gr-fill"></div></div><span class="gr-meter-value" id="gr-value">0 dB</span></div>';
    html += '<div id="knobs-area"></div>';
    html += '<div class="question-actions">' +
      '<button class="btn btn-primary btn-small" id="submit-btn">Проверить</button>' +
      '<button class="btn btn-primary btn-small" id="next-btn" hidden>Далее</button>' +
      '</div>';
    html += '<div class="explanation" hidden></div>';

    container.innerHTML = html;

    var userChain = AudioEngine.createCompressorChain(q.startSettings);
    var targetChain = AudioEngine.createCompressorChain(q.targetSettings);
    targetChain.makeup.gain.value = estimateMakeupGain(q.targetSettings);

    activeChains.user = userChain;
    activeChains.target = targetChain;

    var knobsArea = document.getElementById('knobs-area');
    var knobsOnChange = function(settings) {
      AudioEngine.updateCompressor(userChain, settings);
      var knobVals = q.notchMode ? CompressorUI.getNotchedValues(knobsArea) : CompressorUI.getKnobValues(knobsArea);
      userChain.makeup.gain.value = estimateMakeupGain(knobVals);
    };

    if (q.notchMode && q.notchConfig) {
      CompressorUI.renderNotchedKnobs(knobsArea, q.startSettings, q.notchConfig, knobsOnChange);
    } else {
      CompressorUI.renderKnobs(knobsArea, q.startSettings, knobsOnChange);
    }

    var canvas = document.getElementById('wave-main');
    var currentChain = userChain;

    function startViz() {
      if (vizRAF) cancelAnimationFrame(vizRAF);
      function loop() {
        var data = AudioEngine.getAnalyserData(currentChain.analyser);
        CompressorUI.drawWaveform(canvas, data, abState === 'user' ? '#00e5ff' : '#ff6b9d');
        var fill = document.getElementById('gr-fill');
        var grValue = document.getElementById('gr-value');
        var reduction = AudioEngine.getReduction(currentChain);
        var percent = Math.min(100, Math.abs(reduction) / 20 * 100);
        if (fill) fill.style.width = percent + '%';
        if (grValue) grValue.textContent = Math.round(reduction) + ' dB';
        vizRAF = requestAnimationFrame(loop);
      }
      loop();
    }

    document.getElementById('play-btn').addEventListener('click', function() {
      if (AudioEngine.isPlaying()) {
        AudioEngine.stop();
        this.classList.remove('playing');
        this.innerHTML = '&#9654; Play';
      } else {
        AudioEngine.play(q.audioSource, currentChain);
        this.classList.add('playing');
        this.innerHTML = '&#9724; Стоп';
        startViz();
      }
    });

    document.getElementById('ab-btn').addEventListener('click', function() {
      var wasPlaying = AudioEngine.isPlaying();
      if (wasPlaying) AudioEngine.stop();
      if (abState === 'user') {
        abState = 'target';
        currentChain = targetChain;
        this.textContent = 'A/B: Цель';
        this.classList.add('active-b');
      } else {
        abState = 'user';
        currentChain = userChain;
        this.textContent = 'A/B: Твой';
        this.classList.remove('active-b');
      }
      if (wasPlaying) {
        AudioEngine.play(q.audioSource, currentChain);
        startViz();
      }
    });

    document.getElementById('submit-btn').addEventListener('click', function() {
      var vals = q.notchMode ? CompressorUI.getNotchedValues(knobsArea) : CompressorUI.getKnobValues(knobsArea);
      var accuracy = calculateAccuracy(vals, q.targetSettings, q.tolerance);

      Scoring.recordAccuracyAnswer(q.id, accuracy, q.points, q.category, q.difficulty);

      var isGood = accuracy <= 0.5;
      Mascot.trigger(isGood ? 'correct_answer' : 'wrong_answer');

      var explEl = container.querySelector('.explanation');
      if (explEl) {
        var label = accuracy <= 0.2 ? 'Идеально!' : accuracy <= 0.5 ? 'Хорошо!' : accuracy <= 0.8 ? 'Близко' : 'Продолжай практиковаться';
        explEl.textContent = label + ' Цель: THR=' + q.targetSettings.threshold + 'дБ, RAT=' + q.targetSettings.ratio + ':1, ATK=' + Math.round(q.targetSettings.attack * 1000) + 'мс, REL=' + Math.round(q.targetSettings.release * 1000) + 'мс';
        explEl.hidden = false;
      }

      this.hidden = true;
      document.getElementById('next-btn').hidden = false;
    });

    document.getElementById('next-btn').addEventListener('click', nextQuestion);
  }

  function calculateAccuracy(userVals, target, tolerance) {
    var params = ['threshold', 'ratio', 'attack', 'release'];
    var totalDeviation = 0;
    var count = 0;

    params.forEach(function(p) {
      if (target[p] !== undefined && userVals[p] !== undefined && tolerance[p]) {
        var dev = Math.abs(userVals[p] - target[p]) / tolerance[p];
        totalDeviation += Math.min(dev, 2);
        count++;
      }
    });

    return count > 0 ? totalDeviation / count / 2 : 1;
  }

  // ─── Identify ───
  function renderIdentify(container, q) {
    var shuffled = shuffleOptions(qOptions(q), q.correctIndex);
    var html = '<p class="question-text">' + qText(q, 'question') + '</p>';
    html += '<div class="audio-controls">' +
      '<button class="btn-play" id="play-processed">&#9654; Обработанный</button>' +
      '<button class="btn-play" id="play-original">&#9654; Оригинал</button>' +
      '</div>';
    html += '<div class="waveform-container"><canvas class="waveform-canvas" id="wave-id" width="600" height="80"></canvas></div>';

    html += '<div class="options-list">';
    shuffled.options.forEach(function(opt, i) {
      html += '<div class="option-item" data-index="' + i + '">' + opt + '</div>';
    });
    html += '</div>';
    html += '<div class="explanation" hidden></div>';
    html += '<div class="question-actions"><button class="btn btn-primary btn-small" id="next-btn" hidden>Далее</button></div>';

    container.innerHTML = html;

    var processedChain = null;
    var bypassChain = null;
    var currentAnalyser = null;

    if (q.hiddenSettings) {
      processedChain = AudioEngine.createCompressorChain(q.hiddenSettings);
      processedChain.makeup.gain.value = estimateMakeupGain(q.hiddenSettings);
    }
    bypassChain = AudioEngine.createBypassChain();

    var canvas = document.getElementById('wave-id');

    function startViz(analyser) {
      currentAnalyser = analyser;
      if (vizRAF) cancelAnimationFrame(vizRAF);
      function loop() {
        CompressorUI.drawWaveform(canvas, AudioEngine.getAnalyserData(currentAnalyser));
        vizRAF = requestAnimationFrame(loop);
      }
      loop();
    }

    var audioSource = q.audioSource;
    if (audioSource === 'sidechain_demo') audioSource = 'mix';

    document.getElementById('play-processed').addEventListener('click', function() {
      AudioEngine.stop();
      if (q.audioSource === 'sidechain_demo' && q.hiddenSidechain) {
        var scChain = AudioEngine.createSidechainChain({ depth: 12, attack: 0.01, release: 0.15 });
        AudioEngine.playSidechain();
        startViz(scChain.analyser);
      } else if (processedChain) {
        AudioEngine.play(audioSource, processedChain);
        startViz(processedChain.analyser);
      }
      this.classList.add('playing');
      document.getElementById('play-original').classList.remove('playing');
    });

    document.getElementById('play-original').addEventListener('click', function() {
      AudioEngine.stop();
      if (q.audioSource === 'sidechain_demo') {
        AudioEngine.play('mix', bypassChain);
      } else {
        AudioEngine.play(audioSource, bypassChain);
      }
      startViz(bypassChain.analyser);
      this.classList.add('playing');
      document.getElementById('play-processed').classList.remove('playing');
    });

    var answered = false;
    container.querySelectorAll('.option-item').forEach(function(item) {
      item.addEventListener('click', function() {
        if (answered) return;
        answered = true;

        var idx = parseInt(item.dataset.index);
        var correct = idx === shuffled.correctIndex;
        var timeSpent = (Date.now() - questionStartTime) / 1000;

        item.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) {
          container.querySelectorAll('.option-item')[shuffled.correctIndex].classList.add('correct');
        }
        container.querySelectorAll('.option-item').forEach(function(o) { o.classList.add('disabled'); });

        Scoring.recordAnswer(q.id, correct, q.points, q.category, q.difficulty, timeSpent);
        Mascot.trigger(correct ? 'correct_answer' : 'wrong_answer');

        var explEl = container.querySelector('.explanation');
        if (explEl && q.explanation) { explEl.textContent = q.explanation; explEl.hidden = false; }
        document.getElementById('next-btn').hidden = false;
      });
    });

    document.getElementById('next-btn').addEventListener('click', nextQuestion);
  }

  // ─── Multiband ───
  function renderMultiband(container, q) {
    var html = '<p class="question-text">' + qText(q, 'question') + '</p>';
    html += '<div class="audio-controls">' +
      '<button class="btn-play" id="play-btn">&#9654; Play</button>' +
      '<button class="btn-ab" id="ab-btn">A/B: Твой</button>' +
      '</div>';
    html += '<div class="waveform-container"><canvas class="waveform-canvas" id="wave-mb" width="600" height="80"></canvas></div>';
    html += '<div id="bands-area"></div>';
    html += '<div class="question-actions">' +
      '<button class="btn btn-primary btn-small" id="submit-btn">Проверить</button>' +
      '<button class="btn btn-primary btn-small" id="next-btn" hidden>Далее</button>' +
      '</div>';
    html += '<div class="explanation" hidden></div>';

    container.innerHTML = html;

    var userMB = AudioEngine.createMultibandChain(q.startBands);
    var targetMB = AudioEngine.createMultibandChain(q.targetBands);

    var bandsArea = document.getElementById('bands-area');
    var bandLabels = {
      low: 'LOW (20–200 Гц)',
      mid: 'MID (200 Гц – 2 кГц)',
      high: 'HIGH (2 кГц – 20 кГц)'
    };

    ['low', 'mid', 'high'].forEach(function(name) {
      CompressorUI.renderBandSliders(bandsArea, name, bandLabels[name], q.startBands[name], function(band, param, val) {
        var settings = {};
        settings[band] = {};
        settings[band][param] = val;
        AudioEngine.updateMultibandSettings(userMB, settings);
      });
    });

    var canvas = document.getElementById('wave-mb');
    var currentMB = userMB;

    function startViz() {
      if (vizRAF) cancelAnimationFrame(vizRAF);
      function loop() {
        CompressorUI.drawWaveform(canvas, AudioEngine.getAnalyserData(currentMB.analyser), abState === 'user' ? '#00e5ff' : '#ff6b9d');
        var reductions = AudioEngine.getMultibandReduction(currentMB);
        ['low', 'mid', 'high'].forEach(function(name) {
          CompressorUI.updateGRByName(bandsArea, name, reductions[name]);
        });
        vizRAF = requestAnimationFrame(loop);
      }
      loop();
    }

    document.getElementById('play-btn').addEventListener('click', function() {
      if (AudioEngine.isPlaying()) {
        AudioEngine.stop();
        this.classList.remove('playing');
        this.innerHTML = '&#9654; Play';
      } else {
        AudioEngine.play(q.audioSource, currentMB);
        this.classList.add('playing');
        this.innerHTML = '&#9724; Стоп';
        startViz();
      }
    });

    document.getElementById('ab-btn').addEventListener('click', function() {
      var wasPlaying = AudioEngine.isPlaying();
      if (wasPlaying) AudioEngine.stop();
      if (abState === 'user') {
        abState = 'target';
        currentMB = targetMB;
        this.textContent = 'A/B: Цель';
        this.classList.add('active-b');
        bandsArea.classList.add('disabled-controls');
        bandsArea.querySelectorAll('input').forEach(function(inp) { inp.disabled = true; });
      } else {
        abState = 'user';
        currentMB = userMB;
        this.textContent = 'A/B: Твой';
        this.classList.remove('active-b');
        bandsArea.classList.remove('disabled-controls');
        bandsArea.querySelectorAll('input').forEach(function(inp) { inp.disabled = false; });
      }
      if (wasPlaying) {
        AudioEngine.play(q.audioSource, currentMB);
        startViz();
      }
    });

    document.getElementById('submit-btn').addEventListener('click', function() {
      var vals = CompressorUI.getBandValues(bandsArea);
      var totalDev = 0;
      var count = 0;

      ['low', 'mid', 'high'].forEach(function(name) {
        ['threshold', 'ratio'].forEach(function(param) {
          if (q.targetBands[name] && q.targetBands[name][param] !== undefined) {
            var userVal = vals[name][param] || 0;
            var targetVal = q.targetBands[name][param];
            var tol = q.tolerance[param] || 5;
            totalDev += Math.abs(userVal - targetVal) / tol;
            count++;
          }
        });
      });

      var accuracy = count > 0 ? Math.min(1, totalDev / count / 2) : 1;
      Scoring.recordAccuracyAnswer(q.id, accuracy, q.points, q.category, q.difficulty);

      var isGood = accuracy <= 0.5;
      Mascot.trigger(isGood ? 'correct_answer' : 'wrong_answer');

      var explEl = container.querySelector('.explanation');
      if (explEl) {
        var label = accuracy <= 0.2 ? 'Идеально!' : accuracy <= 0.5 ? 'Хорошо!' : 'Продолжай практиковаться';
        var targetStr = ['low', 'mid', 'high'].map(function(n) {
          return n.toUpperCase() + ': THR=' + q.targetBands[n].threshold + 'дБ, RAT=' + q.targetBands[n].ratio + ':1';
        }).join(' | ');
        explEl.textContent = label + ' Цель: ' + targetStr;
        explEl.hidden = false;
      }

      this.hidden = true;
      document.getElementById('next-btn').hidden = false;
    });

    document.getElementById('next-btn').addEventListener('click', nextQuestion);
  }

  // ─── Sidechain ───
  function renderSidechain(container, q) {
    var html = '<p class="question-text">' + qText(q, 'question') + '</p>';
    html += '<div class="audio-controls">' +
      '<button class="btn-play" id="play-btn">&#9654; Play</button>' +
      '<button class="btn-ab" id="ab-btn">A/B: Твой</button>' +
      '</div>';
    html += '<div class="sidechain-viz">' +
      '<div class="sidechain-track"><span class="sidechain-track-label">KICK</span><canvas class="sidechain-canvas" id="sc-kick" width="500" height="40"></canvas></div>' +
      '<div class="sidechain-track"><span class="sidechain-track-label">BASS</span><canvas class="sidechain-canvas" id="sc-bass" width="500" height="40"></canvas></div>' +
      '</div>';
    html += '<div id="sc-sliders" class="band-section"></div>';
    html += '<div class="question-actions">' +
      '<button class="btn btn-primary btn-small" id="submit-btn">Проверить</button>' +
      '<button class="btn btn-primary btn-small" id="next-btn" hidden>Далее</button>' +
      '</div>';
    html += '<div class="explanation" hidden></div>';

    container.innerHTML = html;

    var userSC = AudioEngine.createSidechainChain(q.startSettings);
    var slidersArea = document.getElementById('sc-sliders');

    CompressorUI.renderSidechainSliders(slidersArea, q.startSettings, function() {
      var all = CompressorUI.getSidechainValues(slidersArea);
      AudioEngine.updateSidechainSettings(all);
    });

    var kickCanvas = document.getElementById('sc-kick');
    var bassCanvas = document.getElementById('sc-bass');

    function startViz() {
      if (vizRAF) cancelAnimationFrame(vizRAF);
      function loop() {
        if (userSC.kickAnalyser) {
          CompressorUI.drawWaveform(kickCanvas, AudioEngine.getAnalyserData(userSC.kickAnalyser), '#ff6b9d');
        }
        if (userSC.analyser) {
          CompressorUI.drawWaveform(bassCanvas, AudioEngine.getAnalyserData(userSC.analyser), '#00e5ff');
        }
        vizRAF = requestAnimationFrame(loop);
      }
      loop();
    }

    document.getElementById('play-btn').addEventListener('click', function() {
      if (AudioEngine.isPlaying()) {
        AudioEngine.stop();
        this.classList.remove('playing');
        this.innerHTML = '&#9654; Play';
      } else {
        AudioEngine.playSidechain();
        this.classList.add('playing');
        this.innerHTML = '&#9724; Стоп';
        startViz();
      }
    });

    var scEnabled = true;
    document.getElementById('ab-btn').addEventListener('click', function() {
      if (scEnabled) {
        AudioEngine.updateSidechainSettings({ depth: 0, attack: 0.01, release: 0.15 });
        this.textContent = 'A/B: Без SC';
        this.classList.add('active-b');
        scEnabled = false;
      } else {
        var vals = CompressorUI.getSidechainValues(slidersArea);
        AudioEngine.updateSidechainSettings(vals);
        this.textContent = 'A/B: Твой';
        this.classList.remove('active-b');
        scEnabled = true;
      }
    });

    document.getElementById('submit-btn').addEventListener('click', function() {
      var vals = CompressorUI.getSidechainValues(slidersArea);
      var totalDev = 0;
      var count = 0;

      ['depth', 'attack', 'release'].forEach(function(p) {
        if (q.targetSettings[p] !== undefined && vals[p] !== undefined && q.tolerance[p]) {
          totalDev += Math.abs(vals[p] - q.targetSettings[p]) / q.tolerance[p];
          count++;
        }
      });

      var accuracy = count > 0 ? Math.min(1, totalDev / count / 2) : 1;
      Scoring.recordAccuracyAnswer(q.id, accuracy, q.points, q.category, q.difficulty);

      var isGood = accuracy <= 0.5;
      Mascot.trigger(isGood ? 'correct_answer' : 'wrong_answer');

      var explEl = container.querySelector('.explanation');
      if (explEl) {
        var label = accuracy <= 0.2 ? 'Идеально!' : accuracy <= 0.5 ? 'Хорошо!' : 'Продолжай практиковаться';
        explEl.textContent = label + ' Цель: Depth=' + q.targetSettings.depth + 'дБ, ATK=' + Math.round(q.targetSettings.attack * 1000) + 'мс, REL=' + Math.round(q.targetSettings.release * 1000) + 'мс';
        explEl.hidden = false;
      }

      this.hidden = true;
      document.getElementById('next-btn').hidden = false;
    });

    document.getElementById('next-btn').addEventListener('click', nextQuestion);
  }

  // ─── Fix Mix (diagnostic scenario) ───
  function renderFixMix(container, q) {
    var shuffled = shuffleOptions(qOptions(q), q.correctIndex);
    var html = '<p class="question-text">' + qText(q, 'question') + '</p>';

    if (q.scenario) {
      html += '<div class="scenario-box"><p>' + q.scenario + '</p></div>';
    }

    html += '<div class="options-list">';
    shuffled.options.forEach(function(opt, i) {
      html += '<div class="option-item" data-index="' + i + '">' + opt + '</div>';
    });
    html += '</div>';
    html += '<div class="explanation" hidden></div>';
    html += '<div class="question-actions"><button class="btn btn-primary btn-small" id="next-btn" hidden>Далее</button></div>';

    container.innerHTML = html;

    var answered = false;
    container.querySelectorAll('.option-item').forEach(function(item) {
      item.addEventListener('click', function() {
        if (answered) return;
        answered = true;

        var idx = parseInt(item.dataset.index);
        var correct = idx === shuffled.correctIndex;
        var timeSpent = (Date.now() - questionStartTime) / 1000;

        item.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) {
          container.querySelectorAll('.option-item')[shuffled.correctIndex].classList.add('correct');
        }
        container.querySelectorAll('.option-item').forEach(function(o) { o.classList.add('disabled'); });

        Scoring.recordAnswer(q.id, correct, q.points, q.category, q.difficulty, timeSpent);
        Mascot.trigger(correct ? 'correct_answer' : 'wrong_answer');

        var explEl = container.querySelector('.explanation');
        if (explEl && q.explanation) { explEl.textContent = q.explanation; explEl.hidden = false; }
        document.getElementById('next-btn').hidden = false;
      });
    });

    document.getElementById('next-btn').addEventListener('click', nextQuestion);
  }

  // ─── Results ───
  function showResults() {
    stopAllAudio();
    Scoring.clearProgress();
    showScreen('results');

    var level = Scoring.getLevel();
    var percent = Scoring.getPercentScore();
    var breakdown = Scoring.getCategoryBreakdown();
    var totalTime = Scoring.getTotalTime();
    var correctCount = Scoring.getCorrectCount();

    Mascot.trigger('results_' + level.id);

    var container = document.getElementById('results-container');
    var html = '<div class="results-header">';
    html += '<p class="results-tag">Результат</p>';
    html += '<div class="results-level" style="color:' + level.color + '">' + level.label + '</div>';
    html += '<div class="results-score">' + percent + '%</div>';
    html += '<div class="results-detail">' + Scoring.getTotalScore() + ' / ' + Scoring.getMaxScore() + ' очков &middot; ' + correctCount + '/' + QUESTIONS.length + ' верно &middot; ' + formatTime(totalTime) + '</div>';
    html += '</div>';

    html += '<div class="results-breakdown">';
    Object.keys(SCORING_RULES.categories).forEach(function(key) {
      var cat = SCORING_RULES.categories[key];
      var b = breakdown[key];
      var catPercent = b.max > 0 ? Math.round(b.score / b.max * 100) : 0;
      html += '<div class="breakdown-item">' +
        '<span class="breakdown-icon">' + cat.icon + '</span>' +
        '<span class="breakdown-label">' + cat.label + '</span>' +
        '<div class="breakdown-bar"><div class="breakdown-bar-fill" style="width:' + catPercent + '%"></div></div>' +
        '<span class="breakdown-value">' + catPercent + '%</span>' +
        '</div>';
    });
    html += '</div>';

    html += '<div class="results-actions">' +
      '<button class="btn btn-primary" id="share-btn">Поделиться</button>' +
      '<button class="btn btn-ghost" id="retry-btn">Пройти заново</button>' +
      '</div>';

    container.innerHTML = html;

    document.getElementById('share-btn').addEventListener('click', function() {
      var text = Scoring.getShareText();
      if (navigator.share) {
        navigator.share({ text: text }).catch(function() {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
          var btn = document.getElementById('share-btn');
          btn.textContent = 'Скопировано!';
          setTimeout(function() { btn.textContent = 'Поделиться'; }, 2000);
        });
      }
    });

    document.getElementById('retry-btn').addEventListener('click', function() {
      startTest();
    });
  }

  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ─── Init ───
  document.addEventListener('DOMContentLoaded', function() {
    var savedIndex = Scoring.loadProgress();
    var startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', function() {
        startBtn.hidden = true;
        startTest(savedIndex > 0 ? savedIndex : undefined);
      });
    }

    var stopBtn = document.getElementById('global-stop-btn');
    if (stopBtn) {
      stopBtn.addEventListener('click', function() {
        stopAllAudio();
        document.querySelectorAll('.btn-play.playing').forEach(function(b) {
          b.classList.remove('playing');
          b.innerHTML = '&#9654; Play';
        });
      });
    }
  });
})();
