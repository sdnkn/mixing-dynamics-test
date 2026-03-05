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
      { key: 'attack', label: 'ATK', min: 0.001, max: 1, unit: 's', step: 0.001, display: 'ms', displayMul: 1000 },
      { key: 'release', label: 'REL', min: 0.01, max: 1, unit: 's', step: 0.01, display: 'ms', displayMul: 1000 }
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

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = color || '#6c5ce7';
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
    getKnobValues: getKnobValues,
    renderBandSliders: renderBandSliders,
    getBandValues: getBandValues,
    renderSidechainSliders: renderSidechainSliders,
    getSidechainValues: getSidechainValues,
    drawWaveform: drawWaveform,
    updateGRMeter: updateGRMeter,
    updateGRByName: updateGRByName
  };
})();
