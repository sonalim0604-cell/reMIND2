(function () {
  'use strict';

  const caretakerForm = document.getElementById('caretaker-form');
  if (!caretakerForm) return;

  const nicknamePanel = document.getElementById('nickname-slide');
  const patientNamePrompt = document.getElementById('nickname-prompt');
  const nicknameInput = document.getElementById('audio-nickname');
  const phoneInput = document.getElementById('caretaker-phone');

  phoneInput.addEventListener('input', () => {
    phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 15);
  });

  function caretakerFromForm() {
    return {
      name: document.getElementById('caretaker-name').value.trim(),
      contact: {
        countryCode: document.getElementById('caretaker-country-code').value,
        number: document.getElementById('caretaker-phone').value.replace(/\D/g, '')
      },
      relation: document.getElementById('caretaker-relation').value.trim()
    };
  }

  async function saveCaretaker(audioConsent, audioNickname = '') {
    if (!caretakerForm.reportValidity()) return false;
    try {
      await window.ReMind.saveRegistration({
        caretaker: caretakerFromForm(),
        audioConsent,
        audioNickname
      });
      return true;
    } catch (error) {
      window.ReMind.showToast(error.message);
      return false;
    }
  }

  document.querySelectorAll('[data-consent]').forEach((button) => {
    button.addEventListener('click', async () => {
      const consent = button.dataset.consent === 'yes';
      const saved = await saveCaretaker(consent, '');
      if (!saved) return;
      if (!consent) {
        window.ReMind.navigate('/questionnaire.html');
        return;
      }

      try {
        const data = await window.ReMind.fetchSession();
        const patientName = data.patient?.fullName || 'your close one';
        patientNamePrompt.textContent = `What should we call them for ${patientName}? Choose a familiar name that feels comfortable.`;
        nicknameInput.value = data.audioNickname || '';
      } catch (error) {
        window.ReMind.showToast(error.message);
      }
      nicknamePanel.hidden = false;
      nicknameInput.focus();
    });
  });

  document.getElementById('nickname-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await window.ReMind.saveRegistration({
        caretaker: caretakerFromForm(),
        audioConsent: true,
        audioNickname: nicknameInput.value.trim()
      });
      window.ReMind.navigate('/questionnaire.html');
    } catch (error) {
      window.ReMind.showToast(error.message);
    }
  });

  window.ReMind.fetchSession().then((data) => {
    const caretaker = data.caretaker || {};
    const contact = caretaker.contact || {};
    document.getElementById('caretaker-name').value = caretaker.name || '';
    document.getElementById('caretaker-country-code').value = contact.countryCode || '+91';
    document.getElementById('caretaker-phone').value = contact.number || '';
    document.getElementById('caretaker-relation').value = caretaker.relation || '';
    if (data.audioConsent === true) {
      nicknameInput.value = data.audioNickname || '';
      nicknamePanel.hidden = false;
      patientNamePrompt.textContent = `What should we call them for ${data.patient?.fullName || 'your close one'}? Choose a familiar name that feels comfortable.`;
    }
  }).catch((error) => window.ReMind.showToast(error.message));
})();
