(function () {
  'use strict';

  const topics = [
    { id: 'daily-reminders', title: 'Daily reminders', icon: 'clockCalendar' },
    { id: 'medication-reminder', title: 'Medication reminder', icon: 'pill' },
    { id: 'specific-tasks', title: 'Specific tasks', icon: 'checklist' },
    { id: 'exercise', title: 'Exercise', icon: 'exercise' },
    { id: 'nostalgic-songs', title: 'Nostalgic Songs', icon: 'music' },
    { id: 'little-learnings', title: 'Little Learnings', icon: 'learning' }
  ];

  const grid = document.getElementById('topic-grid');
  const form = document.getElementById('topics-form');
  if (!grid || !form) return;

  function renderTopics(selectedIds) {
    grid.replaceChildren();
    topics.forEach((topic) => {
      const button = document.createElement('button');
      button.className = 'topic-card';
      button.type = 'button';
      button.dataset.topicId = topic.id;
      button.setAttribute('aria-pressed', String(selectedIds.includes(topic.id)));
      button.innerHTML = `<span class="topic-icon">${window.ReMind.icons[topic.icon]()}</span><span>${topic.title}</span>`;
      button.addEventListener('click', () => {
        const selected = button.getAttribute('aria-pressed') === 'true';
        button.setAttribute('aria-pressed', String(!selected));
      });
      grid.append(button);
    });
  }

  window.ReMind.fetchSession().then((data) => {
    renderTopics(Array.isArray(data.selectedTopics) ? data.selectedTopics : []);
  }).catch((error) => {
    renderTopics([]);
    window.ReMind.showToast(error.message);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const selectedTopics = [...grid.querySelectorAll('[data-topic-id][aria-pressed="true"]')]
      .map((button) => button.dataset.topicId);

    try {
      const existing = await window.ReMind.fetchSession();
      const topicNotes = Object.fromEntries(
        Object.entries(existing.topicNotes || {}).filter(([topicId]) => selectedTopics.includes(topicId))
      );
      await window.ReMind.saveRegistration({ selectedTopics, topicNotes });
      window.ReMind.navigate('/topic-details.html');
    } catch (error) {
      window.ReMind.showToast(error.message);
    }
  });
})();
