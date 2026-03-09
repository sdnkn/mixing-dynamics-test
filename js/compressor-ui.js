// ─── Compressor UI ─── Knobs, sliders, waveform, GR meter
var CompressorUI = (function() {
  var activeKnob = null;
  var startY = 0;
  var startValue = 0;

  // ─── Knob Rendering ───
  function renderKnobs(container, params, onChange) {
    var html = '<div class="knobs-row">';
    var knobDefs = [
      { key: 'threshold', label: 'THR', min: -60, max: 0, unit: 'dB', step: 1 },
      { key: 'ratio', label: 'RAT', min: 1, max: 20, unit: ':1', step: 0.5 },
      { key: 'attack', label: 'ATK', min: 0.001, max: 0.15, unit: 's', step: 0.001, display: 'ms', displayMul: 1000 },
      { key: 'release', label: 'REL', min: 0.01, max: 1.1, unit: 's', step: 0.01, display: 'ms', displayMul: 1000 }
    ];

    knobDefs.forEach(function(def) {
      var value = params[def.key] !== undefined ? params[def.key] : (def.min + def.max) / 2;
      var displayVal = def.displayMul ? Math.round(value * def.displayMul) : Math.round(value * 10) / 10;
      var displayUnit = def.display || def.unit;
      var angle = valueToAngle(value, def.min, def.max);

      html += '<div class="knob-wrapper">' +
        '<div class="knob" data-key="' + def.key + '" data-min="' + def.min +
        '" data-max="' + def.max + '" data-step="' + def.step +
        '" data-value="' + value + '" data-display-mul="' + (def.displayMul || 1) + '">' +
        '<div class="knob-indicator" style="transform: translateX(-50%) rotate(' + angle + 'deg)"></div>' +
        '</div>' +
        '<span class="knob-label">' + def.label + '</span>' +
        '<span class="knob-value" data-knob-value="' + def.key + '">' + displayVal + displayUnit + '</span>' +
        '</div>';
    });

    html += '</div>';
    container.innerHTML += html;

    // Attach drag handlers
    var knobs = container.querySelectorAll('.knob');
    knobs.forEach(function(knob) {
      knob.addEventListener('mousedown', function(e) { startKnobDrag(e, knob, onChange); });
      knob.addEventListener('touchstart', function(e) { startKnobDrag(e, knob, onChange); }, { passive: false });
    });
  }

  function valueToAngle(value, min, max) {
    var normalized = (value - min) / (max - min);
    return -150 + normalized * 300;
  }

  function startKnobDrag(e, knob, onChange) {
    e.preventDefault();
    activeKnob = knob;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    startValue = parseFloat(knob.dataset.value);

    var onMove = function(ev) {
      if (!activeKnob) return;
      var currentY = ev.touches ? ev.touches[0].clientY : ev.clientY;
      var deltaY = startY - currentY;
      var min = parseFloat(activeKnob.dataset.min);
      var max = parseFloat(activeKnob.dataset.max);
      var range = max - min;
      var sensitivity = range / 200;
      var newValue = Math.max(min, Math.min(max, startValue + deltaY * sensitivity));

      activeKnob.dataset.value = newValue;

      var angle = valueToAngle(newValue, min, max);
      activeKnob.querySelector('.knob-indicator').style.transform = 'translateX(-50%) rotate(' + angle + 'deg)';

      var displayMul = parseFloat(activeKnob.dataset.displayMul) || 1;
      var displayVal = displayMul > 1 ? Math.round(newValue * displayMul) : Math.round(newValue * 10) / 10;
      var key = activeKnob.dataset.key;
      var valueEl = activeKnob.closest('.knobs-row').querySelector('[data-knob-value="' + key + '"]');
      if (valueEl) {
        var unit = displayMul > 1 ? 'ms' : (key === 'ratio' ? ':1' : 'dB');
        valueEl.textContent = displayVal + unit;
      }

      if (onChange) {
        var settings = {};
        settings[key] = newValue;
        onChange(settings);
      }
    };

    var onUp = function() {
      activeKnob = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }

  // ─── Notched Knobs (snap-to-value) ───
  function renderNotchedKnobs(container, params, notchConfig, onChange) {
    var html = '<div class="knobs-row">';

    var knobDefs = [
      { key: 'threshold', label: 'THR', min: -60, max: 0, unit: 'dB', step: 1 }
    ];

    // Threshold knob (continuous)
    knobDefs.forEach(function(def) {
      var value = params[def.key] !== undefined ? params[def.key] : (def.min + def.max) / 2;
      var angle = valueToAngle(value, def.min, def.max);
      html += '<div class="knob-wrapper">' +
        '<div class="knob" data-key="' + def.key + '" data-min="' + def.min +
        '" data-max="' + def.max + '" data-step="' + def.step +
        '" data-value="' + value + '" data-display-mul="1">' +
        '<div class="knob-indicator" style="transform: translateX(-50%) rotate(' + angle + 'deg)"></div>' +
        '</div>' +
        '<span class="knob-label">' + def.label + '</span>' +
        '<span class="knob-value" data-knob-value="' + def.key + '">' + Math.round(value) + def.unit + '</span>' +
        '</div>';
    });

    // Notched attack knob
    var atkNotches = notchConfig.attack; // [0.001, 0.005, ...]
    var atkIdx = findClosestNotch(params.attack || 0.001, atkNotches);
    var atkVal = atkNotches[atkIdx];
    var atkAngle = valueToAngle(atkIdx, 0, atkNotches.length - 1);
    html += '<div class="knob-wrapper">' +
      '<div class="knob notched-knob" data-key="attack" data-notch-index="' + atkIdx +
      '" data-notch-count="' + atkNotches.length + '" data-value="' + atkVal + '">' +
      '<div class="knob-indicator" style="transform: translateX(-50%) rotate(' + atkAngle + 'deg)"></div>' +
      '</div>' +
      '<span class="knob-label">ATK</span>' +
      '<span class="knob-value" data-knob-value="attack">' + Math.round(atkVal * 1000) + 'ms</span>' +
      '</div>';

    // Notched release knob
    var relNotches = notchConfig.release; // [0.01, 0.04, ...]
    var relIdx = findClosestNotch(params.release || 0.01, relNotches);
    var relVal = relNotches[relIdx];
    var relAngle = valueToAngle(relIdx, 0, relNotches.length - 1);
    html += '<div class="knob-wrapper">' +
      '<div class="knob notched-knob" data-key="release" data-notch-index="' + relIdx +
      '" data-notch-count="' + relNotches.length + '" data-value="' + relVal + '">' +
      '<div class="knob-indicator" style="transform: translateX(-50%) rotate(' + relAngle + 'deg)"></div>' +
      '</div>' +
      '<span class="knob-label">REL</span>' +
      '<span class="knob-value" data-knob-value="release">' + Math.round(relVal * 1000) + 'ms</span>' +
      '</div>';

    html += '</div>';

    // 1176-style ratio buttons
    var ratioValues = notchConfig.ratio; // [4, 8, 12, 20]
    var currentRatio = params.ratio || ratioValues[0];
    html += '<div class="ratio-buttons-wrapper">' +
      '<span class="ratio-buttons-label">RATIO</span>' +
      '<div class="ratio-buttons">';
    ratioValues.forEach(function(r) {
      var active = r === currentRatio ? ' active' : '';
      html += '<button class="ratio-btn' + active + '" data-ratio="' + r + '">' + r + ':1</button>';
    });
    html += '<button class="ratio-btn ratio-btn-all" data-ratio="all">ALL</button>';
    html += '</div></div>';

    container.innerHTML += html;

    // Threshold knob drag (continuous)
    var thrKnob = container.querySelector('.knob[data-key="threshold"]');
    if (thrKnob && !thrKnob.classList.contains('notched-knob')) {
      thrKnob.addEventListener('mousedown', function(e) { startKnobDrag(e, thrKnob, onChange); });
      thrKnob.addEventListener('touchstart', function(e) { startKnobDrag(e, thrKnob, onChange); }, { passive: false });
    }

    // Notched knob drags
    container.querySelectorAll('.notched-knob').forEach(function(knob) {
      knob.addEventListener('mousedown', function(e) { startNotchedDrag(e, knob, notchConfig, onChange); });
      knob.addEventListener('touchstart', function(e) { startNotchedDrag(e, knob, notchConfig, onChange); }, { passive: false });
    });

    // Ratio button clicks
    container.querySelectorAll('.ratio-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var isAll = btn.dataset.ratio === 'all';
        if (isAll) {
          var allActive = btn.classList.contains('active');
          container.querySelectorAll('.ratio-btn').forEach(function(b) {
            if (allActive) {
              b.classList.remove('active');
            } else {
              b.classList.add('active');
            }
          });
          if (!allActive) {
            if (onChange) onChange({ ratio: 20, knee: 0 });
          } else {
            var first = container.querySelector('.ratio-btn:not(.ratio-btn-all)');
            if (first) {
              first.classList.add('active');
              if (onChange) onChange({ ratio: parseFloat(first.dataset.ratio) });
            }
          }
        } else {
          container.querySelectorAll('.ratio-btn').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          if (onChange) onChange({ ratio: parseFloat(btn.dataset.ratio) });
        }
      });
    });
  }

  function findClosestNotch(value, notches) {
    var idx = 0;
    var minDist = Infinity;
    for (var i = 0; i < notches.length; i++) {
      var dist = Math.abs(notches[i] - value);
      if (dist < minDist) { minDist = dist; idx = i; }
    }
    return idx;
  }

  function startNotchedDrag(e, knob, notchConfig, onChange) {
    e.preventDefault();
    var key = knob.dataset.key;
    var notches = notchConfig[key];
    var currentIdx = parseInt(knob.dataset.notchIndex);
    var dragStartY = e.touches ? e.touches[0].clientY : e.clientY;
    var dragStartIdx = currentIdx;

    var onMove = function(ev) {
      var currentY = ev.touches ? ev.touches[0].clientY : ev.clientY;
      var deltaY = dragStartY - currentY;
      var sensitivity = 200 / (notches.length - 1);
      var idxDelta = Math.round(deltaY / sensitivity);
      var newIdx = Math.max(0, Math.min(notches.length - 1, dragStartIdx + idxDelta));

      if (newIdx !== parseInt(knob.dataset.notchIndex)) {
        knob.dataset.notchIndex = newIdx;
        knob.dataset.value = notches[newIdx];

        var angle = valueToAngle(newIdx, 0, notches.length - 1);
        knob.querySelector('.knob-indicator').style.transform = 'translateX(-50%) rotate(' + angle + 'deg)';

        var valueEl = knob.closest('.knobs-row').querySelector('[data-knob-value="' + key + '"]');
        if (valueEl) valueEl.textContent = Math.round(notches[newIdx] * 1000) + 'ms';

        if (onChange) {
          var settings = {};
          settings[key] = notches[newIdx];
          onChange(settings);
        }
      }
    };

    var onUp = function() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }

  function getNotchedValues(container) {
    var values = {};
    container.querySelectorAll('.knob').forEach(function(knob) {
      values[knob.dataset.key] = parseFloat(knob.dataset.value);
    });
    var activeRatio = container.querySelector('.ratio-btn.active');
    if (activeRatio) values.ratio = parseFloat(activeRatio.dataset.ratio);
    return values;
  }

  function getKnobValues(container) {
    var values = {};
    var knobs = container.querySelectorAll('.knob');
    knobs.forEach(function(knob) {
      values[knob.dataset.key] = parseFloat(knob.dataset.value);
    });
    return values;
  }

  // ─── Sliders (for multiband) ───
  function renderBandSliders(container, bandName, label, settings, onChange) {
    var div = document.createElement('div');
    div.className = 'band-section';
    div.innerHTML =
      '<div class="band-title">' + label + '</div>' +
      '<div class="slider-row">' +
        '<span class="slider-label">Threshold</span>' +
        '<input type="range" class="slider-input" data-band="' + bandName + '" data-param="threshold" ' +
          'min="-60" max="0" step="1" value="' + (settings.threshold || -10) + '">' +
        '<span class="slider-value" data-slider-value="' + bandName + '-threshold">' + (settings.threshold || -10) + 'dB</span>' +
      '</div>' +
      '<div class="slider-row">' +
        '<span class="slider-label">Ratio</span>' +
        '<input type="range" class="slider-input" data-band="' + bandName + '" data-param="ratio" ' +
          'min="1" max="20" step="0.5" value="' + (settings.ratio || 2) + '">' +
        '<span class="slider-value" data-slider-value="' + bandName + '-ratio">' + (settings.ratio || 2) + ':1</span>' +
      '</div>' +
      '<div class="gr-meter">' +
        '<span class="gr-meter-label">GR</span>' +
        '<div class="gr-meter-bar"><div class="gr-meter-fill" data-gr="' + bandName + '"></div></div>' +
        '<span class="gr-meter-value" data-gr-value="' + bandName + '">0 dB</span>' +
      '</div>';

    container.appendChild(div);

    var sliders = div.querySelectorAll('.slider-input');
    sliders.forEach(function(slider) {
      slider.addEventListener('input', function() {
        var band = slider.dataset.band;
        var param = slider.dataset.param;
        var val = parseFloat(slider.value);
        var unit = param === 'ratio' ? ':1' : 'dB';
        var valEl = div.querySelector('[data-slider-value="' + band + '-' + param + '"]');
        if (valEl) valEl.textContent = val + unit;
        if (onChange) onChange(band, param, val);
      });
    });
  }

  function getBandValues(container) {
    var values = { low: {}, mid: {}, high: {} };
    var sliders = container.querySelectorAll('.slider-input');
    sliders.forEach(function(s) {
      var band = s.dataset.band;
      var param = s.dataset.param;
      if (values[band]) values[band][param] = parseFloat(s.value);
    });
    return values;
  }

  // ─── Sidechain Sliders ───
  function renderSidechainSliders(container, settings, onChange) {
    var defs = [
      { key: 'depth', label: 'Depth', min: 0, max: 24, step: 1, unit: 'dB' },
      { key: 'attack', label: 'Attack', min: 0.001, max: 0.1, step: 0.001, unit: 'ms', displayMul: 1000 },
      { key: 'release', label: 'Release', min: 0.01, max: 0.5, step: 0.01, unit: 'ms', displayMul: 1000 }
    ];

    defs.forEach(function(def) {
      var val = settings[def.key] !== undefined ? settings[def.key] : (def.min + def.max) / 2;
      var displayVal = def.displayMul ? Math.round(val * def.displayMul) : Math.round(val * 10) / 10;
      var div = document.createElement('div');
      div.className = 'slider-row';
      div.innerHTML =
        '<span class="slider-label">' + def.label + '</span>' +
        '<input type="range" class="slider-input" data-param="' + def.key + '" ' +
          'min="' + def.min + '" max="' + def.max + '" step="' + def.step + '" value="' + val + '">' +
        '<span class="slider-value" data-sc-value="' + def.key + '">' + displayVal + def.unit + '</span>';
      container.appendChild(div);

      div.querySelector('.slider-input').addEventListener('input', function() {
        var v = parseFloat(this.value);
        var dv = def.displayMul ? Math.round(v * def.displayMul) : Math.round(v * 10) / 10;
        div.querySelector('[data-sc-value="' + def.key + '"]').textContent = dv + def.unit;
        if (onChange) {
          var s = {};
          s[def.key] = v;
          onChange(s);
        }
      });
    });
  }

  function getSidechainValues(container) {
    var values = {};
    container.querySelectorAll('.slider-input').forEach(function(s) {
      values[s.dataset.param] = parseFloat(s.value);
    });
    return values;
  }

  // ─── Waveform Visualization ───
  function drawWaveform(canvas, analyserData, color) {
    if (!canvas || !analyserData) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    var drawColor = color || '#00e5ff';
    ctx.lineWidth = 2;
    ctx.strokeStyle = drawColor;
    ctx.shadowBlur = 6;
    ctx.shadowColor = drawColor;
    ctx.beginPath();

    var sliceWidth = w / analyserData.length;
    var x = 0;
    for (var i = 0; i < analyserData.length; i++) {
      var v = analyserData[i] / 128.0;
      var y = v * h / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ─── GR Meter ───
  function updateGRMeter(element, reductionDb) {
    if (!element) return;
    var fill = element.querySelector('.gr-meter-fill');
    var valueEl = element.querySelector('.gr-meter-value');
    var percent = Math.min(100, Math.abs(reductionDb) / 20 * 100);
    if (fill) fill.style.width = percent + '%';
    if (valueEl) valueEl.textContent = Math.round(reductionDb) + ' dB';
  }

  function updateGRByName(container, name, reductionDb) {
    var fill = container.querySelector('[data-gr="' + name + '"]');
    var valueEl = container.querySelector('[data-gr-value="' + name + '"]');
    if (fill) fill.style.width = Math.min(100, Math.abs(reductionDb) / 20 * 100) + '%';
    if (valueEl) valueEl.textContent = Math.round(reductionDb) + ' dB';
  }

  return {
    renderKnobs: renderKnobs,
    renderNotchedKnobs: renderNotchedKnobs,
    getKnobValues: getKnobValues,
    getNotchedValues: getNotchedValues,
    renderBandSliders: renderBandSliders,
    getBandValues: getBandValues,
    renderSidechainSliders: renderSidechainSliders,
    getSidechainValues: getSidechainValues,
    drawWaveform: drawWaveform,
    updateGRMeter: updateGRMeter,
    updateGRByName: updateGRByName
  };
})();
