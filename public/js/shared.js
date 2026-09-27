(function () {
  'use strict';

  // OPTIONAL FUTURE UPGRADE: to use real photographs instead of icons, add image files
  // to public/images/objects/<itemKey>.jpg and update ICON_LIBRARY's lookup to check
  // for a matching image file first, falling back to the SVG icon if none exists. Not
  // implemented in this build — icons only.

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

  const ICON_LIBRARY = Object.freeze({
    ...icons,
    calendar: icons.clockCalendar,
    musicalNote: icons.music,
    cup: () => iconBase('<path d="M10 14h23v15a8 8 0 0 1-8 8h-7a8 8 0 0 1-8-8V14Z"/><path d="M33 18h4a5 5 0 0 1 0 10h-4M14 42h20"/>'),
    spoon: () => iconBase('<ellipse cx="22" cy="12" rx="7" ry="10"/><path d="M22 22v21"/>'),
    plate: () => iconBase('<circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="12"/>'),
    key: () => iconBase('<circle cx="16" cy="19" r="8"/><path d="m22 25 15 15M30 33l5-5M34 37l5-5"/>'),
    glasses: () => iconBase('<circle cx="14" cy="26" r="8"/><circle cx="34" cy="26" r="8"/><path d="M22 26h4M6 24l-2-7h7M42 24l2-7h-7"/>'),
    umbrella: () => iconBase('<path d="M5 24a19 19 0 0 1 38 0H5Z"/><path d="M24 5v31a6 6 0 0 0 12 0"/><path d="M5 24q5-7 10 0 5-7 9 0 5-7 10 0 4-6 9 0"/>'),
    book: () => iconBase('<path d="M7 10q9-4 17 2v29q-8-6-17-2V10ZM41 10q-9-4-17 2v29q8-6 17-2V10Z"/><path d="M24 12v29"/>'),
    shirt: () => iconBase('<path d="m15 8 9 5 9-5 10 8-6 8-5-3v19H14V21l-5 3-6-8 12-8Z"/>'),
    hat: () => iconBase('<path d="M11 29 15 14a9 9 0 0 1 18 0l4 15H11Z"/><path d="M6 29h36q-3 8-18 8T6 29Z"/>'),
    sock: () => iconBase('<path d="M17 7h16v20l7 7a6 6 0 0 1-5 10H14a7 7 0 0 1-2-14l5-3V7Z"/><path d="M17 14h16"/>'),
    oldRadio: () => iconBase('<rect x="5" y="11" width="38" height="29" rx="4"/><rect x="10" y="17" width="19" height="17" rx="2"/><circle cx="36" cy="20" r="3"/><circle cx="36" cy="30" r="3"/><path d="M13 11l6-6h18"/>'),
    rotaryTelephone: () => iconBase('<path d="M9 15q15-14 30 0M7 17h34v8H7z"/><path d="M12 25h24a8 8 0 0 1 8 8v5H4v-5a8 8 0 0 1 8-8Z"/><circle cx="24" cy="33" r="5"/>'),
    recordPlayer: () => iconBase('<rect x="5" y="8" width="38" height="33" rx="3"/><circle cx="21" cy="25" r="12"/><circle cx="21" cy="25" r="3"/><path d="m33 14 5 13M34 14h5"/>'),
    filmCamera: () => iconBase('<path d="M7 17h34v25H7zM13 17l4-8h13l5 8"/><circle cx="24" cy="29" r="8"/><circle cx="24" cy="29" r="3"/>'),
    sewingMachine: () => iconBase('<path d="M8 37h34M13 36V12h18a8 8 0 0 1 8 8v8H24v8"/><circle cx="21" cy="20" r="5"/><path d="M30 28h9M33 28v8"/>'),
    traditionalLamp: () => iconBase('<path d="M17 23V12a7 7 0 0 1 14 0v11l7 17H10l7-17Z"/><path d="M17 23h14M24 5V2M11 10l-3-2M37 10l3-2"/>'),
    lightbulb: () => iconBase('<path d="M16 29a14 14 0 1 1 16 0l-2 5H18l-2-5Z"/><path d="M19 38h10M21 43h6M24 2v4M5 18h5M38 18h5M9 7l4 4M35 11l4-4"/>')
  });

  const CATEGORY_COLORS = Object.freeze({
    kitchen: Object.freeze({ background: 'var(--cat-kitchen-bg)', icon: 'var(--cat-kitchen-icon)' }),
    clothing: Object.freeze({ background: 'var(--cat-clothing-bg)', icon: 'var(--cat-clothing-icon)' }),
    nostalgia: Object.freeze({ background: 'var(--cat-nostalgia-bg)', icon: 'var(--cat-nostalgia-icon)' }),
    schedule: Object.freeze({ background: 'var(--cat-schedule-bg)', icon: 'var(--cat-schedule-icon)' }),
    medication: Object.freeze({ background: 'var(--cat-medication-bg)', icon: 'var(--cat-medication-icon)' }),
    exercise: Object.freeze({ background: 'var(--cat-exercise-bg)', icon: 'var(--cat-exercise-icon)' }),
    music: Object.freeze({ background: 'var(--cat-music-bg)', icon: 'var(--cat-music-icon)' })
  });

  function renderCategoryIcon(iconKey, category, size = 'standard') {
    const categoryKey = Object.hasOwn(CATEGORY_COLORS, category) ? category : 'schedule';
    const icon = ICON_LIBRARY[iconKey];
    if (typeof icon !== 'function') return '';
    const sizeClass = size === 'large' ? ' category-icon--large' : '';
    return `<span class="category-icon category-icon--${categoryKey}${sizeClass}" aria-hidden="true">${icon()}</span>`;
  }

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
    icons: ICON_LIBRARY,
    ICON_LIBRARY,
    CATEGORY_COLORS,
    renderCategoryIcon,
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
