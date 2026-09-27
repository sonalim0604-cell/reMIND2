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

  async function fetchRoutineTraining() {
    const response = await fetch('/api/routines/training', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin'
    });
    const data = await response.json().catch(() => []);
    if (!response.ok) throw new Error('Could not load routine training progress.');
    return data;
  }

  function renderCueLevels(routineData) {
    const slots = [
      { id: 'morning', label: 'Morning' },
      { id: 'afternoon', label: 'Afternoon' },
      { id: 'evening', label: 'Evening' },
      { id: 'night', label: 'Night' }
    ];
    cueList.replaceChildren();
    slots.forEach(slot => {
      const group = document.createElement('section');
      group.className = 'dashboard-routine-group';
      const heading = document.createElement('h3');
      heading.textContent = slot.label;
      group.append(heading);
      const matchingRoutines = routineData.filter(routine => routine.slot === slot.id);
      if (!matchingRoutines.length) {
        appendText(group, 'No routine set up yet.');
      }
      matchingRoutines.forEach(routine => {
        const routineHeading = document.createElement('h4');
        routineHeading.textContent = routine.name;
        group.append(routineHeading);
        routine.steps.forEach(step => {
          const row = document.createElement('article');
          row.className = 'family-card dashboard-step-cue';
          const stepName = document.createElement('h4');
          stepName.textContent = step.label;
          const state = step.training;
          const value = document.createElement('p');
          value.textContent = `${state.cueName} · ${state.intervalDays}-day interval · ${state.consecutiveSuccesses} consecutive success${state.consecutiveSuccesses === 1 ? '' : 'es'}`;
          row.append(stepName, value);
          group.append(row);
        });
      });
      cueList.append(group);
    });
  }

  document.getElementById('export-dashboard').addEventListener('click', async () => {
    try {
      const data = await window.ReMind.fetchSession();
      data.trainerSummary = window.ReMindTrainer.getSummary();
      data.routines = await fetchRoutineTraining();
      window.ReMind.exportJson('remind-care-report.json', data);
    } catch (error) {
      window.ReMind.showToast(error.message);
    }
  });

  window.ReMind.fetchSession().then(async (data) => {
    if (data.engineParameters) window.ReMindTrainer.setParameters(data.engineParameters);
    const summary = window.ReMindTrainer.getSummary();
    const routines = await fetchRoutineTraining();
    document.getElementById('sessions-this-week').textContent = String(summary.sessionsThisWeek);
    document.getElementById('longest-interval').textContent = `${summary.longestInterval} day${summary.longestInterval === 1 ? '' : 's'}`;
    document.getElementById('current-streak').textContent = String(summary.streak);
    renderChart(summary.promptsByDay);
    renderCueLevels(routines);

    const medication = document.getElementById('dashboard-medication');
    const medicationNote = data.topicNotes?.['medication-reminder'];
    appendText(medication, medicationNote ? `${medicationNote} · caregiver confirmation required` : 'No medication reminder details entered. Confirm all medication schedules with a caregiver.');
    const activityPanel = document.getElementById('dashboard-activities');
    const activityNotes = ['daily-reminders', 'specific-tasks', 'exercise'].filter((id) => data.topicNotes?.[id]);
    if (!activityNotes.length) appendText(activityPanel, 'No meal or activity notes have been added.');
    activityNotes.forEach((id) => appendText(activityPanel, data.topicNotes[id]));
  }).catch((error) => window.ReMind.showToast(error.message));
})();
