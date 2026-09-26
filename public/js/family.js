(function () {
  'use strict';

  const list = document.getElementById('family-list');
  const preferencesList = document.getElementById('notification-preferences');
  const formPanel = document.getElementById('family-form-panel');
  const form = document.getElementById('family-form');
  const preferenceDefinitions = [
    ['medicationMissed', 'Medication missed'],
    ['phoneOffline', 'Phone offline for more than 45 minutes'],
    ['leftSafeZone', 'Left safe zone'],
    ['sessionSkipped', 'Daily session skipped'],
    ['sos', 'SOS alert']
  ];
  let members = [];
  let preferences = { medicationMissed: true, phoneOffline: true, leftSafeZone: true, sessionSkipped: true, sos: true };
  if (!list || !preferencesList || !formPanel || !form) return;

  function persistMembers() {
    return window.ReMind.saveRegistration({ familyMembers: members }).catch((error) => window.ReMind.showToast(error.message));
  }

  function renderMembers() {
    list.replaceChildren();
    if (!members.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-selection';
      empty.textContent = 'No care contacts added yet.';
      list.append(empty);
    }
    members.forEach((member) => {
      const card = document.createElement('article');
      card.className = 'family-card';
      const details = document.createElement('div');
      const name = document.createElement('h3');
      name.textContent = member.name;
      const role = document.createElement('p');
      role.textContent = `${member.role} · ${member.accessLevel}`;
      details.append(name, role);
      card.append(details);
      if (!member.fixed) {
        const remove = document.createElement('button');
        remove.className = 'button button-secondary';
        remove.type = 'button';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', `Remove ${member.name}`);
        remove.addEventListener('click', () => {
          members = members.filter((item) => item.id !== member.id);
          renderMembers();
          persistMembers();
        });
        card.append(remove);
      }
      list.append(card);
    });
  }

  function renderPreferences() {
    preferencesList.replaceChildren();
    preferenceDefinitions.forEach(([key, labelText]) => {
      const row = document.createElement('div');
      row.className = 'preference-row';
      const text = document.createElement('span');
      text.textContent = labelText;
      const label = document.createElement('label');
      label.className = 'switch-control';
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = key === 'sos' ? true : preferences[key] !== false;
      toggle.setAttribute('aria-label', labelText);
      if (key === 'sos') {
        toggle.disabled = true;
        toggle.setAttribute('aria-description', 'Always on and cannot be turned off');
      } else {
        toggle.addEventListener('change', () => {
          preferences[key] = toggle.checked;
          window.ReMind.saveRegistration({ notificationPreferences: preferences })
            .catch((error) => window.ReMind.showToast(error.message));
        });
      }
      const state = document.createElement('span');
      state.textContent = key === 'sos' ? 'Always on' : toggle.checked ? 'On' : 'Off';
      toggle.addEventListener('change', () => { state.textContent = toggle.checked ? 'On' : 'Off'; });
      label.append(toggle, state);
      row.append(text, label);
      preferencesList.append(row);
    });
  }

  document.getElementById('show-family-form').addEventListener('click', () => {
    formPanel.hidden = !formPanel.hidden;
    if (!formPanel.hidden) document.getElementById('family-name').focus();
  });
  document.getElementById('cancel-family').addEventListener('click', () => { formPanel.hidden = true; form.reset(); });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    members.push({
      id: crypto.randomUUID(),
      name: document.getElementById('family-name').value.trim(),
      role: document.getElementById('family-role').value.trim(),
      accessLevel: document.getElementById('family-access').value
    });
    renderMembers();
    persistMembers();
    form.reset();
    formPanel.hidden = true;
  });

  window.ReMind.fetchSession().then((data) => {
    const patient = data.patient || {};
    const caretaker = data.caretaker || {};
    members = [
      { id: 'patient', name: patient.fullName || 'Person receiving care', role: 'Person receiving care', accessLevel: 'Profile owner', fixed: true }
    ];
    if (caretaker.name) members.push({ id: 'caretaker', name: caretaker.name, role: caretaker.relation || 'Caretaker', accessLevel: 'Full care access', fixed: true });
    members.push(...(Array.isArray(data.familyMembers) ? data.familyMembers : []));
    preferences = { ...preferences, ...(data.notificationPreferences || {}), sos: true };
    renderMembers();
    renderPreferences();
  }).catch((error) => window.ReMind.showToast(error.message));
})();
