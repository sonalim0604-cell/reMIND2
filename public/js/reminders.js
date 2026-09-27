(function () {
  'use strict';

  const periods = ['morning', 'afternoon', 'night'];
  const formPanel = document.getElementById('reminder-form-panel');
  const list = document.getElementById('reminder-list');
  const form = document.getElementById('reminder-form');
  let reminders = [];
  let saveQueue = Promise.resolve();
  if (!list || !formPanel || !form) return;

  function initialSchedule(data) {
    const notes = data.topicNotes || {};
    return [
      { id: 'routine-morning', title: notes['daily-reminders'] || 'Morning routine', time: '08:00', period: 'morning', type: 'routine', phraseKey: 'daily_reminder_1', enabled: true },
      { id: 'medication-default', title: notes['medication-reminder'] || 'Medication reminder', time: '15:00', period: 'afternoon', type: 'medication', phraseKey: 'medication_reminder_1', enabled: true },
      { id: 'activity-evening', title: notes.exercise || 'Gentle movement or activity', time: '17:00', period: 'afternoon', type: 'activity', phraseKey: 'exercise_prompt_1', enabled: true },
      { id: 'routine-night', title: 'Evening routine', time: '20:00', period: 'night', type: 'routine', phraseKey: 'daily_reminder_2', enabled: true }
    ];
  }

  function persist() {
    saveQueue = saveQueue.then(() => window.ReMind.saveRegistration({ userReminders: reminders }))
      .catch((error) => window.ReMind.showToast(error.message));
  }

  function phraseKeyFor(reminder) {
    if (reminder.phraseKey) return reminder.phraseKey;
    if (reminder.type === 'medication') return 'medication_reminder_1';
    if (reminder.type === 'activity') return 'exercise_prompt_1';
    return 'daily_reminder_1';
  }

  function visualForReminder(reminder) {
    const title = reminder.title.toLowerCase();
    if (reminder.type === 'medication') return { icon: 'pill', category: 'medication' };
    if (title.includes('breakfast') || title.includes('lunch') || title.includes('meal')) {
      return { icon: 'plate', category: 'kitchen' };
    }
    if (reminder.type === 'activity' || title.includes('walk') || title.includes('movement')) {
      return { icon: 'exercise', category: 'exercise' };
    }
    if (title.includes('music') || title.includes('song')) return { icon: 'music', category: 'music' };
    return { icon: 'clockCalendar', category: 'schedule' };
  }

  function render() {
    list.replaceChildren();
    periods.forEach((period) => {
      const group = document.createElement('section');
      group.className = 'schedule-group';
      const heading = document.createElement('h2');
      heading.textContent = period[0].toUpperCase() + period.slice(1);
      const cards = document.createElement('div');
      cards.className = 'schedule-list';
      reminders.filter((reminder) => reminder.period === period).forEach((reminder) => {
        const card = document.createElement('article');
        card.className = 'schedule-card';
        const visual = visualForReminder(reminder);
        const typeIcon = document.createElement('span');
        typeIcon.innerHTML = window.ReMind.renderCategoryIcon(visual.icon, visual.category);
        const details = document.createElement('div');
        const title = document.createElement('h3');
        title.textContent = reminder.title;
        const time = document.createElement('p');
        time.textContent = `${reminder.time} · ${reminder.type[0].toUpperCase()}${reminder.type.slice(1)}`;
        details.append(title, time);
        if (reminder.type === 'medication') {
          const flag = document.createElement('span');
          flag.className = 'care-flag';
          flag.textContent = 'Requires caregiver confirmation';
          details.append(flag);
        }
        const preview = document.createElement('button');
        preview.type = 'button';
        preview.className = 'button button-secondary voice-preview';
        preview.setAttribute('aria-label', `Play voice reminder: ${reminder.title}`);
        preview.title = 'Play voice reminder';
        preview.innerHTML = window.ReMind.icons.speaker();
        preview.addEventListener('click', () => window.ReMindVoice.fetchAndPlayPhrase(phraseKeyFor(reminder), preview, reminder.title));
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'switch-control';
        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.checked = reminder.enabled !== false;
        toggle.setAttribute('aria-label', `Enable ${reminder.title}`);
        toggle.addEventListener('change', () => {
          reminder.enabled = toggle.checked;
          persist();
        });
        const toggleText = document.createElement('span');
        toggleText.textContent = toggle.checked ? 'On' : 'Off';
        toggle.addEventListener('change', () => { toggleText.textContent = toggle.checked ? 'On' : 'Off'; });
        toggleLabel.append(toggle, toggleText);
        card.append(typeIcon, details, preview, toggleLabel);
        cards.append(card);
      });
      if (!cards.childElementCount) {
        const empty = document.createElement('p');
        empty.className = 'empty-selection';
        empty.textContent = 'No reminders at this time.';
        cards.append(empty);
      }
      group.append(heading, cards);
      list.append(group);
    });
  }

  document.getElementById('show-reminder-form').addEventListener('click', () => {
    formPanel.hidden = !formPanel.hidden;
    if (!formPanel.hidden) document.getElementById('reminder-title').focus();
  });
  document.getElementById('cancel-reminder').addEventListener('click', () => { formPanel.hidden = true; form.reset(); });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    reminders.push({
      id: crypto.randomUUID(),
      title: document.getElementById('reminder-title').value.trim(),
      time: document.getElementById('reminder-time').value,
      period: document.getElementById('reminder-period').value,
      type: document.getElementById('reminder-type').value,
      phraseKey: document.getElementById('reminder-type').value === 'medication' ? 'medication_reminder_1' : document.getElementById('reminder-type').value === 'activity' ? 'exercise_prompt_1' : 'daily_reminder_1',
      enabled: true
    });
    persist();
    render();
    form.reset();
    formPanel.hidden = true;
    window.ReMind.showToast('Reminder added to your schedule.');
  });

  window.ReMind.fetchSession().then((data) => {
    reminders = Array.isArray(data.userReminders) ? data.userReminders : initialSchedule(data);
    render();
  }).catch((error) => window.ReMind.showToast(error.message));
})();
