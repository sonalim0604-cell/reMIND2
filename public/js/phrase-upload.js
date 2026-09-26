(function () {
  'use strict';

  const list = document.getElementById('phrase-upload-list');
  if (!list) return;

  async function loadPhrases() {
    const response = await fetch('/api/voice/phrases', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Reminder phrases could not be loaded.');
    const phrases = await response.json();
    list.replaceChildren();
    phrases.forEach(({ key, text }) => {
      const row = document.createElement('form');
      row.className = 'phrase-upload-row';
      const copy = document.createElement('div');
      const title = document.createElement('h2');
      title.textContent = key;
      const phrase = document.createElement('p');
      phrase.textContent = text;
      copy.append(title, phrase);
      const fileLabel = document.createElement('label');
      fileLabel.textContent = 'Audio clip';
      const file = document.createElement('input');
      file.type = 'file';
      file.name = 'audio';
      file.accept = 'audio/mpeg,.mp3';
      file.required = true;
      fileLabel.append(file);
      const submit = document.createElement('button');
      submit.className = 'button button-secondary';
      submit.type = 'submit';
      submit.textContent = 'Upload clip';
      const status = document.createElement('p');
      status.className = 'status-text phrase-upload-status';
      status.setAttribute('role', 'status');
      row.append(copy, fileLabel, submit, status);
      row.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!row.reportValidity()) return;
        submit.disabled = true;
        status.textContent = 'Uploading…';
        const body = new FormData();
        body.append('audio', file.files[0]);
        try {
          const upload = await fetch(`/api/voice/phrase/${encodeURIComponent(key)}`, { method: 'POST', body, credentials: 'same-origin' });
          const result = await upload.json().catch(() => ({}));
          if (!upload.ok) throw new Error(result.error || 'The clip could not be saved.');
          status.textContent = 'Saved for this session.';
          row.reset();
        } catch (error) {
          status.textContent = error.message;
        } finally {
          submit.disabled = false;
        }
      });
      list.append(row);
    });
  }

  loadPhrases().catch((error) => window.ReMind.showToast(error.message));
})();