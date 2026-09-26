(function () {
  'use strict';

  const topicCatalog = [
    { id: 'daily-reminders', title: 'Daily reminders', icon: 'clockCalendar' },
    { id: 'medication-reminder', title: 'Medication reminder', icon: 'pill' },
    { id: 'specific-tasks', title: 'Specific tasks', icon: 'checklist' },
    { id: 'exercise', title: 'Exercise', icon: 'exercise' },
    { id: 'nostalgic-songs', title: 'Nostalgic Songs', icon: 'music' },
    { id: 'little-learnings', title: 'Little Learnings', icon: 'learning' }
  ];

  const list = document.getElementById('helping-points-list');
  const audioSection = document.getElementById('audio-section');
  const audioMessage = document.getElementById('audio-message');
  if (!list || !audioSection) return;

  function renderTopics(data) {
    list.replaceChildren();
    const selected = topicCatalog.filter((topic) => (data.selectedTopics || []).includes(topic.id));
    if (selected.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-selection';
      empty.textContent = 'No helping points are selected yet.';
      list.append(empty);
      return;
    }

    selected.forEach((topic) => {
      const card = document.createElement('article');
      card.className = 'topic-overview-card';
      const icon = document.createElement('span');
      icon.className = 'topic-overview-icon';
      icon.innerHTML = window.ReMind.icons[topic.icon]();
      const copy = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = topic.title;
      const note = document.createElement('p');
      note.textContent = data.topicNotes?.[topic.id] || 'No note added yet';
      copy.append(title, note);
      const edit = document.createElement('a');
      edit.className = 'button button-secondary';
      edit.href = '/edit-helping-points.html';
      edit.textContent = 'Edit';
      card.append(icon, copy, edit);
      list.append(card);
    });
  }

  function renderAudio(data) {
    audioSection.hidden = data.audioConsent !== true;
    if (audioSection.hidden) return;
    document.getElementById('audio-symbol').innerHTML = window.ReMind.icons.speaker();
    const nickname = data.audioNickname || 'your close one';
    const generationStatus = document.getElementById('voice-generation-status');
    const voiceState = data.voiceGeneration?.status || 'not-started';
    generationStatus.textContent = voiceState === 'ready'
      ? 'Voice generation: Ready'
      : ['preparing', 'generating'].includes(voiceState)
        ? 'Voice generation: Preparing'
        : voiceState === 'failed'
          ? 'Voice generation: Preparing could not complete; text fallback is available.'
          : 'Voice generation: Preparing';
    const hasRecording = Boolean(data.audioRecording?.exists || data.audioRecording?.filename);
    audioMessage.textContent = hasRecording
      ? `Voice sample saved for ${nickname}. You can record a new one at any time.`
      : `No voice sample yet for ${nickname}.`;
    document.getElementById('record-start').textContent = hasRecording ? 'Record again' : 'Record';
    document.getElementById('record-start').setAttribute('aria-label', hasRecording ? `Record a new voice sample for ${nickname}` : `Record a voice sample for ${nickname}`);
    if (hasRecording) audioMessage.classList.add('recording-label');
    else audioMessage.classList.remove('recording-label');
  }

  document.querySelectorAll('.app-link[data-icon]').forEach((link) => {
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = window.ReMind.icons[link.dataset.icon]();
    link.prepend(icon);
  });

  document.getElementById('record-start').addEventListener('click', () => {
    const panel = document.getElementById('audio-recorder-panel');
    panel.hidden = false;
    document.getElementById('record-begin').focus();
  });

  window.addEventListener('remind:audio-uploaded', () => {
    window.ReMind.fetchSession().then((data) => renderAudio(data)).catch((error) => window.ReMind.showToast(error.message));
    document.getElementById('audio-recorder-panel').hidden = true;
    window.ReMind.showToast('Voice sample saved.');
  });

  window.ReMind.fetchSession().then((data) => {
    const name = data.patient?.fullName?.trim();
    if (name) document.getElementById('welcome-heading').textContent = `Hello, ${name}`;
    renderTopics(data);
    renderAudio(data);
  }).catch((error) => window.ReMind.showToast(error.message));
})();
