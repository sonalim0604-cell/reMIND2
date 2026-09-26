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

  const form = document.getElementById('topic-details-form');
  const list = document.getElementById('topic-note-list');
  const submitButton = document.getElementById('finish-registration');
  if (!form || !list) return;

  let selectedTopics = [];

  function renderNotes(notes) {
    list.replaceChildren();
    const selected = topics.filter((topic) => selectedTopics.includes(topic.id));
    if (selected.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-selection';
      empty.textContent = 'No topics selected. You can complete registration now and choose helping points later.';
      list.append(empty);
      return;
    }

    selected.forEach((topic) => {
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
      const textarea = document.createElement('textarea');
      textarea.id = `note-${topic.id}`;
      textarea.name = topic.id;
      textarea.rows = 3;
      textarea.placeholder = topic.placeholder;
      textarea.value = notes[topic.id] || '';
      section.append(heading, label, textarea);
      list.append(section);
    });
  }

  async function hydrate() {
    try {
      const data = await window.ReMind.fetchSession();
      selectedTopics = Array.isArray(data.selectedTopics) ? data.selectedTopics : [];
      renderNotes(data.topicNotes || {});
    } catch (error) {
      renderNotes({});
      window.ReMind.showToast(error.message);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    const topicNotes = Object.fromEntries(
      [...list.querySelectorAll('textarea[name]')]
        .map((field) => [field.name, field.value.trim()])
    );

    try {
      const existing = await window.ReMind.fetchSession();
      await window.ReMind.saveRegistration({
        ...existing,
        selectedTopics,
        topicNotes,
        completedAt: new Date().toISOString()
      });
      window.ReMind.navigate('/home.html');
    } catch (error) {
      window.ReMind.showToast(error.message);
      submitButton.disabled = false;
    }
  });

  hydrate();
})();
