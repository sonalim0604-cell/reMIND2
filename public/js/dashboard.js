(function () {
  'use strict';

  const cueList = document.getElementById('cue-level-list');
  if (!cueList) return;

  function renderChart(days) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 560 240');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Prompts needed during the past seven days');
    const baseline = document.createElementNS(svgNS, 'line');
    baseline.setAttribute('x1', '28'); baseline.setAttribute('x2', '548');
    baseline.setAttribute('y1', '188'); baseline.setAttribute('y2', '188');
    baseline.setAttribute('stroke', 'currentColor');
    svg.append(baseline);
    const maxValue = Math.max(1, ...days.map((day) => day.count));
    days.forEach((day, index) => {
      const height = Math.max(2, Math.round((day.count / maxValue) * 132));
      const x = 48 + index * 72;
      const bar = document.createElementNS(svgNS, 'rect');
      bar.classList.add('chart-bar');
      bar.setAttribute('x', String(x)); bar.setAttribute('y', String(184 - height));
      bar.setAttribute('width', '38'); bar.setAttribute('height', String(height));
      bar.setAttribute('rx', '5');
      const barTitle = document.createElementNS(svgNS, 'title');
      barTitle.textContent = `${day.count} prompts on ${day.date}`;
      bar.append(barTitle);
      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('x', String(x + 19)); label.setAttribute('y', '216'); label.setAttribute('text-anchor', 'middle');
      label.textContent = new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
      const count = document.createElementNS(svgNS, 'text');
      count.setAttribute('x', String(x + 19)); count.setAttribute('y', String(Math.max(28, 176 - height)));
      count.setAttribute('text-anchor', 'middle'); count.textContent = String(day.count);
      svg.append(bar, label, count);
    });
    const chart = document.getElementById('prompts-chart');
    chart.replaceChildren(svg);
  }

  function appendText(container, text) {
    const p = document.createElement('p');
    p.textContent = text;
    container.append(p);
  }

  document.getElementById('export-dashboard').addEventListener('click', async () => {
    try {
      const data = await window.ReMind.fetchSession();
      data.trainerSummary = window.ReMindTrainer.getSummary();
      window.ReMind.exportJson('remind-care-report.json', data);
    } catch (error) {
      window.ReMind.showToast(error.message);
    }
  });

  window.ReMind.fetchSession().then((data) => {
    if (data.engineParameters) window.ReMindTrainer.setParameters(data.engineParameters);
    const summary = window.ReMindTrainer.getSummary();
    document.getElementById('sessions-this-week').textContent = String(summary.sessionsThisWeek);
    document.getElementById('longest-interval').textContent = `${summary.longestInterval} day${summary.longestInterval === 1 ? '' : 's'}`;
    document.getElementById('current-streak').textContent = String(summary.streak);
    renderChart(summary.promptsByDay);
    cueList.replaceChildren();
    summary.cueLevels.forEach((cue) => {
      const card = document.createElement('article');
      card.className = 'family-card';
      const label = document.createElement('h3');
      label.textContent = cue.period[0].toUpperCase() + cue.period.slice(1);
      const value = document.createElement('p');
      value.textContent = `${cue.cueName} · ${cue.intervalDays}-day interval`;
      card.append(label, value);
      cueList.append(card);
    });

    const medication = document.getElementById('dashboard-medication');
    const medicationNote = data.topicNotes?.['medication-reminder'];
    appendText(medication, medicationNote ? `${medicationNote} · caregiver confirmation required` : 'No medication reminder details entered. Confirm all medication schedules with a caregiver.');
    const activityPanel = document.getElementById('dashboard-activities');
    const activityNotes = ['daily-reminders', 'specific-tasks', 'exercise'].filter((id) => data.topicNotes?.[id]);
    if (!activityNotes.length) appendText(activityPanel, 'No meal or activity notes have been added.');
    activityNotes.forEach((id) => appendText(activityPanel, data.topicNotes[id]));
  }).catch((error) => window.ReMind.showToast(error.message));
})();
