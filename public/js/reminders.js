(function () {
  'use strict';

  const periods = ['morning', 'afternoon', 'evening', 'night'];
  const formPanel = document.getElementById('reminder-form-panel');
  const list = document.getElementById('reminder-list');
  const form = document.getElementById('reminder-form');
  let reminders = [];
  let routines = [];
  let saveQueue = Promise.resolve();
  if (!list || !formPanel || !form) return;

  function initialSchedule(data) {
    const notes = data.topicNotes || {};
    return [{ id: 'medication-default', title: notes['medication-reminder'] || 'Medication reminder', time: '15:00', period: 'afternoon', type: 'medication', phraseKey: 'medication_reminder_1', enabled: true }];
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

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function focusRequestedConfirmation() {
    const reminderId = new URLSearchParams(window.location.search).get('confirm');
    if (!reminderId) return;
    const confirmButton = [...list.querySelectorAll('[data-confirm-reminder]')]
      .find(button => button.dataset.confirmReminder === reminderId);
    if (confirmButton) {
      confirmButton.scrollIntoView({ block: 'center', behavior: 'smooth' });
      confirmButton.focus({ preventScroll: true });
    } else {
      window.ReMind.showToast('This medication reminder is no longer available.');
    }
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
      const routine = routines.filter(item => item.slot === period)
        .sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0))[0];
      routine?.steps.forEach((step, index) => {
        const card = document.createElement('article');
        card.className = 'schedule-card schedule-routine-card';
        const icon = document.createElement('span');
        const category = step.icon === 'pill' ? 'medication' : step.icon === 'exercise' ? 'exercise' : step.icon === 'music' ? 'music' : 'schedule';
        icon.innerHTML = window.ReMind.renderCategoryIcon(step.icon, category);
        const details = document.createElement('div');
        const title = document.createElement('h3');
        title.textContent = step.label;
        const time = document.createElement('p');
        time.textContent = `${routine.name} · Step ${index + 1}`;
        if (step.cuePhrase) {
          const cue = document.createElement('p');
          cue.textContent = `Cue: ${step.cuePhrase}`;
          details.append(title, time, cue);
        } else {
          details.append(title, time);
        }
        card.append(icon, details);
        cards.append(card);
      });
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
          const confirmedToday = reminder.lastConfirmedDate === localDateKey();
          flag.textContent = confirmedToday ? 'Confirmed today' : 'Requires caregiver confirmation';
          const confirmButton = document.createElement('button');
          confirmButton.type = 'button';
          confirmButton.className = 'button button-secondary care-confirm';
          confirmButton.dataset.confirmReminder = reminder.id;
          confirmButton.textContent = confirmedToday ? 'Confirmed today' : 'Confirm taken';
          confirmButton.disabled = confirmedToday;
          confirmButton.setAttribute('aria-label', `Confirm ${reminder.title} taken`);
          confirmButton.addEventListener('click', async () => {
            confirmButton.disabled = true;
            try {
              const saved = await window.ReMind.confirmMedicationReminder(reminder.id);
              Object.assign(reminder, saved);
              flag.textContent = 'Confirmed today';
              confirmButton.textContent = 'Confirmed today';
              window.ReMind.showToast('Medication confirmation saved.');
            } catch (error) {
              confirmButton.disabled = false;
              window.ReMind.showToast(error.message);
            }
          });
          details.append(flag, confirmButton);
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

  Promise.all([
    window.ReMind.fetchSession(),
    fetch('/api/routines', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(response => { if (!response.ok) throw new Error('Could not load routines.'); return response.json(); })
  ]).then(([data, savedRoutines]) => {
    reminders = Array.isArray(data.userReminders) ? data.userReminders : initialSchedule(data);
    routines = savedRoutines;
    render();
    focusRequestedConfirmation();
  }).catch((error) => window.ReMind.showToast(error.message));
})();
