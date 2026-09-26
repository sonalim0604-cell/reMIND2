(function () {
  'use strict';

  const form = document.getElementById('engine-parameters-form');
  if (!form) return;

  const start = document.getElementById('start-interval');
  const multiplier = document.getElementById('interval-multiplier');
  const fadeAfter = document.getElementById('cue-fade-sessions');
  const summary = document.getElementById('engine-summary');

  function renderSummary() {
    const startDays = Number(start.value) || 1;
    const factor = Number(multiplier.value) || 2;
    const intervals = Array.from({ length: 5 }, (_, index) => Math.min(365, Math.round(startDays * (factor ** index))));
    summary.textContent = `Recall intervals: ${intervals.join(' → ')} days. A cue fades after ${Number(fadeAfter.value) || 2} consecutive sessions at the target interval.`;
  }

  [start, multiplier, fadeAfter].forEach((field) => field.addEventListener('input', renderSummary));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const engineParameters = {
      startInterval: Number(start.value),
      multiplier: Number(multiplier.value),
      fadeAfterSessions: Number(fadeAfter.value)
    };
    try {
      await window.ReMind.saveRegistration({ engineParameters });
      window.ReMind.showToast('Practice parameters saved.');
    } catch (error) {
      window.ReMind.showToast(error.message);
    }
  });
  document.getElementById('export-clinician').addEventListener('click', async () => {
    try {
      const data = await window.ReMind.fetchSession();
      window.ReMind.exportJson('remind-clinical-report.json', data);
    } catch (error) {
      window.ReMind.showToast(error.message);
    }
  });

  window.ReMind.fetchSession().then((data) => {
    const parameters = data.engineParameters || {};
    start.value = parameters.startInterval || 1;
    multiplier.value = parameters.multiplier || 2;
    fadeAfter.value = parameters.fadeAfterSessions || 2;
    renderSummary();
  }).catch((error) => window.ReMind.showToast(error.message));
})();
