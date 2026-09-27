(function () {
  'use strict';

  const progressKey = 'reMIND.daily.progress.v2';
  const progressByRoutine = readProgress();
  let activePeriod = 'morning';
  let audioPreferences = {};
  let engineParameters = {};
  let routines = [];
  let renderVersion = 0;

  function readProgress() {
    try {
      return JSON.parse(localStorage.getItem(progressKey)) || {};
    } catch {
      return {};
    }
  }

  function saveProgress() {
    localStorage.setItem(progressKey, JSON.stringify(progressByRoutine));
  }

  function addButton(container, label, className, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `button ${className}`;
    button.textContent = label;
    button.addEventListener('click', action);
    container.append(button);
    return button;
  }

  function activeRoutine() {
    return routines.filter(routine => routine.slot === activePeriod)
      .sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0))[0] || null;
  }

  function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  async function render() {
    const version = ++renderVersion;
    const routine = activeRoutine();
    const steps = routine?.steps || [];
    document.querySelectorAll('[data-period]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.period === activePeriod));
    });

    const answerGrid = document.getElementById('answer-grid');
    const feedback = document.getElementById('answer-feedback');
    const question = document.getElementById('recall-question');
    const photoIcon = document.getElementById('daily-photo-icon');
    const playButton = document.getElementById('play-voice-cue');
    const stepCounter = document.getElementById('step-counter');
    const trainerStatus = document.getElementById('trainer-status');
    const progress = document.getElementById('progress-dots');
    progress.replaceChildren();

    if (!routine) {
      stepCounter.textContent = `No routine set up yet for ${activePeriod}.`;
      photoIcon.replaceChildren();
      playButton.hidden = true;
      question.querySelector('h2').textContent = 'Set up a routine';
      answerGrid.replaceChildren();
      feedback.textContent = '';
      const empty = document.createElement('p');
      empty.textContent = `No routine set up yet for ${activePeriod}.`;
      const link = document.createElement('a');
      link.className = 'button button-primary';
      link.href = '/routine-builder.html';
      link.textContent = 'Add a routine';
      answerGrid.append(empty, link);
      trainerStatus.textContent = 'Choose Manage Routines to create steps for this time of day.';
      return;
    }

    const stepIndex = Math.min(progressByRoutine[routine.id] || 0, steps.length);
    steps.forEach((step, index) => {
      const dot = document.createElement('span');
      dot.className = `progress-dot${index < stepIndex ? ' is-done' : ''}${index === stepIndex && stepIndex < steps.length ? ' is-current' : ''}`;
      dot.setAttribute('aria-label', `Step ${index + 1}${index < stepIndex ? ' complete' : index === stepIndex ? ' current' : ''}`);
      progress.append(dot);
    });

    answerGrid.replaceChildren();
    question.querySelector('h2').textContent = 'What comes next?';
    question.hidden = false;
    playButton.hidden = false;
    playButton.innerHTML = `${window.ReMind.icons.speaker()}<span>Play voice cue</span>`;
    playButton.onclick = null;

    if (stepIndex >= steps.length) {
      stepCounter.textContent = `${routine.name} · Routine complete`;
      photoIcon.innerHTML = window.ReMind.icons.learning();
      feedback.textContent = '';
      const finished = document.createElement('p');
      finished.textContent = 'This routine session is complete.';
      answerGrid.append(finished);
      addButton(answerGrid, 'Start this routine again', 'button-secondary', () => {
        progressByRoutine[routine.id] = 0;
        saveProgress();
        void render();
      });
      trainerStatus.textContent = 'Take a break whenever you like.';
      return;
    }

    const step = steps[stepIndex];
    playButton.onclick = () => window.ReMindVoice.fetchAndPlayPhrase(
      step.id,
      playButton,
      step.cuePhrase ? 'Voice cue is not available yet.' : 'No audio has been added for this step.',
      { suppressPhraseText: true }
    );
    stepCounter.textContent = `${routine.name} · Step ${stepIndex + 1} of ${steps.length}`;
    const override = audioPreferences.cueLevelOverride;
    let training;
    try {
      training = await window.ReMindTrainer.getStepState(routine.id, step.id);
    } catch (error) {
      if (version === renderVersion) window.ReMind.showToast(error.message);
      return;
    }
    if (version !== renderVersion) return;
    const cueLevel = override === 'automatic' || override == null ? training.cueLevel : Number(override);
    const icon = window.ReMind.icons[step.icon] || window.ReMind.icons.checklist;
    photoIcon.innerHTML = icon();
    photoIcon.dataset.category = step.icon === 'pill' ? 'medication' : step.icon === 'exercise' ? 'exercise' : step.icon === 'music' ? 'music' : 'schedule';
    feedback.textContent = '';
    trainerStatus.textContent = `${window.ReMindTrainer.cueLevels[cueLevel]} · Recall interval: ${training.intervalDays} day${training.intervalDays === 1 ? '' : 's'} · Consecutive successes: ${training.consecutiveSuccesses}`;

    shuffle(steps).forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button button-secondary answer-button';
      button.textContent = option.label;
      button.addEventListener('click', async () => {
        answerGrid.querySelectorAll('button').forEach(answer => { answer.disabled = true; });
        const correct = option.id === step.id;
        try {
          training = await window.ReMindTrainer.recordStepAnswer(routine.id, step.id, correct, activePeriod);
        } catch (error) {
          window.ReMind.showToast(error.message);
          void render();
          return;
        }
        answerGrid.replaceChildren();
        if (!correct) {
          feedback.textContent = `That's okay. The next step is ${step.label}.`;
          trainerStatus.textContent = `${training.cueName} · Recall interval: ${training.intervalDays} day${training.intervalDays === 1 ? '' : 's'} · Consecutive successes: ${training.consecutiveSuccesses}`;
          addButton(answerGrid, 'Try again', 'button-secondary', () => { void render(); });
        } else {
          feedback.textContent = `That's right. The next step is ${step.label}.`;
          addButton(answerGrid, 'Continue', 'button-primary', () => advanceStep(routine, steps.length));
        }
      });
      answerGrid.append(button);
    });
  }

  function advanceStep(routine, stepCount) {
    progressByRoutine[routine.id] = (progressByRoutine[routine.id] || 0) + 1;
    if (progressByRoutine[routine.id] >= stepCount) {
      window.ReMindTrainer.completeSession(activePeriod);
    }
    saveProgress();
    void render();
  }

  document.querySelectorAll('[data-period]').forEach((button) => {
    button.addEventListener('click', () => {
      activePeriod = button.dataset.period;
      void render();
    });
  });

  Promise.all([
    fetch('/api/routines', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(response => { if (!response.ok) throw new Error('Could not load routines.'); return response.json(); }),
    window.ReMind.fetchSession()
  ]).then(([savedRoutines, data]) => {
    routines = savedRoutines;
    audioPreferences = data.uiPreferences || {};
    engineParameters = data.engineParameters || {};
    if (data.engineParameters) window.ReMindTrainer.setParameters(data.engineParameters);
    void render();
  }).catch((error) => {
    void render();
    window.ReMind.showToast(error.message);
  });
})();
