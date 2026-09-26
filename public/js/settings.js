(function () {
  'use strict';

  const form = document.getElementById('settings-form');
  if (!form) return;

  const language = document.getElementById('language-setting');
  const textSize = document.getElementById('text-size-setting');
  const volume = document.getElementById('volume-setting');
  const vibration = document.getElementById('vibration-setting');
  const cueOverride = document.getElementById('cue-override');
  const textOutput = document.getElementById('text-size-output');
  const volumeOutput = document.getElementById('volume-output');

  function updateOutputs() {
    textOutput.value = `${textSize.value}px`;
    volumeOutput.value = `${volume.value}%`;
    window.ReMind.applyDisplayPreferences({ textSize: Number(textSize.value), language: language.value });
  }

  textSize.addEventListener('input', updateOutputs);
  volume.addEventListener('input', updateOutputs);
  language.addEventListener('change', updateOutputs);

  window.ReMind.fetchSession().then((data) => {
    const preferences = data.uiPreferences || {};
    language.value = preferences.language || 'en';
    textSize.value = preferences.textSize || 18;
    volume.value = preferences.volume ?? 70;
    vibration.checked = preferences.vibration === true;
    cueOverride.value = preferences.cueLevelOverride ?? 'automatic';
    updateOutputs();
  }).catch((error) => window.ReMind.showToast(error.message));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const uiPreferences = {
      language: language.value,
      textSize: Number(textSize.value),
      volume: Number(volume.value),
      vibration: vibration.checked,
      cueLevelOverride: cueOverride.value
    };
    try {
      await window.ReMind.saveRegistration({ uiPreferences });
      window.ReMind.applyDisplayPreferences(uiPreferences);
      window.ReMind.showToast('Settings saved.');
    } catch (error) {
      window.ReMind.showToast(error.message);
    }
  });
})();
