(function () {
  'use strict';

  const maxSeconds = 120;
  const panel = document.getElementById('audio-recorder-panel');
  const beginButton = document.getElementById('record-begin');
  const stopButton = document.getElementById('record-stop');
  const cancelButton = document.getElementById('record-cancel');
  if (!panel || !beginButton || !stopButton || !cancelButton) return;

  const progress = document.getElementById('record-progress');
  const timeLabel = document.getElementById('record-time');
  const status = document.getElementById('recorder-status');
  let activeCapture = null;
  let requestId = 0;

  function updateClock(elapsed) {
    progress.value = elapsed;
    const minutes = Math.floor(elapsed / 60);
    const seconds = String(elapsed % 60).padStart(2, '0');
    timeLabel.textContent = `${minutes}:${seconds} / 2:00`;
  }

  async function uploadRecording(blob) {
    status.textContent = 'Saving your voice sample…';
    const body = new FormData();
    body.append('audio', blob, 'voice-sample.webm');
    try {
      const response = await fetch('/api/audio/upload', { method: 'POST', body, credentials: 'same-origin' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'The recording could not be saved.');
      const session = await window.ReMind.fetchSession();
      const nickname = session.audioNickname || 'your close one';
      status.textContent = `Preparing ${nickname}'s voice...`;
      const generationResponse = await fetch('/api/voice/clone-and-generate', { method: 'POST', credentials: 'same-origin' });
      const generation = await generationResponse.json().catch(() => ({}));
      if (!generationResponse.ok) throw new Error(generation.error || 'Voice preparation could not finish.');
      status.textContent = `Ready. ${nickname}'s voice phrases are prepared.`;
      window.dispatchEvent(new CustomEvent('remind:audio-uploaded', { detail: { ...result.audioRecording, voiceGeneration: generation } }));
    } catch (error) {
      status.textContent = error.message.includes('could not be saved')
        ? error.message
        : 'Voice preparation could not finish. Phrase playback will show text until audio is ready.';
      window.dispatchEvent(new CustomEvent('remind:audio-uploaded', { detail: { voiceGeneration: { status: 'failed', error: error.message } } }));
      window.ReMind.showToast(error.message);
    }
  }

  function finishCapture(capture) {
    window.clearInterval(capture.timer);
    capture.stream.getTracks().forEach((track) => track.stop());
    if (activeCapture !== capture) return;
    activeCapture = null;
    stopButton.disabled = true;
    beginButton.disabled = false;
  }

  beginButton.addEventListener('click', async () => {
    if (activeCapture) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      window.ReMind.showToast('Audio recording is not supported in this browser.');
      return;
    }
    const currentRequestId = ++requestId;
    beginButton.disabled = true;
    status.textContent = 'Allow microphone access to record a voice sample.';
    let acquiredStream;
    try {
      acquiredStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (currentRequestId !== requestId) {
        acquiredStream.getTracks().forEach((track) => track.stop());
        return;
      }
      const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = preferredType ? new MediaRecorder(acquiredStream, { mimeType: preferredType }) : new MediaRecorder(acquiredStream);
      const capture = { recorder, stream: acquiredStream, chunks: [], elapsed: 0, timer: null, upload: true };
      activeCapture = capture;
      updateClock(capture.elapsed);
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size) capture.chunks.push(event.data);
      });
      recorder.addEventListener('stop', () => {
        const blob = new Blob(capture.chunks, { type: recorder.mimeType || 'audio/webm' });
        finishCapture(capture);
        if (capture.upload && blob.size) uploadRecording(blob);
      }, { once: true });
      recorder.start();
      stopButton.disabled = false;
      status.textContent = 'Recording. You can stop at any time.';
      capture.timer = window.setInterval(() => {
        capture.elapsed += 1;
        updateClock(capture.elapsed);
        if (capture.elapsed >= maxSeconds && recorder.state === 'recording') recorder.stop();
      }, 1000);
    } catch (error) {
      if (acquiredStream) acquiredStream.getTracks().forEach((track) => track.stop());
      if (currentRequestId === requestId) {
        beginButton.disabled = false;
        status.textContent = 'Microphone access was not available.';
        window.ReMind.showToast(error.name === 'NotAllowedError' ? 'Please allow microphone access to record.' : error.message);
      }
    }
  });

  stopButton.addEventListener('click', () => {
    if (activeCapture?.recorder.state === 'recording') activeCapture.recorder.stop();
  });

  cancelButton.addEventListener('click', () => {
    requestId += 1;
    const capture = activeCapture;
    if (capture) {
      capture.upload = false;
      if (capture.recorder.state === 'recording') capture.recorder.stop();
      capture.stream.getTracks().forEach((track) => track.stop());
    } else {
      beginButton.disabled = false;
    }
    panel.hidden = true;
    stopButton.disabled = true;
    updateClock(0);
    status.textContent = 'Recording cancelled.';
  });
})();
