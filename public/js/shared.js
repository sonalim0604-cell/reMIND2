(function () {
  'use strict';

  const iconBase = (content) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${content}</svg>`;

  const icons = Object.freeze({
    clockCalendar: () => iconBase('<rect x="7" y="10" width="34" height="31" rx="4"/><path d="M15 6v8M33 6v8M7 19h34M24 24v7l5 3"/>'),
    pill: () => iconBase('<path d="M14 36a9 9 0 0 1 0-13l9-9a9 9 0 0 1 13 13l-9 9a9 9 0 0 1-13 0Z"/><path d="m20 17 12 12"/>'),
    checklist: () => iconBase('<rect x="13" y="8" width="27" height="34" rx="3"/><path d="M20 8V5h13v3M20 19l3 3 6-7M20 31l3 3 6-7M34 20h4M34 32h4"/>'),
    exercise: () => iconBase('<circle cx="24" cy="8" r="4"/><path d="m21 15-5 8 7 5-4 13M27 16l5 8 8 2M22 19l9 1M18 24l-8 7M23 28l8 5 5 8"/>'),
    music: () => iconBase('<path d="M28 35V10l13-3v25M28 17l13-3"/><ellipse cx="20" cy="36" rx="8" ry="5"/><ellipse cx="33" cy="33" rx="8" ry="5"/>'),
    learning: () => iconBase('<path d="M8 12c7-3 13-2 16 2v25c-4-4-10-5-16-2V12ZM40 12c-7-3-13-2-16 2v25c4-4 10-5 16-2V12Z"/><path d="M24 14v25M16 19h4M16 25h4M30 19h4M30 25h4"/>'),
    person: () => iconBase('<circle cx="24" cy="15" r="8"/><path d="M8 42c1-9 7-14 16-14s15 5 16 14"/>'),
    speaker: () => iconBase('<path d="M7 19h9l12-9v28l-12-9H7zM34 18a9 9 0 0 1 0 12M37 12a17 17 0 0 1 0 24"/>')
  });

  function renderAppHeaders() {
    document.querySelectorAll('[data-app-header]').forEach((header) => {
      const brand = document.createElement('a');
      brand.className = 'brand';
      brand.href = '/home.html';
      brand.textContent = 'reMIND';
      brand.setAttribute('aria-label', 'reMIND home');

      const profile = document.createElement('a');
      profile.className = 'header-profile';
      profile.href = '/profile.html';
      profile.setAttribute('aria-label', 'Profile');
      profile.title = 'Profile';
      profile.innerHTML = icons.person();
      header.replaceChildren(brand, profile);
    });
  }

  function navigate(path) {
    window.location.assign(path);
  }

  async function fetchSession() {
    const response = await fetch('/api/session', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin'
    });
    if (!response.ok) throw new Error('Could not load your saved details.');
    const data = await response.json();
    applyDisplayPreferences(data.uiPreferences);
    return data;
  }

  async function saveRegistration(data) {
    const response = await fetch('/api/registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(data)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Your details could not be saved.');
    return result;
  }

  let toastTimer;
  function showToast(message, duration = 3800) {
    const region = document.getElementById('toast-region');
    if (!region) return;
    region.textContent = message;
    region.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => region.classList.remove('is-visible'), duration);
  }

  function applyDisplayPreferences(preferences = {}) {
    const size = Number(preferences.textSize) || 18;
    document.documentElement.dataset.textScale = size >= 24 ? 'largest' : size >= 21 ? 'large' : 'normal';
    document.documentElement.lang = ['en', 'hi'].includes(preferences.language) ? preferences.language : 'en';
  }

  function exportJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  window.ReMind = Object.freeze({
    icons,
    navigate,
    fetchSession,
    saveRegistration,
    showToast,
    renderAppHeaders,
    applyDisplayPreferences,
    exportJson
  });
  renderAppHeaders();
})();
