(function () {
  'use strict';

  const progressKey = 'reMIND.daily.progress.v1';
  const stepsByPeriod = readProgress();
  let activePeriod = 'morning';
  let audioPreferences = {};

  function readProgress() {
    try {
      return JSON.parse(localStorage.getItem(progressKey)) || { morning: 0, afternoon: 0, night: 0, completed: {} };
    } catch {
      return { morning: 0, afternoon: 0, night: 0, completed: {} };
    }
  }

  function saveProgress() {
    localStorage.setItem(progressKey, JSON.stringify(stepsByPeriod));
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

  function visualForStep(step) {
    const title = step.title.toLowerCase();
    if (title.includes('medication') || title.includes('medicine') || step.icon === 'pill') {
      return { icon: 'pill', category: 'medication' };
    }
    if (title.includes('breakfast') || title.includes('lunch') || title.includes('meal')) {
      return { icon: 'plate', category: 'kitchen' };
    }
    if (title.includes('walk') || title.includes('movement') || title.includes('exercise') || step.icon === 'exercise') {
      return { icon: 'exercise', category: 'exercise' };
    }
    if (title.includes('activity') || title.includes('song') || step.icon === 'music') {
      return { icon: 'music', category: 'music' };
    }
    return { icon: step.icon, category: 'schedule' };
  }

  function render() {
    const steps = window.ReMindTrainer.getRoutine(activePeriod);
    const stepIndex = Math.min(stepsByPeriod[activePeriod] || 0, steps.length);
    const engineState = window.ReMindTrainer.getState(activePeriod);
    document.querySelectorAll('[data-period]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.period === activePeriod));
    });

    const progress = document.getElementById('progress-dots');
    progress.replaceChildren();
    steps.forEach((step, index) => {
      const dot = document.createElement('span');
      dot.className = `progress-dot${index < stepIndex ? ' is-done' : ''}${index === stepIndex && stepIndex < steps.length ? ' is-current' : ''}`;
      dot.setAttribute('aria-label', `Step ${index + 1}${index < stepIndex ? ' complete' : index === stepIndex ? ' current' : ''}`);
      progress.append(dot);
    });

    const answerGrid = document.getElementById('answer-grid');
    answerGrid.replaceChildren();
    const feedback = document.getElementById('answer-feedback');
    const question = document.getElementById('recall-question');
    const photoIcon = document.getElementById('daily-photo-icon');
    const playButton = document.getElementById('play-voice-cue');
    playButton.innerHTML = `${window.ReMind.icons.speaker()}<span>Play voice cue</span>`;
    playButton.onclick = null;

    if (stepIndex >= steps.length) {
      document.getElementById('step-counter').textContent = 'Routine complete';
      photoIcon.innerHTML = window.ReMind.renderCategoryIcon('learning', 'schedule');
      question.hidden = false;
      const finished = document.createElement('p');
      finished.className = 'answer-feedback';
      finished.textContent = 'This routine session is complete.';
      answerGrid.append(finished);
      addButton(answerGrid, 'Start this routine again', 'button-secondary', () => {
        stepsByPeriod[activePeriod] = 0;
        stepsByPeriod.completed[activePeriod] = false;
        saveProgress();
        render();
      });
      document.getElementById('trainer-status').textContent = `${engineState.cueName} · Recall interval: ${engineState.intervalDays} day${engineState.intervalDays === 1 ? '' : 's'}`;
      return;
    }

    const step = steps[stepIndex];
    playButton.onclick = () => window.ReMindVoice.fetchAndPlayPhrase(step.phraseKey, playButton, 'Voice cue is not available yet.', { suppressPhraseText: true });
    document.getElementById('step-counter').textContent = `${activePeriod[0].toUpperCase()}${activePeriod.slice(1)} · Step ${stepIndex + 1} of ${steps.length}`;
    const override = audioPreferences.cueLevelOverride;
    const cueLevel = override === 'automatic' || override == null ? engineState.cueLevel : Number(override);
    const visual = visualForStep(step);
    photoIcon.innerHTML = window.ReMind.renderCategoryIcon(visual.icon, visual.category);
    photoIcon.dataset.category = visual.category;
    question.hidden = false;
    feedback.textContent = '';
    document.getElementById('trainer-status').textContent = `${window.ReMindTrainer.cueLevels[cueLevel]} · Recall interval: ${engineState.intervalDays} day${engineState.intervalDays === 1 ? '' : 's'} · Streak: ${engineState.streak}`;

    const answerOptions = window.ReMindTrainer.getAnswerOptions(activePeriod, stepIndex);
    answerOptions.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button button-secondary answer-button';
      button.textContent = option.step.title;
      button.addEventListener('click', () => {
        const correct = option.index === stepIndex;
        window.ReMindTrainer.recordAnswer(activePeriod, correct);
        answerGrid.replaceChildren();
        if (!correct) {
          feedback.textContent = `That's okay. The next step is ${step.title}. ${step.description}`;
          addButton(answerGrid, 'Try again', 'button-secondary', render);
        } else {
          feedback.textContent = `That's right. The next step is ${step.title}. ${step.description}`;
          addButton(answerGrid, 'Continue', 'button-primary', advanceStep);
        }
      });
      answerGrid.append(button);
    });
  }

  function advanceStep() {
    const steps = window.ReMindTrainer.getRoutine(activePeriod);
    stepsByPeriod[activePeriod] = (stepsByPeriod[activePeriod] || 0) + 1;
    if (stepsByPeriod[activePeriod] >= steps.length && !stepsByPeriod.completed[activePeriod]) {
      window.ReMindTrainer.completeSession(activePeriod);
      stepsByPeriod.completed[activePeriod] = true;
    }
    saveProgress();
    render();
  }

  document.querySelectorAll('[data-period]').forEach((button) => {
    button.addEventListener('click', () => {
      activePeriod = button.dataset.period;
      render();
    });
  });

  window.ReMind.fetchSession().then((data) => {
    audioPreferences = data.uiPreferences || {};
    if (data.engineParameters) window.ReMindTrainer.setParameters(data.engineParameters);
    render();
  }).catch((error) => {
    render();
    window.ReMind.showToast(error.message);
  });
})();
