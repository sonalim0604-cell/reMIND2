(() => {
  'use strict';

  const pulse = document.querySelector('#pulse');
  const startStop = document.querySelector('#start-stop');
  const tempoToggle = document.querySelector('#tempo-toggle');
  const tapButton = document.querySelector('#tap-button');
  const message = document.querySelector('#rhythm-message');
  let playing = false;
  let mediumTempo = false;
  let timer = null;
  let tapFeedbackTimer = null;
  let audioContext = null;

  function beatLength() {
    return mediumTempo ? 900 : 1200;
  }

  function clickSound() {
    if (!audioContext || audioContext.state !== 'running') return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = 520;
    gain.gain.setValueAtTime(0.07, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.07);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.08);
  }

  function beat() {
    clickSound();
    pulse.classList.add('tapped');
    window.setTimeout(() => pulse.classList.remove('tapped'), 150);
  }

  function startBeats() {
    window.clearInterval(timer);
    if (!playing) return;
    beat();
    timer = window.setInterval(beat, beatLength());
  }

  async function start() {
    playing = true;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioContext ||= new AudioContextClass();
        if (audioContext.state === 'suspended') await audioContext.resume();
      }
    } catch {
      // The visual pulse still works when browser audio is unavailable.
    }
    if (!playing) return;
    pulse.classList.add('playing');
    pulse.style.animationDuration = `${beatLength()}ms`;
    startStop.textContent = 'Stop';
    tapButton.disabled = false;
    message.textContent = 'Follow along whenever you like.';
    startBeats();
  }

  function stop() {
    playing = false;
    window.clearInterval(timer);
    timer = null;
    pulse.classList.remove('playing', 'tapped');
    startStop.textContent = 'Start';
    tapButton.disabled = true;
    message.textContent = 'Take a break whenever you like.';
    if (audioContext && audioContext.state === 'running') audioContext.suspend();
  }

  startStop.addEventListener('click', () => {
    if (playing) stop();
    else start();
  });

  tempoToggle.addEventListener('click', () => {
    mediumTempo = !mediumTempo;
    tempoToggle.textContent = `Tempo: ${mediumTempo ? 'Medium' : 'Slow'}`;
    tempoToggle.setAttribute('aria-pressed', String(mediumTempo));
    pulse.style.animationDuration = `${beatLength()}ms`;
    if (playing) startBeats();
  });

  tapButton.addEventListener('click', () => {
    clickSound();
    window.clearTimeout(tapFeedbackTimer);
    pulse.classList.remove('tap-response');
    void pulse.offsetWidth;
    pulse.classList.add('tap-response');
    message.textContent = 'Lovely. Keep going at your own pace.';
    tapFeedbackTimer = window.setTimeout(() => pulse.classList.remove('tap-response'), 500);
  });

  window.addEventListener('pagehide', stop);
})();
