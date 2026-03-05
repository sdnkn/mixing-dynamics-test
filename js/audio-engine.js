// ─── Audio Engine ─── Web Audio API management
var AudioEngine = (function() {
  var ctx = null;
  var bufferCache = {};
  var currentSource = null;
  var isPlaying = false;

  // Active chains
  var chains = {
    user: null,
    target: null,
    multiband: null,
    sidechain: null
  };

  var activeChain = 'user';
  var animFrameId = null;

  function getContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // ─── Sound Generation ───
  function generateDrums(audioCtx, duration) {
    var sampleRate = audioCtx.sampleRate;
    var length = sampleRate * duration;
    var buffer = audioCtx.createBuffer(1, length, sampleRate);
    var data = buffer.getChannelData(0);
    var bpm = 120;
    var beatSamples = Math.floor(sampleRate * 60 / bpm);

    for (var i = 0; i < length; i++) {
      var posInBeat = i % beatSamples;
      var t = posInBeat / sampleRate;

      // Kick on beats 1 and 3
      var beatNum = Math.floor(i / beatSamples) % 4;
      if (beatNum === 0 || beatNum === 2) {
        if (t < 0.15) {
          var kickEnv = Math.exp(-t * 30);
          var kickFreq = 60 + 200 * Math.exp(-t * 40);
          data[i] += Math.sin(2 * Math.PI * kickFreq * t) * kickEnv * 0.7;
        }
      }

      // Snare on beats 2 and 4
      if (beatNum === 1 || beatNum === 3) {
        if (t < 0.1) {
          var snareEnv = Math.exp(-t * 25);
          data[i] += (Math.random() * 2 - 1) * snareEnv * 0.4;
          data[i] += Math.sin(2 * Math.PI * 200 * t) * snareEnv * 0.3;
        }
      }

      // Hi-hat on every 8th
      var eighthSamples = beatSamples / 2;
      var posInEighth = i % eighthSamples;
      var te = posInEighth / sampleRate;
      if (te < 0.03) {
        var hhEnv = Math.exp(-te * 100);
        data[i] += (Math.random() * 2 - 1) * hhEnv * 0.15;
      }
    }

    return buffer;
  }

  function generateBass(audioCtx, duration) {
    var sampleRate = audioCtx.sampleRate;
    var length = sampleRate * duration;
    var buffer = audioCtx.createBuffer(1, length, sampleRate);
    var data = buffer.getChannelData(0);
    var bpm = 120;
    var beatSamples = Math.floor(sampleRate * 60 / bpm);
    var notes = [55, 55, 73.42, 65.41]; // A1, A1, D2, C2

    for (var i = 0; i < length; i++) {
      var beatNum = Math.floor(i / beatSamples) % 4;
      var posInBeat = (i % beatSamples) / sampleRate;
      var freq = notes[beatNum];
      var env = Math.min(1, posInBeat * 20) * Math.exp(-posInBeat * 2);

      // Sawtooth approximation
      var phase = (i / sampleRate * freq) % 1;
      var saw = 2 * phase - 1;

      // Low-pass filter approximation: soften harmonics
      data[i] = saw * env * 0.4;
    }

    // Simple smoothing pass (low-pass)
    for (var j = 1; j < length; j++) {
      data[j] = data[j] * 0.3 + data[j - 1] * 0.7;
    }

    return buffer;
  }

  function generateVocal(audioCtx, duration) {
    var sampleRate = audioCtx.sampleRate;
    var length = sampleRate * duration;
    var buffer = audioCtx.createBuffer(1, length, sampleRate);
    var data = buffer.getChannelData(0);
    // Formant-like synthesis: multiple sine waves
    var formants = [
      { freq: 220, amp: 0.4 },
      { freq: 700, amp: 0.2 },
      { freq: 1200, amp: 0.1 },
      { freq: 2800, amp: 0.05 }
    ];

    for (var i = 0; i < length; i++) {
      var t = i / sampleRate;
      // Amplitude envelope: phrases
      var phrasePos = (t % 2) / 2;
      var env = Math.sin(phrasePos * Math.PI) * 0.8 + 0.2;
      // Vibrato
      var vibrato = 1 + 0.02 * Math.sin(2 * Math.PI * 5 * t);

      var sample = 0;
      for (var f = 0; f < formants.length; f++) {
        sample += Math.sin(2 * Math.PI * formants[f].freq * vibrato * t) * formants[f].amp;
      }
      data[i] = sample * env;
    }

    return buffer;
  }

  function generateMix(audioCtx, duration) {
    var drums = generateDrums(audioCtx, duration);
    var bass = generateBass(audioCtx, duration);
    var vocal = generateVocal(audioCtx, duration);

    var sampleRate = audioCtx.sampleRate;
    var length = sampleRate * duration;
    var buffer = audioCtx.createBuffer(1, length, sampleRate);
    var data = buffer.getChannelData(0);
    var dData = drums.getChannelData(0);
    var bData = bass.getChannelData(0);
    var vData = vocal.getChannelData(0);

    for (var i = 0; i < length; i++) {
      data[i] = (dData[i] || 0) * 0.4 + (bData[i] || 0) * 0.3 + (vData[i] || 0) * 0.3;
    }

    return buffer;
  }

  function generatePiano(audioCtx, duration) {
    var sampleRate = audioCtx.sampleRate;
    var length = sampleRate * duration;
    var buffer = audioCtx.createBuffer(1, length, sampleRate);
    var data = buffer.getChannelData(0);
    var bpm = 120;
    var beatSamples = Math.floor(sampleRate * 60 / bpm);
    var notes = [261.63, 329.63, 392.0, 329.63]; // C4, E4, G4, E4

    for (var i = 0; i < length; i++) {
      var beatNum = Math.floor(i / beatSamples) % 4;
      var posInBeat = (i % beatSamples) / sampleRate;
      var freq = notes[beatNum];
      var env = Math.exp(-posInBeat * 3);

      // FM synthesis for piano-like timbre
      var modIndex = 2 * Math.exp(-posInBeat * 8);
      var modulator = Math.sin(2 * Math.PI * freq * 2 * posInBeat) * modIndex;
      data[i] = Math.sin(2 * Math.PI * freq * posInBeat + modulator) * env * 0.5;
    }

    return buffer;
  }

  function getBuffer(sourceType) {
    var audioCtx = getContext();
    if (bufferCache[sourceType]) return bufferCache[sourceType];

    var duration = 4; // 4 seconds per loop
    var buffer;
    switch (sourceType) {
      case 'drums': buffer = generateDrums(audioCtx, duration); break;
      case 'bass': buffer = generateBass(audioCtx, duration); break;
      case 'vocal': buffer = generateVocal(audioCtx, duration); break;
      case 'mix': buffer = generateMix(audioCtx, duration); break;
      case 'piano': buffer = generatePiano(audioCtx, duration); break;
      case 'sidechain_demo': buffer = generateMix(audioCtx, duration); break;
      default: buffer = generateDrums(audioCtx, duration);
    }

    bufferCache[sourceType] = buffer;
    return buffer;
  }

  // ─── Chain Creation ───
  function createCompressorChain(settings) {
    var audioCtx = getContext();
    var compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = settings.threshold || -24;
    compressor.ratio.value = settings.ratio || 4;
    compressor.attack.value = settings.attack || 0.01;
    compressor.release.value = settings.release || 0.1;
    compressor.knee.value = settings.knee !== undefined ? settings.knee : 10;

    var makeup = audioCtx.createGain();
    makeup.gain.value = 1;

    var analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;

    compressor.connect(makeup);
    makeup.connect(analyser);
    analyser.connect(audioCtx.destination);

    return { compressor: compressor, makeup: makeup, analyser: analyser, input: compressor };
  }

  function createBypassChain() {
    var audioCtx = getContext();
    var gain = audioCtx.createGain();
    var analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;

    gain.connect(analyser);
    analyser.connect(audioCtx.destination);

    return { gain: gain, analyser: analyser, input: gain };
  }

  function createMultibandChain(bandSettings) {
    var audioCtx = getContext();
    var input = audioCtx.createGain();

    // Crossover filters
    var lowFilter = audioCtx.createBiquadFilter();
    lowFilter.type = 'lowpass';
    lowFilter.frequency.value = 200;

    var midFilter = audioCtx.createBiquadFilter();
    midFilter.type = 'bandpass';
    midFilter.frequency.value = 1000;
    midFilter.Q.value = 0.5;

    var highFilter = audioCtx.createBiquadFilter();
    highFilter.type = 'highpass';
    highFilter.frequency.value = 2000;

    // Compressor per band
    var bands = {};
    var bandNames = ['low', 'mid', 'high'];
    var filters = [lowFilter, midFilter, highFilter];

    var merger = audioCtx.createGain();
    var analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    merger.connect(analyser);
    analyser.connect(audioCtx.destination);

    for (var i = 0; i < 3; i++) {
      var name = bandNames[i];
      var s = bandSettings[name] || { threshold: -10, ratio: 2 };
      var comp = audioCtx.createDynamicsCompressor();
      comp.threshold.value = s.threshold;
      comp.ratio.value = s.ratio;
      comp.attack.value = 0.01;
      comp.release.value = 0.1;

      var gain = audioCtx.createGain();
      gain.gain.value = 1;

      input.connect(filters[i]);
      filters[i].connect(comp);
      comp.connect(gain);
      gain.connect(merger);

      bands[name] = { filter: filters[i], compressor: comp, gain: gain };
    }

    return { input: input, bands: bands, analyser: analyser, merger: merger };
  }

  // ─── Sidechain ───
  var sidechainState = {
    kickBuffer: null,
    bassBuffer: null,
    kickSource: null,
    bassSource: null,
    bassGain: null,
    kickAnalyser: null,
    analyser: null,
    settings: { depth: 0, attack: 0.01, release: 0.15 },
    active: false,
    rafId: null
  };

  function createSidechainChain(settings) {
    var audioCtx = getContext();

    var kickBuffer = generateDrums(audioCtx, 4);
    var bassBuffer = generateBass(audioCtx, 4);

    var kickAnalyser = audioCtx.createAnalyser();
    kickAnalyser.fftSize = 256;

    var bassGain = audioCtx.createGain();
    bassGain.gain.value = 1;

    var kickGain = audioCtx.createGain();
    kickGain.gain.value = 0.7;

    var analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;

    var merger = audioCtx.createGain();

    kickGain.connect(kickAnalyser);
    kickAnalyser.connect(merger);
    bassGain.connect(merger);
    merger.connect(analyser);
    analyser.connect(audioCtx.destination);

    sidechainState.kickBuffer = kickBuffer;
    sidechainState.bassBuffer = bassBuffer;
    sidechainState.bassGain = bassGain;
    sidechainState.kickAnalyser = kickAnalyser;
    sidechainState.analyser = analyser;
    sidechainState.settings = settings || { depth: 0, attack: 0.01, release: 0.15 };
    sidechainState.kickGain = kickGain;

    return {
      kickGain: kickGain,
      bassGain: bassGain,
      kickAnalyser: kickAnalyser,
      analyser: analyser
    };
  }

  function updateSidechainLoop() {
    if (!sidechainState.active) return;
    var analyser = sidechainState.kickAnalyser;
    if (!analyser) return;

    var data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);

    // Calculate RMS
    var sum = 0;
    for (var i = 0; i < data.length; i++) {
      var val = (data[i] - 128) / 128;
      sum += val * val;
    }
    var rms = Math.sqrt(sum / data.length);

    var s = sidechainState.settings;
    var threshold = 0.15;
    var audioCtx = getContext();

    if (rms > threshold && s.depth > 0) {
      var reduction = Math.pow(10, -s.depth / 20);
      sidechainState.bassGain.gain.setTargetAtTime(reduction, audioCtx.currentTime, s.attack);
    } else {
      sidechainState.bassGain.gain.setTargetAtTime(1.0, audioCtx.currentTime, s.release);
    }

    sidechainState.rafId = requestAnimationFrame(updateSidechainLoop);
  }

  // ─── Playback Control ───
  function stop() {
    if (currentSource) {
      try { currentSource.stop(); } catch(e) {}
      currentSource = null;
    }
    if (sidechainState.kickSource) {
      try { sidechainState.kickSource.stop(); } catch(e) {}
      sidechainState.kickSource = null;
    }
    if (sidechainState.bassSource) {
      try { sidechainState.bassSource.stop(); } catch(e) {}
      sidechainState.bassSource = null;
    }
    sidechainState.active = false;
    if (sidechainState.rafId) {
      cancelAnimationFrame(sidechainState.rafId);
      sidechainState.rafId = null;
    }
    isPlaying = false;
  }

  function play(sourceType, chain) {
    stop();
    var audioCtx = getContext();
    var buffer = getBuffer(sourceType);
    var source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(chain.input);
    source.start();
    currentSource = source;
    isPlaying = true;
    return source;
  }

  function playSidechain() {
    stop();
    var audioCtx = getContext();

    var kickSource = audioCtx.createBufferSource();
    kickSource.buffer = sidechainState.kickBuffer;
    kickSource.loop = true;
    kickSource.connect(sidechainState.kickGain);
    kickSource.start();

    var bassSource = audioCtx.createBufferSource();
    bassSource.buffer = sidechainState.bassBuffer;
    bassSource.loop = true;
    bassSource.connect(sidechainState.bassGain);
    bassSource.start();

    sidechainState.kickSource = kickSource;
    sidechainState.bassSource = bassSource;
    sidechainState.active = true;
    isPlaying = true;

    updateSidechainLoop();
  }

  function updateCompressor(chain, settings) {
    if (!chain || !chain.compressor) return;
    var c = chain.compressor;
    var audioCtx = getContext();
    var t = audioCtx.currentTime;
    if (settings.threshold !== undefined) c.threshold.setValueAtTime(settings.threshold, t);
    if (settings.ratio !== undefined) c.ratio.setValueAtTime(settings.ratio, t);
    if (settings.attack !== undefined) c.attack.setValueAtTime(settings.attack, t);
    if (settings.release !== undefined) c.release.setValueAtTime(settings.release, t);
    if (settings.knee !== undefined) c.knee.setValueAtTime(settings.knee, t);
  }

  function updateMultibandSettings(mbChain, bandSettings) {
    if (!mbChain || !mbChain.bands) return;
    var audioCtx = getContext();
    var t = audioCtx.currentTime;
    ['low', 'mid', 'high'].forEach(function(name) {
      if (bandSettings[name] && mbChain.bands[name]) {
        var comp = mbChain.bands[name].compressor;
        var s = bandSettings[name];
        if (s.threshold !== undefined) comp.threshold.setValueAtTime(s.threshold, t);
        if (s.ratio !== undefined) comp.ratio.setValueAtTime(s.ratio, t);
      }
    });
  }

  function updateSidechainSettings(settings) {
    sidechainState.settings = settings;
  }

  function getReduction(chain) {
    if (!chain || !chain.compressor) return 0;
    return chain.compressor.reduction;
  }

  function getMultibandReduction(mbChain) {
    if (!mbChain || !mbChain.bands) return { low: 0, mid: 0, high: 0 };
    return {
      low: mbChain.bands.low.compressor.reduction,
      mid: mbChain.bands.mid.compressor.reduction,
      high: mbChain.bands.high.compressor.reduction
    };
  }

  function getAnalyserData(analyser) {
    if (!analyser) return null;
    var data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    return data;
  }

  function preloadAll() {
    var audioCtx = getContext();
    var types = ['drums', 'bass', 'vocal', 'mix', 'piano'];
    types.forEach(function(type) { getBuffer(type); });
  }

  return {
    getContext: getContext,
    getBuffer: getBuffer,
    createCompressorChain: createCompressorChain,
    createBypassChain: createBypassChain,
    createMultibandChain: createMultibandChain,
    createSidechainChain: createSidechainChain,
    play: play,
    playSidechain: playSidechain,
    stop: stop,
    updateCompressor: updateCompressor,
    updateMultibandSettings: updateMultibandSettings,
    updateSidechainSettings: updateSidechainSettings,
    getReduction: getReduction,
    getMultibandReduction: getMultibandReduction,
    getAnalyserData: getAnalyserData,
    preloadAll: preloadAll,
    isPlaying: function() { return isPlaying; },
    chains: chains,
    sidechainState: sidechainState
  };
})();
