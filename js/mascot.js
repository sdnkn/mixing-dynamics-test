// Mascot System — SVG character with state machine and dialogue
var Mascot = (function() {
  var el, bodyEl, bubbleEl, textEl, minimizeBtn;
  var currentState = 'idle';
  var bubbleTimeout = null;
  var isMinimized = false;
  var isHidden = true;

  var svgStates = {
    idle: '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="30" cy="35" rx="18" ry="14" fill="#c9a96e" opacity="0.9"/>' +
      '<ellipse cx="30" cy="35" rx="16" ry="12" fill="#d4b87a"/>' +
      '<circle cx="24" cy="32" r="3" fill="#fff"/><circle cx="24" cy="32" r="1.5" fill="#050505"/>' +
      '<circle cx="36" cy="32" r="3" fill="#fff"/><circle cx="36" cy="32" r="1.5" fill="#050505"/>' +
      '<path d="M25 39 Q30 43 35 39" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M8 30 Q6 25 10 28" stroke="#d4b87a" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M52 30 Q54 25 50 28" stroke="#d4b87a" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M20 20 Q22 12 26 16" stroke="#c9a96e" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M40 20 Q38 12 34 16" stroke="#c9a96e" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '</svg>',

    pointing: '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="30" cy="35" rx="18" ry="14" fill="#c9a96e" opacity="0.9"/>' +
      '<ellipse cx="30" cy="35" rx="16" ry="12" fill="#d4b87a"/>' +
      '<circle cx="24" cy="32" r="3" fill="#fff"/><circle cx="23" cy="32" r="1.5" fill="#050505"/>' +
      '<circle cx="36" cy="32" r="3" fill="#fff"/><circle cx="35" cy="32" r="1.5" fill="#050505"/>' +
      '<path d="M25 39 Q30 42 35 39" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M8 30 Q-2 20 -5 22" stroke="#d4b87a" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      '<circle cx="-6" cy="21" r="2" fill="#c9a96e"/>' +
      '<path d="M52 30 Q54 25 50 28" stroke="#d4b87a" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '</svg>',

    speaking: '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="30" cy="35" rx="18" ry="14" fill="#c9a96e" opacity="0.9"/>' +
      '<ellipse cx="30" cy="35" rx="16" ry="12" fill="#d4b87a"/>' +
      '<circle cx="24" cy="32" r="3" fill="#fff"/><circle cx="24" cy="32" r="1.5" fill="#050505"/>' +
      '<circle cx="36" cy="32" r="3" fill="#fff"/><circle cx="36" cy="32" r="1.5" fill="#050505"/>' +
      '<ellipse cx="30" cy="40" rx="4" ry="3" fill="#b8955a"/>' +
      '<path d="M8 30 Q6 25 10 28" stroke="#d4b87a" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M52 30 Q54 25 50 28" stroke="#d4b87a" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '</svg>',

    celebrating: '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="30" cy="35" rx="18" ry="14" fill="#c9a96e" opacity="0.9"/>' +
      '<ellipse cx="30" cy="35" rx="16" ry="12" fill="#d4b87a"/>' +
      '<circle cx="24" cy="31" r="3.5" fill="#fff"/><circle cx="24" cy="31" r="1.5" fill="#050505"/>' +
      '<circle cx="36" cy="31" r="3.5" fill="#fff"/><circle cx="36" cy="31" r="1.5" fill="#050505"/>' +
      '<path d="M23 39 Q30 45 37 39" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M8 30 Q2 15 6 18" stroke="#d4b87a" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M52 30 Q58 15 54 18" stroke="#d4b87a" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      '<circle cx="5" cy="17" r="2" fill="#c9a96e"/><circle cx="55" cy="17" r="2" fill="#c9a96e"/>' +
      '</svg>',

    sad: '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="30" cy="37" rx="18" ry="12" fill="#c9a96e" opacity="0.9"/>' +
      '<ellipse cx="30" cy="37" rx="16" ry="10" fill="#d4b87a"/>' +
      '<circle cx="24" cy="35" r="2.5" fill="#fff"/><circle cx="24" cy="36" r="1.5" fill="#050505"/>' +
      '<circle cx="36" cy="35" r="2.5" fill="#fff"/><circle cx="36" cy="36" r="1.5" fill="#050505"/>' +
      '<path d="M25 42 Q30 39 35 42" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M10 34 Q8 36 12 35" stroke="#d4b87a" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M50 34 Q52 36 48 35" stroke="#d4b87a" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '</svg>'
  };

  function init() {
    el = document.getElementById('mascot');
    bodyEl = document.getElementById('mascot-body');
    bubbleEl = document.getElementById('mascot-bubble');
    textEl = document.getElementById('mascot-text');
    minimizeBtn = document.getElementById('mascot-minimize');

    if (!el) return;

    minimizeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleMinimize();
    });

    bodyEl.addEventListener('click', function() {
      if (isMinimized) toggleMinimize();
    });

    setState('idle');
  }

  function show() {
    if (!el) return;
    el.hidden = false;
    isHidden = false;
  }

  function hide() {
    if (!el) return;
    el.hidden = true;
    isHidden = true;
  }

  function setState(state) {
    if (!bodyEl) return;
    currentState = state;
    bodyEl.innerHTML = svgStates[state] || svgStates.idle;
    el.className = 'mascot state-' + state;
    if (isMinimized) el.classList.add('minimized');
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
    if (isMinimized) {
      el.classList.add('minimized');
      hideBubble();
    } else {
      el.classList.remove('minimized');
    }
  }

  function showBubble(text, duration) {
    if (!bubbleEl || !textEl || isMinimized) return;
    textEl.textContent = text;
    bubbleEl.hidden = false;
    if (bubbleTimeout) clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(function() { hideBubble(); }, duration || 4000);
  }

  function hideBubble() {
    if (bubbleEl) bubbleEl.hidden = true;
    if (bubbleTimeout) { clearTimeout(bubbleTimeout); bubbleTimeout = null; }
  }

  function getDialogue(event) {
    var lines = MASCOT_DIALOGUE[event];
    if (!lines || lines.length === 0) return null;
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function trigger(event, options) {
    if (isHidden || isMinimized) return;

    var stateMap = {
      test_start: 'speaking',
      question_theory: 'pointing',
      question_audio: 'pointing',
      question_interactive: 'pointing',
      question_multiband: 'pointing',
      question_sidechain: 'pointing',
      question_chain: 'pointing',
      question_diagnostic: 'pointing',
      correct_answer: 'celebrating',
      wrong_answer: 'sad',
      halfway: 'speaking',
      almost_done: 'speaking',
      idle_hint: 'idle',
      results_pro: 'celebrating',
      results_advanced: 'celebrating',
      results_intermediate: 'speaking',
      results_beginner: 'speaking',
      results_newbie: 'sad'
    };

    var state = stateMap[event] || 'speaking';
    setState(state);

    var line = getDialogue(event);
    if (line) showBubble(line, options && options.duration || 4000);

    if (state === 'celebrating' || state === 'sad') {
      setTimeout(function() {
        if (currentState === state) setState('idle');
      }, 2500);
    }
  }

  function moveTo(targetSelector) {
    if (!el || isMinimized) return;
    var target = document.querySelector(targetSelector);
    if (!target) return;
    var rect = target.getBoundingClientRect();
    el.style.position = 'fixed';
    el.style.bottom = 'auto';
    el.style.right = 'auto';
    el.style.left = Math.max(0, rect.left - 70) + 'px';
    el.style.top = Math.max(0, rect.top + rect.height / 2 - 30) + 'px';
  }

  function resetPosition() {
    if (!el) return;
    el.style.position = 'fixed';
    el.style.left = 'auto';
    el.style.top = 'auto';
    el.style.bottom = '20px';
    el.style.right = '20px';
  }

  return {
    init: init,
    show: show,
    hide: hide,
    trigger: trigger,
    moveTo: moveTo,
    resetPosition: resetPosition,
    setState: setState,
    showBubble: showBubble,
    hideBubble: hideBubble
  };
})();
