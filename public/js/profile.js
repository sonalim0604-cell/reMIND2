(function () {
  'use strict';

  function appendField(container, labelText, valueText) {
    const item = document.createElement('div');
    item.className = 'readonly-item';
    const term = document.createElement('dt');
    term.textContent = labelText;
    const value = document.createElement('dd');
    value.textContent = valueText || 'Not provided';
    item.append(term, value);
    container.append(item);
  }

  function appendProfileSection(main, titleText, id) {
    const section = document.createElement('section');
    section.className = 'app-section';
    section.setAttribute('aria-labelledby', `${id}-heading`);
    const heading = document.createElement('div');
    heading.className = 'section-heading';
    const title = document.createElement('h2');
    title.id = `${id}-heading`;
    title.textContent = titleText;
    heading.append(title);
    const list = document.createElement('dl');
    list.className = 'readonly-grid';
    list.id = id;
    section.append(heading, list);
    main.append(section);
    return list;
  }

  const main = document.querySelector('main');
  const patientList = document.getElementById('patient-profile');
  const addressList = document.getElementById('address-profile');
  const caretakerList = document.getElementById('caretaker-profile');
  if (!main || !patientList || !addressList || !caretakerList) return;

  window.ReMind.fetchSession().then((data) => {
    const patient = data.patient || {};
    const contact = patient.contact || {};
    const address = patient.address || {};
    const caretaker = data.caretaker || {};
    const caretakerContact = caretaker.contact || {};
    appendField(patientList, 'Full name', patient.fullName);
    appendField(patientList, 'Date of birth', patient.dateOfBirth);
    appendField(patientList, 'Age', patient.age == null ? '' : String(patient.age));
    appendField(patientList, 'Contact number', contact.number ? `${contact.countryCode || ''} ${contact.number}` : '');
    appendField(addressList, 'Country', address.country);
    appendField(addressList, 'State or region', address.region);
    appendField(addressList, 'Detailed address', address.details);
    appendField(caretakerList, 'Name', caretaker.name);
    appendField(caretakerList, 'Contact number', caretakerContact.number ? `${caretakerContact.countryCode || ''} ${caretakerContact.number}` : '');
    appendField(caretakerList, 'Relationship', caretaker.relation);
    appendField(caretakerList, 'Audio consent', data.audioConsent === true ? 'Yes' : data.audioConsent === false ? 'No' : 'Not answered');
    if (data.audioConsent === true) appendField(caretakerList, 'Audio nickname', data.audioNickname || 'Not set');

    const topics = appendProfileSection(main, 'Helping points and notes', 'topic-profile');
    const catalog = [
      ['daily-reminders', 'Daily reminders'], ['medication-reminder', 'Medication reminder'],
      ['specific-tasks', 'Specific tasks'], ['exercise', 'Exercise'],
      ['nostalgic-songs', 'Nostalgic Songs'], ['little-learnings', 'Little Learnings']
    ];
    const selected = catalog.filter(([id]) => (data.selectedTopics || []).includes(id));
    if (selected.length === 0) appendField(topics, 'Helping points', 'None selected');
    selected.forEach(([id, title]) => appendField(topics, title, data.topicNotes?.[id] || 'No note added'));

    const audioSection = document.getElementById('audio-profile-section');
    audioSection.hidden = data.audioConsent !== true;
    if (!audioSection.hidden) {
      const audio = document.getElementById('audio-profile');
      appendField(audio, 'Nickname', data.audioNickname || 'Not set');
      appendField(audio, 'Recording', data.audioRecording?.exists ? 'Voice sample saved' : 'No voice sample saved');
    }
  }).catch((error) => window.ReMind.showToast(error.message));
})();
