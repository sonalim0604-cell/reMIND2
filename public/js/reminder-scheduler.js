(() => {
  'use strict';

  const permissionChoiceKey = 'reMIND.notification-permission-choice.v1';
  const firedKeyPrefix = 'reMIND.reminder-fired.v1:';
  const slotTimes = { morning: '08:00', afternoon: '12:00', evening: '17:00', night: '20:00' };
  const firedToday = new Set();
  let reminders = [];
  let initialCheck = true;
  let lastCheckAt = new Date();

  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function offerNotificationPermission() {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    try {
      if (localStorage.getItem(permissionChoiceKey)) return;
    } catch {
      return;
    }

    const main = document.querySelector('main.page-shell');
    if (!main) return;
    const prompt = document.createElement('section');
    prompt.className = 'app-section notification-permission-prompt';
    prompt.setAttribute('aria-labelledby', 'notification-permission-heading');
    const heading = document.createElement('h2');
    heading.id = 'notification-permission-heading';
    heading.textContent = 'Allow reMIND to remind you at the right times?';
    const actions = document.createElement('div');
    actions.className = 'notification-prompt-actions';
    const allow = document.createElement('button');
    allow.type = 'button';
    allow.className = 'button button-primary';
    allow.textContent = 'Allow';
    const notNow = document.createElement('button');
    notNow.type = 'button';
    notNow.className = 'button button-secondary';
    notNow.textContent = 'Not now';
    actions.append(allow, notNow);
    prompt.append(heading, actions);
    main.insertBefore(prompt, main.firstChild);

    notNow.addEventListener('click', () => {
      try { localStorage.setItem(permissionChoiceKey, 'not-now'); } catch { /* Permission is still not requested. */ }
      prompt.remove();
    });
    allow.addEventListener('click', async () => {
      allow.disabled = true;
      try { localStorage.setItem(permissionChoiceKey, 'allow'); } catch { /* Browser permission still applies. */ }
      try {
        await Notification.requestPermission();
      } finally {
        prompt.remove();
      }
    });
  }

  function createBanner(item) {
    const banner = document.createElement('section');
    banner.className = 'reminder-live-banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    const message = document.createElement('p');
    message.textContent = item.kind === 'medication'
      ? `Medication reminder: ${item.label}`
      : `Time for: ${item.label}`;
    const actions = document.createElement('div');
    actions.className = 'reminder-live-actions';
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'button button-primary';
    action.textContent = item.kind === 'medication' ? 'Confirm taken' : item.actionLabel;
    action.addEventListener('click', async () => {
      if (item.kind === 'medication') {
        action.disabled = true;
        try {
          await window.ReMind.confirmMedicationReminder(item.id);
          message.textContent = `Confirmed: ${item.label}`;
          action.remove();
        } catch (error) {
          action.disabled = false;
          window.ReMind.showToast(error.message);
        }
        return;
      }
      window.location.assign(item.path);
    });
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'button button-secondary';
    dismiss.textContent = 'Dismiss';
    dismiss.addEventListener('click', () => banner.remove());
    actions.append(action, dismiss);
    banner.append(message, actions);
    const main = document.querySelector('main.page-shell');
    if (main) main.insertBefore(banner, main.firstChild);
  }

  function fire(item, date) {
    const dateKey = localDateKey(date);
    const uniqueKey = `${dateKey}:${item.id}`;
    if (firedToday.has(uniqueKey)) return;
    try {
      if (sessionStorage.getItem(`${firedKeyPrefix}${uniqueKey}`)) return;
      sessionStorage.setItem(`${firedKeyPrefix}${uniqueKey}`, '1');
    } catch { /* Keep in-memory deduplication when storage is unavailable. */ }
    firedToday.add(uniqueKey);

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(item.kind === 'medication' ? 'Medication reminder' : 'reMIND reminder', {
          body: item.kind === 'medication' ? `Confirm: ${item.label}` : `Time for: ${item.label}`,
          tag: uniqueKey
        });
        notification.addEventListener('click', () => {
          window.focus();
          window.location.assign(item.kind === 'medication'
            ? `/reminders.html?confirm=${encodeURIComponent(item.id)}`
            : '/daily.html');
          notification.close();
        });
      } catch {
        createBanner(item);
        return;
      }
    }
    createBanner(item);
  }

  function buildSchedule(routinesData, sessionData) {
    const userReminders = Array.isArray(sessionData.userReminders)
      ? sessionData.userReminders
      : [{
          id: 'medication-default',
          title: sessionData.topicNotes?.['medication-reminder'] || 'Medication reminder',
          time: '15:00',
          period: 'afternoon',
          type: 'medication',
          enabled: true
        }];
    reminders = userReminders;

    const schedule = userReminders
      .filter(reminder => reminder.enabled !== false && reminder.type !== 'routine')
      .filter(reminder => /^\d{2}:\d{2}$/.test(reminder.time || ''))
      .map(reminder => ({
        id: reminder.id,
        label: reminder.title,
        time: reminder.time,
        kind: reminder.type === 'medication' ? 'medication' : 'reminder',
        path: '/reminders.html',
        actionLabel: 'Open reminders',
        lastConfirmedDate: reminder.lastConfirmedDate
      }));

    ['morning', 'afternoon', 'evening', 'night'].forEach(slot => {
      const routine = routinesData.filter(item => item.slot === slot)
        .sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0))[0];
      const step = routine?.steps?.[0];
      if (!step) return;
      const configuredTime = userReminders.find(reminder => reminder.enabled !== false
        && reminder.type === 'routine' && reminder.period === slot)?.time;
      schedule.push({
        id: `routine:${routine.id}:${step.id}`,
        label: step.label,
        time: configuredTime || slotTimes[slot],
        kind: 'routine',
        path: '/daily.html',
        actionLabel: 'Open daily routine'
      });
    });
    return schedule;
  }

  function scheduledAtToday(time, now) {
    const [hour, minute] = time.split(':').map(Number);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  }

  async function checkSchedule() {
    try {
      const [routineResponse, sessionData] = await Promise.all([
        fetch('/api/routines', { credentials: 'same-origin', headers: { Accept: 'application/json' } }),
        window.ReMind.fetchSession()
      ]);
      if (!routineResponse.ok) throw new Error('Could not load routine reminders.');
      const schedule = buildSchedule(await routineResponse.json(), sessionData);
      const now = new Date();
      schedule.forEach(item => {
        if (item.kind === 'medication' && item.lastConfirmedDate === localDateKey(now)) return;
        const dueAt = scheduledAtToday(item.time, now);
        const isWithinDueMinute = now >= dueAt && now < dueAt.getTime() + 60000;
        const crossedDueTime = lastCheckAt < dueAt && now >= dueAt;
        if ((initialCheck && isWithinDueMinute) || crossedDueTime) fire(item, now);
      });
      initialCheck = false;
      lastCheckAt = now;
    } catch (error) {
      window.ReMind.showToast(error.message || 'Reminders could not be checked.');
    }
  }

  offerNotificationPermission();
  void checkSchedule();
  window.setInterval(() => { void checkSchedule(); }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void checkSchedule();
  });
})();
