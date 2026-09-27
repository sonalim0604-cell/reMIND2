(() => {
  'use strict';

  const routines = window.ReMindRoutineData;
  const picker = document.querySelector('#routine-picker');
  const activity = document.querySelector('#routine-activity');
  const title = document.querySelector('#selected-routine-title');
  const cards = document.querySelector('#step-cards');
  const order = document.querySelector('#your-order');
  const message = document.querySelector('#routine-message');
  let currentRoutine = null;
  let remaining = [];
  let chosen = [];
  let stepIndex = 0;
  let hintCount = 0;
  let revealTimer = null;
  let revealing = false;

  function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function stepIcon(step) {
    const categories = ['kitchen', 'clothing', 'nostalgia', 'schedule', 'medication', 'exercise', 'music'];
    const category = categories.includes(step.category) ? step.category : 'schedule';
    return `<span class="category-icon category-icon--${category} activity-emoji" aria-hidden="true">${step.icon}</span>`;
  }

  function renderPicker() {
    routines.forEach(routine => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button button-secondary activity-card routine-select-card';
      button.innerHTML = `<span class="category-icon category-icon--schedule activity-emoji" aria-hidden="true">${routine.icon}</span><span>${routine.name}</span>`;
      button.addEventListener('click', () => startRoutine(routine));
      picker.append(button);
    });
  }

  function render() {
    cards.replaceChildren();
    order.replaceChildren();
    remaining.forEach(step => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button button-secondary activity-card routine-step-card';
      button.dataset.stepId = step.label;
      button.disabled = revealing;
      button.innerHTML = `${stepIcon(step)}<span>${step.label}</span>`;
      button.addEventListener('click', () => chooseStep(step));
      cards.append(button);
    });

    chosen.forEach(step => {
      const item = document.createElement('li');
      item.className = 'routine-ordered-step';
      item.innerHTML = `${stepIcon(step)}<span>${step.label}</span>`;
      order.append(item);
    });

    if (currentRoutine && stepIndex === currentRoutine.steps.length) {
      message.textContent = 'The routine is complete. Well done, one step at a time.';
    }
  }

  function startRoutine(routine) {
    window.clearTimeout(revealTimer);
    currentRoutine = routine;
    remaining = shuffle(routine.steps);
    chosen = [];
    stepIndex = 0;
    hintCount = 0;
    revealing = false;
    title.textContent = routine.name;
    message.textContent = '';
    activity.hidden = false;
    render();
    title.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function advance(step, feedback) {
    chosen.push(step);
    remaining = remaining.filter(candidate => candidate !== step);
    stepIndex += 1;
    hintCount = 0;
    revealing = false;
    message.textContent = feedback;
    render();
  }

  function revealNextStep(step) {
    revealing = true;
    render();
    const card = [...cards.querySelectorAll('[data-step-id]')]
      .find(candidate => candidate.dataset.stepId === step.label);
    card?.classList.add('routine-step-revealed');
    message.textContent = `Here's the next step — ${step.label}.`;
    revealTimer = window.setTimeout(() => advance(step, `Here's the next step — ${step.label}.`), 1100);
  }

  function chooseStep(step) {
    if (revealing || stepIndex >= currentRoutine.steps.length) return;
    const expected = currentRoutine.steps[stepIndex];
    if (step === expected) {
      advance(step, `Yes, ${step.label} is next. Well done.`);
      return;
    }

    hintCount += 1;
    if (hintCount === 1) {
      message.textContent = `💡 Hint: ${expected.hint1}`;
    } else if (hintCount === 2) {
      message.textContent = `💡 ${expected.hint2}`;
    } else {
      revealNextStep(expected);
    }
  }

  document.querySelector('#try-again').addEventListener('click', () => startRoutine(currentRoutine));
  renderPicker();
})();
