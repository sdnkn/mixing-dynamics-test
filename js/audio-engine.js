// Audio Engine — fully powered by Tone.js
var AudioEngine = (function() {
  var _isPlaying = false;
  var currentPlayer = null;
  var bufferCache = {};

  var sidechainState = {
    kickPlayer: null, bassPlayer: null,
    kickGain: null, bassGain: null,
    kickWaveform: null, waveform: null,
    mixer: null, kickMeter: null,
    settings: { depth: 0, attack: 0.01, release: 0.15 },
    active: false, rafId: null
  };

  async function init() {
    await Tone.start();
  }

  // ─── Audio File Manifest ───
  var AUDIO_MANIFEST = {
    drums: 'audio/drums-bakpack.mp3',
    bass: 'audio/bass-dm.mp3',
    vocal: 'audio/vox/letgo-lead.mp3',
    synth: 'audio/synth-bloom.mp3',
    mix: 'audio/ukg-133.mp3'
  };

  // ─── Preload (async — loads audio files) ───
  async function preloadAll(onProgress) {
    var keys = Object.keys(AUDIO_MANIFEST);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (onProgress) onProgress(key, (i / keys.length) * 100);
      try {
        var buf = new Tone.Buffer(AUDIO_MANIFEST[key]);
        await buf.loaded;
        bufferCache[key] = buf;
      } catch(e) {
        console.error('Failed to load audio:', key, AUDIO_MANIFEST[key], e);
      }
    }
    if (onProgress) onProgress('done', 100);
  }

  // ─── Processing Chains (Tone.js nodes) ───
  function createCompressorChain(settings) {
    var ratio = settings.ratio || 4;
    var comp = new Tone.Compressor({
      threshold: settings.threshold || -24,
      ratio: ratio,
      attack: settings.attack || 0.01,
      release: settings.release || 0.1,
      knee: settings.knee !== undefined ? settings.knee : ratioToKnee(ratio)
    });
    var makeup = new Tone.Gain(1);
    var waveform = new Tone.Waveform(1024);

    comp.connect(makeup);
    makeup.connect(waveform);
    makeup.toDestination();

    return { compressor: comp, makeup: makeup, analyser: waveform, input: comp };
  }

  function createBypassChain() {
    var gain = new Tone.Gain(1);
    var waveform = new Tone.Waveform(1024);
    gain.connect(waveform);
    gain.toDestination();
    return { gain: gain, analyser: waveform, input: gain };
  }

  function createMultibandChain(bandSettings) {
    var mb = new Tone.MultibandCompressor({
      low: {
        threshold: (bandSettings.low && bandSettings.low.threshold) || -10,
        ratio: (bandSettings.low && bandSettings.low.ratio) || 2,
        attack: 0.01, release: 0.1
      },
      mid: {
        threshold: (bandSettings.mid && bandSettings.mid.threshold) || -10,
        ratio: (bandSettings.mid && bandSettings.mid.ratio) || 2,
        attack: 0.01, release: 0.1
      },
      high: {
        threshold: (bandSettings.high && bandSettings.high.threshold) || -10,
        ratio: (bandSettings.high && bandSettings.high.ratio) || 2,
        attack: 0.01, release: 0.1
      },
      lowFrequency: 200,
      highFrequency: 2000
    });

    var waveform = new Tone.Waveform(1024);
    mb.connect(waveform);
    mb.toDestination();

    return {
      input: mb,
      bands: {
        low: { compressor: mb.low },
        mid: { compressor: mb.mid },
        high: { compressor: mb.high }
      },
      analyser: waveform,
      merger: mb
    };
  }

  function createSidechainChain(settings) {
    var kickGain = new Tone.Gain(0.7);
    var bassGain = new Tone.Gain(1);
    var mixer = new Tone.Gain(1);
    var kickWaveform = new Tone.Waveform(256);
    var waveform = new Tone.Waveform(1024);
    var kickMeter = new Tone.Meter();

    kickGain.connect(kickWaveform);
    kickGain.connect(kickMeter);
    kickGain.connect(mixer);
    bassGain.connect(mixer);
    mixer.connect(waveform);
    mixer.toDestination();

    sidechainState.kickGain = kickGain;
    sidechainState.bassGain = bassGain;
    sidechainState.kickWaveform = kickWaveform;
    sidechainState.waveform = waveform;
    sidechainState.kickMeter = kickMeter;
    sidechainState.mixer = mixer;
    sidechainState.settings = settings || { depth: 0, attack: 0.01, release: 0.15 };

    return {
      kickGain: kickGain, bassGain: bassGain,
      kickAnalyser: kickWaveform, analyser: waveform
    };
  }

  // ─── Playback via Tone.Player ───
  function play(sourceType, chain) {
    stop();
    var src = sourceType === 'sidechain_demo' ? 'mix' : sourceType;
    var buffer = bufferCache[src];
    if (!buffer || buffer.length === 0) {
      console.warn('Buffer not ready:', src);
      return;
    }

    var player = new Tone.Player(buffer);
    player.loop = true;
    player.connect(chain.input);
    player.start();
    currentPlayer = player;
    _isPlaying = true;
  }

  function playSidechain() {
    stop();
    var kickBuf = bufferCache.drums;
    var bassBuf = bufferCache.bass;
    if (!kickBuf || !bassBuf) return;

    var kickPlayer = new Tone.Player(kickBuf);
    kickPlayer.loop = true;
    kickPlayer.connect(sidechainState.kickGain);

    var bassPlayer = new Tone.Player(bassBuf);
    bassPlayer.loop = true;
    bassPlayer.connect(sidechainState.bassGain);

    kickPlayer.start();
    bassPlayer.start();

    sidechainState.kickPlayer = kickPlayer;
    sidechainState.bassPlayer = bassPlayer;
    sidechainState.active = true;
    _isPlaying = true;
    updateSidechainLoop();
  }

  function updateSidechainLoop() {
    if (!sidechainState.active) return;
    var meter = sidechainState.kickMeter;
    if (!meter) return;

    var level = meter.getValue();
    var s = sidechainState.settings;

    if (level > -20 && s.depth > 0) {
      var reduction = Math.pow(10, -s.depth / 20);
      sidechainState.bassGain.gain.rampTo(reduction, s.attack);
    } else {
      sidechainState.bassGain.gain.rampTo(1.0, s.release);
    }

    sidechainState.rafId = requestAnimationFrame(updateSidechainLoop);
  }

  function stop() {
    if (currentPlayer) {
      try { currentPlayer.stop(); } catch(e) {}
      try { currentPlayer.disconnect(); } catch(e) {}
      try { currentPlayer.dispose(); } catch(e) {}
      currentPlayer = null;
    }
    if (sidechainState.kickPlayer) {
      try { sidechainState.kickPlayer.stop(); } catch(e) {}
      try { sidechainState.kickPlayer.disconnect(); } catch(e) {}
      try { sidechainState.kickPlayer.dispose(); } catch(e) {}
      sidechainState.kickPlayer = null;
    }
    if (sidechainState.bassPlayer) {
      try { sidechainState.bassPlayer.stop(); } catch(e) {}
      try { sidechainState.bassPlayer.disconnect(); } catch(e) {}
      try { sidechainState.bassPlayer.dispose(); } catch(e) {}
      sidechainState.bassPlayer = null;
    }
    sidechainState.active = false;
    if (sidechainState.rafId) {
      cancelAnimationFrame(sidechainState.rafId);
      sidechainState.rafId = null;
    }
    _isPlaying = false;
  }

  // FET-style knee: soft at low ratio, hard at high
  function ratioToKnee(ratio) {
    if (ratio >= 20) return 0;
    if (ratio >= 12) return 6;
    if (ratio >= 8) return 12;
    return 20;
  }

  // ─── Parameter Updates ───
  function updateCompressor(chain, settings) {
    if (!chain || !chain.compressor) return;
    var c = chain.compressor;
    if (settings.threshold !== undefined) c.threshold.value = settings.threshold;
    if (settings.ratio !== undefined) {
      c.ratio.value = settings.ratio;
      c.knee.value = ratioToKnee(settings.ratio);
    }
    if (settings.attack !== undefined) c.attack.value = settings.attack;
    if (settings.release !== undefined) c.release.value = settings.release;
    if (settings.knee !== undefined) c.knee.value = settings.knee;
  }

  function updateMultibandSettings(mbChain, bandSettings) {
    if (!mbChain || !mbChain.bands) return;
    ['low', 'mid', 'high'].forEach(function(name) {
      if (bandSettings[name] && mbChain.bands[name]) {
        var comp = mbChain.bands[name].compressor;
        if (bandSettings[name].threshold !== undefined) comp.threshold.value = bandSettings[name].threshold;
        if (bandSettings[name].ratio !== undefined) comp.ratio.value = bandSettings[name].ratio;
      }
    });
  }

  function updateSidechainSettings(settings) {
    sidechainState.settings = settings;
  }

  // ─── Analysis ───
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

  function getAnalyserData(waveform) {
    if (!waveform) return null;
    // Tone.Waveform: Float32Array [-1, 1] → convert to Uint8Array [0, 255]
    if (waveform.getValue) {
      var values = waveform.getValue();
      var data = new Uint8Array(values.length);
      for (var i = 0; i < values.length; i++) {
        data[i] = Math.round((values[i] + 1) * 127.5);
      }
      return data;
    }
    // Fallback for native AnalyserNode
    var data = new Uint8Array(waveform.fftSize);
    waveform.getByteTimeDomainData(data);
    return data;
  }

  return {
    init: init,
    preloadAll: preloadAll,
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
    isPlaying: function() { return _isPlaying; }
  };
})();
