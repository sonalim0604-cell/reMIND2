(function () {
  'use strict';

  const topics = [
    { id: 'daily-reminders', title: 'Daily reminders', icon: 'clockCalendar', placeholder: 'e.g. Call Maya after breakfast' },
    { id: 'medication-reminder', title: 'Medication reminder', icon: 'pill', placeholder: 'e.g. 3pm — blood pressure tablet' },
    { id: 'specific-tasks', title: 'Specific tasks', icon: 'checklist', placeholder: 'e.g. Water the balcony plants each morning' },
    { id: 'exercise', title: 'Exercise', icon: 'exercise', placeholder: 'e.g. 15 minute walk after breakfast' },
    { id: 'nostalgic-songs', title: 'Nostalgic Songs', icon: 'music', placeholder: 'e.g. old Hindi film songs from the 1970s' },
    { id: 'little-learnings', title: 'Little Learnings', icon: 'learning', placeholder: 'e.g. Share a new word or short nature fact' }
  ];
  const form = document.getElementById('edit-helping-points-form');
  const grid = document.getElementById('topic-grid');
  const notesList = document.getElementById('topic-note-list');
  if (!form || !grid || !notesList) return;

  let selectedIds = [];
  let notes = {};

  function captureVisibleNotes() {
    for (const field of notesList.querySelectorAll('textarea[name]')) notes[field.name] = field.value;
  }

  function renderNotes() {
    notesList.replaceChildren();
    topics.filter((topic) => selectedIds.includes(topic.id)).forEach((topic) => {
      const section = document.createElement('section');
      section.className = 'topic-note';
      const heading = document.createElement('div');
      heading.className = 'topic-note-heading';
      const icon = document.createElement('span');
      icon.className = 'topic-note-icon';
      icon.innerHTML = window.ReMind.icons[topic.icon]();
      const title = document.createElement('h2');
      title.textContent = topic.title;
      heading.append(icon, title);
      const label = document.createElement('label');
      label.htmlFor = `note-${topic.id}`;
      label.textContent = `A note about ${topic.title.toLowerCase()} (optional)`;
      const input = document.createElement('textarea');
      input.id = label.htmlFor;
      input.name = topic.id;
      input.rows = 3;
      input.placeholder = topic.placeholder;
      input.value = notes[topic.id] || '';
      input.addEventListener('input', () => { notes[topic.id] = input.value; });
      section.append(heading, label, input);
      notesList.append(section);
    });
  }

  function renderCards() {
    grid.replaceChildren();
    topics.forEach((topic) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'topic-card';
      button.dataset.topicId = topic.id;
      button.setAttribute('aria-pressed', String(selectedIds.includes(topic.id)));
      button.innerHTML = `<span class="topic-icon">${window.ReMind.icons[topic.icon]()}</span><span>${topic.title}</span>`;
      button.addEventListener('click', () => {
        captureVisibleNotes();
        selectedIds = selectedIds.includes(topic.id)
          ? selectedIds.filter((id) => id !== topic.id)
          : [...selectedIds, topic.id];
        button.setAttribute('aria-pressed', String(selectedIds.includes(topic.id)));
        if (!selectedIds.includes(topic.id)) delete notes[topic.id];
        renderNotes();
      });
      grid.append(button);
    });
  }

  window.ReMind.fetchSession().then((data) => {
    selectedIds = Array.isArray(data.selectedTopics) ? [...data.selectedTopics] : [];
    notes = { ...(data.topicNotes || {}) };
    renderCards();
    renderNotes();
  }).catch((error) => window.ReMind.showToast(error.message));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    for (const field of notesList.querySelectorAll('textarea[name]')) notes[field.name] = field.value.trim();
    const topicNotes = Object.fromEntries(Object.entries(notes).filter(([id]) => selectedIds.includes(id)));
    try {
      await window.ReMind.saveRegistration({ selectedTopics: selectedIds, topicNotes });
      window.ReMind.navigate('/home.html');
    } catch (error) {
      window.ReMind.showToast(error.message);
    }
  });
})();
