// ─── Main App Controller ───
(function() {
  var currentIndex = 0;
  var questionStartTime = 0;
  var activeChains = {};
  var abState = 'user'; // 'user' or 'target'
  var vizRAF = null;

  // ─── Screen Management ───
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function(s) {
      s.classList.remove('active');
    });
    var screen = document.getElementById('screen-' + id);
    if (screen) screen.classList.add('active');
  }

  function updateProgress() {
    var counter = document.getElementById('question-counter');
    var fill = document.getElementById('progress-fill');
    var badge = document.getElementById('question-difficulty');
    var q = QUESTIONS[currentIndex];

    if (counter) counter.textContent = (currentIndex + 1) + ' / ' + QUESTIONS.length;
    if (fill) fill.style.width = ((currentIndex + 1) / QUESTIONS.length * 100) + '%';
    if (badge && q) {
      badge.textContent = q.difficulty;
      badge.className = 'difficulty-badge ' + q.difficulty;
    }
  }

  // ─── Start Test ───
  function startTest(fromIndex) {
    if (fromIndex === undefined || fromIndex < 0) {
      Scoring.reset();
      currentIndex = 0;
    } else {
      currentIndex = fromIndex;
    }

    showScreen('loading');
    AudioEngine.preloadAll();

    // Brief loading simulation
    var progress = document.getElementById('loading-progress');
    var step = 0;
    var loadInterval = setInterval(function() {
      step += 20;
      if (progress) progress.style.width = step + '%';
      if (step >= 100) {
        clearInterval(loadInterval);
        Mascot.init();
        Mascot.show();
        Mascot.trigger('test_start', { duration: 5000 });
        setTimeout(function() {
          showScreen('question');
          renderQuestion();
        }, 500);
      }
    }, 100);
  }

  // ─── Render Question by Type ───
  function renderQuestion() {
    stopAllAudio();
    var q = QUESTIONS[currentIndex];
    if (!q) { showResults(); return; }

    updateProgress();
    questionStartTime = Date.now();

    var container = document.getElementById('question-container');
    container.innerHTML = '';

    switch (q.type) {
      case 'theory': renderTheory(container, q); break;
      case 'detection': renderDetection(container, q); break;
      case 'matching': renderMatching(container, q); break;
      case 'identify': renderIdentify(container, q); break;
      case 'multiband': renderMultiband(container, q); break;
      case 'sidechain': renderSidechain(container, q); break;
    }

    // Mascot trigger
    var mascotEvent = {
      theory: 'question_theory',
      detection: 'question_audio',
      matching: 'question_interactive',
      identify: 'question_audio',
      multiband: 'question_multiband',
      sidechain: 'question_sidechain'
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

  // ─── Type 1: Theory ───
  function renderTheory(container, q) {
    var opts = q.optionsRu || q.options;
    var html = '<p class="question-text">' + (q.questionRu || q.question) + '</p>';
    html += '<div class="options-list">';
    opts.forEach(function(opt, i) {
      html += '<div class="option-item" data-index="' + i + '">' + opt + '</div>';
    });
    html += '</div>';
    html += '<div class="explanation" hidden></div>';
    html += '<div class="question-actions"><button class="btn btn-primary btn-small" id="next-btn" hidden>Next</button></div>';

    container.innerHTML = html;

    var answered = false;
    container.querySelectorAll('.option-item').forEach(function(item) {
      item.addEventListener('click', function() {
        if (answered) return;
        answered = true;

        var idx = parseInt(item.dataset.index);
        var correct = idx === q.correctIndex;
        var timeSpent = (Date.now() - questionStartTime) / 1000;

        item.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) {
          container.querySelectorAll('.option-item')[q.correctIndex].classList.add('correct');
        }
        container.querySelectorAll('.option-item').forEach(function(o) { o.classList.add('disabled'); });

        Scoring.recordAnswer(q.id, correct, q.points, q.category, q.difficulty, timeSpent);
        Mascot.trigger(correct ? 'correct_answer' : 'wrong_answer');

        var explEl = container.querySelector('.explanation');
        if (explEl && q.explanation) {
          explEl.textContent = q.explanation;
          explEl.hidden = false;
        }

        document.getElementById('next-btn').hidden = false;
      });
    });

    document.getElementById('next-btn').addEventListener('click', nextQuestion);
  }

  // ─── Type 2: Detection ───
  function renderDetection(container, q) {
    var html = '<p class="question-text">' + (q.questionRu || q.question) + '</p>';
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
    html += '<div class="question-actions"><button class="btn btn-primary btn-small" id="next-btn" hidden>Next</button></div>';

    container.innerHTML = html;

    var chainA = AudioEngine.createCompressorChain(q.settingsA);
    var chainB = AudioEngine.createCompressorChain(q.settingsB);

    // Normalize loudness with makeup gain
    var gainA = estimateMakeupGain(q.settingsA);
    var gainB = estimateMakeupGain(q.settingsB);
    chainA.makeup.gain.value = gainA;
    chainB.makeup.gain.value = gainB;

    var canvasA = document.getElementById('wave-a');
    var canvasB = document.getElementById('wave-b');
    var playingChain = null;

    function startViz() {
      if (vizRAF) cancelAnimationFrame(vizRAF);
      function loop() {
        if (playingChain === 'A') {
          CompressorUI.drawWaveform(canvasA, AudioEngine.getAnalyserData(chainA.analyser), '#6c5ce7');
        } else if (playingChain === 'B') {
          CompressorUI.drawWaveform(canvasB, AudioEngine.getAnalyserData(chainB.analyser), '#a78bfa');
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
    // Simple makeup gain estimation to normalize loudness
    var reduction = Math.max(0, -settings.threshold) * (1 - 1 / settings.ratio);
    return Math.pow(10, reduction * 0.3 / 20);
  }

  // ─── Type 3: Matching ───
  function renderMatching(container, q) {
    var html = '<p class="question-text">' + (q.questionRu || q.question) + '</p>';
    html += '<div class="audio-controls">' +
      '<button class="btn-play" id="play-btn">&#9654; Play</button>' +
      '<button class="btn-ab" id="ab-btn">A/B: Yours</button>' +
      '</div>';
    html += '<div class="waveform-container"><canvas class="waveform-canvas" id="wave-main" width="600" height="80"></canvas></div>';
    html += '<div class="gr-meter"><span class="gr-meter-label">GR</span><div class="gr-meter-bar"><div class="gr-meter-fill" id="gr-fill"></div></div><span class="gr-meter-value" id="gr-value">0 dB</span></div>';
    html += '<div id="knobs-area"></div>';
    html += '<div class="question-actions">' +
      '<button class="btn btn-primary btn-small" id="submit-btn">Check</button>' +
      '<button class="btn btn-primary btn-small" id="next-btn" hidden>Next</button>' +
      '</div>';
    html += '<div class="explanation" hidden></div>';

    container.innerHTML = html;

    var userChain = AudioEngine.createCompressorChain(q.startSettings);
    var targetChain = AudioEngine.createCompressorChain(q.targetSettings);
    var targetMakeup = estimateMakeupGain(q.targetSettings);
    targetChain.makeup.gain.value = targetMakeup;

    activeChains.user = userChain;
    activeChains.target = targetChain;

    CompressorUI.renderKnobs(document.getElementById('knobs-area'), q.startSettings, function(settings) {
      AudioEngine.updateCompressor(userChain, settings);
      // Update makeup gain
      var knobVals = CompressorUI.getKnobValues(document.getElementById('knobs-area'));
      var mg = estimateMakeupGain(knobVals);
      userChain.makeup.gain.value = mg;
    });

    var canvas = document.getElementById('wave-main');
    var currentChain = userChain;

    function startViz() {
      if (vizRAF) cancelAnimationFrame(vizRAF);
      function loop() {
        var data = AudioEngine.getAnalyserData(currentChain.analyser);
        CompressorUI.drawWaveform(canvas, data, abState === 'user' ? '#6c5ce7' : '#f39c12');

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
        this.innerHTML = '&#9724; Stop';
        startViz();
      }
    });

    document.getElementById('ab-btn').addEventListener('click', function() {
      var wasPlaying = AudioEngine.isPlaying();
      if (wasPlaying) AudioEngine.stop();

      if (abState === 'user') {
        abState = 'target';
        currentChain = targetChain;
        this.textContent = 'A/B: Target';
        this.classList.add('active-b');
      } else {
        abState = 'user';
        currentChain = userChain;
        this.textContent = 'A/B: Yours';
        this.classList.remove('active-b');
      }

      if (wasPlaying) {
        AudioEngine.play(q.audioSource, currentChain);
        startViz();
      }
    });

    document.getElementById('submit-btn').addEventListener('click', function() {
      var vals = CompressorUI.getKnobValues(document.getElementById('knobs-area'));
      var accuracy = calculateAccuracy(vals, q.targetSettings, q.tolerance);

      Scoring.recordAccuracyAnswer(q.id, accuracy, q.points, q.category, q.difficulty);

      var isGood = accuracy <= 0.5;
      Mascot.trigger(isGood ? 'correct_answer' : 'wrong_answer');

      var explEl = container.querySelector('.explanation');
      if (explEl) {
        var label = accuracy <= 0.2 ? 'Perfect!' : accuracy <= 0.5 ? 'Good!' : accuracy <= 0.8 ? 'Close' : 'Keep practicing';
        explEl.textContent = label + ' Target: THR=' + q.targetSettings.threshold + 'dB, RAT=' + q.targetSettings.ratio + ':1, ATK=' + Math.round(q.targetSettings.attack * 1000) + 'ms, REL=' + Math.round(q.targetSettings.release * 1000) + 'ms';
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
        totalDeviation += Math.min(dev, 2); // cap at 2x tolerance
        count++;
      }
    });

    return count > 0 ? totalDeviation / count / 2 : 1; // normalize to 0-1
  }

  // ─── Type 4: Identify ───
  function renderIdentify(container, q) {
    var html = '<p class="question-text">' + (q.questionRu || q.question) + '</p>';
    html += '<div class="audio-controls">' +
      '<button class="btn-play" id="play-processed">&#9654; Processed</button>' +
      '<button class="btn-play" id="play-original">&#9654; Original</button>' +
      '</div>';
    html += '<div class="waveform-container"><canvas class="waveform-canvas" id="wave-id" width="600" height="80"></canvas></div>';

    var opts = q.optionsRu || q.options;
    html += '<div class="options-list">';
    opts.forEach(function(opt, i) {
      html += '<div class="option-item" data-index="' + i + '">' + opt + '</div>';
    });
    html += '</div>';
    html += '<div class="explanation" hidden></div>';
    html += '<div class="question-actions"><button class="btn btn-primary btn-small" id="next-btn" hidden>Next</button></div>';

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
        CompressorUI.drawWaveform(canvas, AudioEngine.getAnalyserData(currentAnalyser), '#6c5ce7');
        vizRAF = requestAnimationFrame(loop);
      }
      loop();
    }

    // For sidechain_demo type
    var audioSource = q.audioSource;
    if (audioSource === 'sidechain_demo') audioSource = 'mix';

    document.getElementById('play-processed').addEventListener('click', function() {
      AudioEngine.stop();
      if (q.audioSource === 'sidechain_demo' && q.hiddenSidechain) {
        // Play with sidechain effect
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
        // Play without sidechain - just the mix
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
        var correct = idx === q.correctIndex;
        var timeSpent = (Date.now() - questionStartTime) / 1000;

        item.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) {
          container.querySelectorAll('.option-item')[q.correctIndex].classList.add('correct');
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

  // ─── Type 5: Multiband ───
  function renderMultiband(container, q) {
    var html = '<p class="question-text">' + (q.questionRu || q.question) + '</p>';
    html += '<div class="audio-controls">' +
      '<button class="btn-play" id="play-btn">&#9654; Play</button>' +
      '<button class="btn-ab" id="ab-btn">A/B: Yours</button>' +
      '</div>';
    html += '<div class="waveform-container"><canvas class="waveform-canvas" id="wave-mb" width="600" height="80"></canvas></div>';
    html += '<div id="bands-area"></div>';
    html += '<div class="question-actions">' +
      '<button class="btn btn-primary btn-small" id="submit-btn">Check</button>' +
      '<button class="btn btn-primary btn-small" id="next-btn" hidden>Next</button>' +
      '</div>';
    html += '<div class="explanation" hidden></div>';

    container.innerHTML = html;

    var userMB = AudioEngine.createMultibandChain(q.startBands);
    var targetMB = AudioEngine.createMultibandChain(q.targetBands);

    var bandsArea = document.getElementById('bands-area');
    var bandLabels = {
      low: 'LOW (20-200 Hz)',
      mid: 'MID (200 Hz - 2 kHz)',
      high: 'HIGH (2 kHz - 20 kHz)'
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
        CompressorUI.drawWaveform(canvas, AudioEngine.getAnalyserData(currentMB.analyser), abState === 'user' ? '#6c5ce7' : '#f39c12');

        // Update GR meters
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
        this.innerHTML = '&#9724; Stop';
        startViz();
      }
    });

    document.getElementById('ab-btn').addEventListener('click', function() {
      var wasPlaying = AudioEngine.isPlaying();
      if (wasPlaying) AudioEngine.stop();

      if (abState === 'user') {
        abState = 'target';
        currentMB = targetMB;
        this.textContent = 'A/B: Target';
        this.classList.add('active-b');
      } else {
        abState = 'user';
        currentMB = userMB;
        this.textContent = 'A/B: Yours';
        this.classList.remove('active-b');
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
        var label = accuracy <= 0.2 ? 'Perfect!' : accuracy <= 0.5 ? 'Good!' : 'Keep practicing';
        var targetStr = ['low', 'mid', 'high'].map(function(n) {
          return n.toUpperCase() + ': THR=' + q.targetBands[n].threshold + 'dB, RAT=' + q.targetBands[n].ratio + ':1';
        }).join(' | ');
        explEl.textContent = label + ' Target: ' + targetStr;
        explEl.hidden = false;
      }

      this.hidden = true;
      document.getElementById('next-btn').hidden = false;
    });

    document.getElementById('next-btn').addEventListener('click', nextQuestion);
  }

  // ─── Type 6: Sidechain ───
  function renderSidechain(container, q) {
    var html = '<p class="question-text">' + (q.questionRu || q.question) + '</p>';
    html += '<div class="audio-controls">' +
      '<button class="btn-play" id="play-btn">&#9654; Play</button>' +
      '<button class="btn-ab" id="ab-btn">A/B: Yours</button>' +
      '</div>';
    html += '<div class="sidechain-viz">' +
      '<div class="sidechain-track"><span class="sidechain-track-label">KICK</span><canvas class="sidechain-canvas" id="sc-kick" width="500" height="40"></canvas></div>' +
      '<div class="sidechain-track"><span class="sidechain-track-label">BASS</span><canvas class="sidechain-canvas" id="sc-bass" width="500" height="40"></canvas></div>' +
      '</div>';
    html += '<div id="sc-sliders" class="band-section"></div>';
    html += '<div class="question-actions">' +
      '<button class="btn btn-primary btn-small" id="submit-btn">Check</button>' +
      '<button class="btn btn-primary btn-small" id="next-btn" hidden>Next</button>' +
      '</div>';
    html += '<div class="explanation" hidden></div>';

    container.innerHTML = html;

    var userSC = AudioEngine.createSidechainChain(q.startSettings);
    var slidersArea = document.getElementById('sc-sliders');

    CompressorUI.renderSidechainSliders(slidersArea, q.startSettings, function(settings) {
      var all = CompressorUI.getSidechainValues(slidersArea);
      AudioEngine.updateSidechainSettings(all);
    });

    var kickCanvas = document.getElementById('sc-kick');
    var bassCanvas = document.getElementById('sc-bass');

    function startViz() {
      if (vizRAF) cancelAnimationFrame(vizRAF);
      function loop() {
        if (userSC.kickAnalyser) {
          CompressorUI.drawWaveform(kickCanvas, AudioEngine.getAnalyserData(userSC.kickAnalyser), '#e74c3c');
        }
        if (userSC.analyser) {
          CompressorUI.drawWaveform(bassCanvas, AudioEngine.getAnalyserData(userSC.analyser), '#6c5ce7');
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
        this.innerHTML = '&#9724; Stop';
        startViz();
      }
    });

    // A/B: toggle sidechain depth
    var scEnabled = true;
    document.getElementById('ab-btn').addEventListener('click', function() {
      if (scEnabled) {
        AudioEngine.updateSidechainSettings({ depth: 0, attack: 0.01, release: 0.15 });
        this.textContent = 'A/B: No SC';
        this.classList.add('active-b');
        scEnabled = false;
      } else {
        var vals = CompressorUI.getSidechainValues(slidersArea);
        AudioEngine.updateSidechainSettings(vals);
        this.textContent = 'A/B: Yours';
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
        var label = accuracy <= 0.2 ? 'Perfect!' : accuracy <= 0.5 ? 'Good!' : 'Keep practicing';
        explEl.textContent = label + ' Target: Depth=' + q.targetSettings.depth + 'dB, ATK=' + Math.round(q.targetSettings.attack * 1000) + 'ms, REL=' + Math.round(q.targetSettings.release * 1000) + 'ms';
        explEl.hidden = false;
      }

      this.hidden = true;
      document.getElementById('next-btn').hidden = false;
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

    // Mascot result trigger
    Mascot.trigger('results_' + level.id);

    var container = document.getElementById('results-container');
    var html = '<div class="results-level" style="color:' + level.color + '">' + level.labelRu + '</div>';
    html += '<div class="results-score">' + Scoring.getTotalScore() + ' / ' + Scoring.getMaxScore() + ' (' + percent + '%) &middot; ' + correctCount + '/' + QUESTIONS.length + ' correct &middot; ' + formatTime(totalTime) + '</div>';

    html += '<div class="results-breakdown">';
    Object.keys(SCORING_RULES.categories).forEach(function(key) {
      var cat = SCORING_RULES.categories[key];
      var b = breakdown[key];
      var catPercent = b.max > 0 ? Math.round(b.score / b.max * 100) : 0;
      html += '<div class="breakdown-item">' +
        '<span class="breakdown-label">' + cat.icon + ' ' + cat.labelRu + '</span>' +
        '<span class="breakdown-value">' + catPercent + '% (' + b.correct + '/' + b.total + ')</span>' +
        '</div>';
    });
    html += '</div>';

    html += '<div class="results-actions">' +
      '<button class="btn btn-primary" id="share-btn">Share Result</button>' +
      '<button class="btn btn-secondary" id="retry-btn">Try Again</button>' +
      '</div>';

    container.innerHTML = html;

    document.getElementById('share-btn').addEventListener('click', function() {
      var text = Scoring.getShareText();
      if (navigator.share) {
        navigator.share({ text: text }).catch(function() {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
          var btn = document.getElementById('share-btn');
          btn.textContent = 'Copied!';
          setTimeout(function() { btn.textContent = 'Share Result'; }, 2000);
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
    // Check for saved progress
    var savedIndex = Scoring.loadProgress();
    if (savedIndex > 0) {
      document.getElementById('continue-btn').hidden = false;
      document.getElementById('continue-btn').addEventListener('click', function() {
        startTest(savedIndex);
      });
    }

    document.getElementById('start-btn').addEventListener('click', function() {
      startTest();
    });
  });
})();
