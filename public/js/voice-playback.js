(function () {
  'use strict';

  let activeAudio = null;
  let activeUrl = null;

  function showText(button, text) {
    if (!button || !text) return;
    let bubble = button.nextElementSibling;
    if (!bubble?.classList.contains('voice-fallback-bubble')) {
      bubble = document.createElement('p');
      bubble.className = 'voice-fallback-bubble';
      bubble.setAttribute('role', 'status');
      button.insertAdjacentElement('afterend', bubble);
    }
    bubble.textContent = text;
  }

  async function fetchAndPlayPhrase(phraseKey, button, fallbackText = '', options = {}) {
    if (activeAudio) activeAudio.pause();
    if (activeUrl) URL.revokeObjectURL(activeUrl);
    activeAudio = null;
    activeUrl = null;

    try {
      const response = await fetch(`/api/voice/phrase/${encodeURIComponent(phraseKey)}`, { credentials: 'same-origin' });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        showText(button, options.suppressPhraseText ? fallbackText || 'Voice cue is not available yet.' : result.text || fallbackText || 'Audio is not available yet.');
        return false;
      }
      const blob = await response.blob();
      activeUrl = URL.createObjectURL(blob);
      activeAudio = new Audio(activeUrl);
      activeAudio.addEventListener('ended', () => {
        if (activeUrl) URL.revokeObjectURL(activeUrl);
        activeUrl = null;
        activeAudio = null;
      }, { once: true });
      await activeAudio.play();
      const bubble = button?.nextElementSibling;
      if (bubble?.classList.contains('voice-fallback-bubble')) bubble.remove();
      return true;
    } catch {
      showText(button, fallbackText || 'Audio could not be played.');
      return false;
    }
  }

  window.ReMindVoice = Object.freeze({ fetchAndPlayPhrase });
})();