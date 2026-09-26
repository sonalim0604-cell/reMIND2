(function () {
  'use strict';

  const storageKey = 'reMIND.trainer.v1';
  const periods = ['morning', 'afternoon', 'night'];
  const cueLevels = ['Full cue', 'Photo only', 'Short prompt', 'No cue'];
  const defaultParameters = { startInterval: 1, multiplier: 2, fadeAfterSessions: 2 };
  const routines = {
    morning: [
      { title: 'Get ready for the day', description: 'Wash, dress, and take your time.', icon: 'clockCalendar', phraseKey: 'daily_reminder_1' },
      { title: 'Have breakfast', description: 'Sit somewhere comfortable and enjoy breakfast.', icon: 'learning', phraseKey: 'specific_task_prompt_1' },
      { title: 'Take a short walk', description: 'Move at a comfortable pace, with support if needed.', icon: 'exercise', phraseKey: 'exercise_prompt_1' }
    ],
    afternoon: [
      { title: 'Have lunch', description: 'Enjoy a meal and a drink of water.', icon: 'learning', phraseKey: 'specific_task_prompt_2' },
      { title: 'Take a rest', description: 'A quiet pause is part of a good routine.', icon: 'clockCalendar', phraseKey: 'daily_reminder_2' },
      { title: 'Enjoy an activity', description: 'Choose something familiar that feels pleasant.', icon: 'music', phraseKey: 'nostalgic_song_prompt_1' }
    ],
    night: [
      { title: 'Get ready for bed', description: 'Begin the familiar evening routine.', icon: 'clockCalendar', phraseKey: 'daily_reminder_1' },
      { title: 'Brush your teeth', description: 'Use the usual toothbrush and toothpaste.', icon: 'checklist', phraseKey: 'specific_task_prompt_1' },
      { title: 'Settle in for the night', description: 'Get comfortable and rest.', icon: 'learning', phraseKey: 'daily_reminder_2' }
    ]
  };
  const lastCorrectPositions = {};

  function freshState() {
    return {
      parameters: { ...defaultParameters },
      periods: Object.fromEntries(periods.map((period) => [period, {
        intervalIndex: 0,
        lastSuccessfulInterval: 0,
        cueLevel: 0,
        streak: 0,
        targetSessions: 0
      }])),
      sessionHistory: [],
      promptsByDate: {}
    };
  }

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved || typeof saved !== 'object') return freshState();
      const defaults = freshState();
      return {
        ...defaults,
        ...saved,
        parameters: { ...defaultParameters, ...(saved.parameters || {}) },
        periods: Object.fromEntries(periods.map((period) => [period, {
          ...defaults.periods[period],
          ...(saved.periods?.[period] || {})
        }])),
        sessionHistory: Array.isArray(saved.sessionHistory) ? saved.sessionHistory : [],
        promptsByDate: saved.promptsByDate || {}
      };
    } catch {
      return freshState();
    }
  }

  let state = readState();

  function save() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function currentIntervals() {
    const start = Math.max(1, Number(state.parameters.startInterval) || 1);
    const multiplier = Math.max(1.2, Number(state.parameters.multiplier) || 2);
    return Array.from({ length: 5 }, (_, index) => Math.min(365, Math.max(1, Math.round(start * (multiplier ** index)))));
  }

  function getState(period) {
    const key = periods.includes(period) ? period : 'morning';
    const periodState = state.periods[key];
    const intervals = currentIntervals();
    return {
      ...periodState,
      period: key,
      intervalDays: intervals[Math.min(periodState.intervalIndex, intervals.length - 1)],
      intervals,
      cueName: cueLevels[Math.min(periodState.cueLevel, cueLevels.length - 1)],
      targetIndex: intervals.length - 1
    };
  }

  function getRoutine(period) {
    const key = periods.includes(period) ? period : 'morning';
    return routines[key].map((step) => ({ ...step }));
  }

  function getAnswerOptions(period, answerIndex) {
    const key = periods.includes(period) ? period : 'morning';
    const routine = routines[key];
    const targetIndex = Math.max(0, Math.min(routine.length - 1, Number(answerIndex) || 0));
    const options = routine.map((step, index) => ({ step: { ...step }, index }));
    for (let index = options.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
    }

    const positionKey = `${key}:${targetIndex}`;
    let correctPosition = options.findIndex((option) => option.index === targetIndex);
    if (options.length > 1 && lastCorrectPositions[positionKey] === correctPosition) {
      const nextPosition = (correctPosition + 1) % options.length;
      [options[correctPosition], options[nextPosition]] = [options[nextPosition], options[correctPosition]];
      correctPosition = nextPosition;
    }
    lastCorrectPositions[positionKey] = correctPosition;
    return options;
  }

  function recordAnswer(period, correct) {
    const key = periods.includes(period) ? period : 'morning';
    const periodState = state.periods[key];
    if (!correct) {
      const today = new Date().toISOString().slice(0, 10);
      state.promptsByDate[today] = (state.promptsByDate[today] || 0) + 1;
      periodState.intervalIndex = periodState.lastSuccessfulInterval;
      periodState.streak = 0;
      periodState.targetSessions = 0;
      save();
      return { ...getState(key), retrySoon: true };
    }

    periodState.intervalIndex = Math.min(periodState.intervalIndex + 1, currentIntervals().length - 1);
    periodState.lastSuccessfulInterval = periodState.intervalIndex;
    periodState.streak += 1;
    save();
    return { ...getState(key), retrySoon: false };
  }

  function completeSession(period) {
    const key = periods.includes(period) ? period : 'morning';
    const periodState = state.periods[key];
    const targetIndex = currentIntervals().length - 1;
    if (periodState.intervalIndex >= targetIndex) {
      periodState.targetSessions += 1;
      if (periodState.targetSessions >= Math.max(1, Number(state.parameters.fadeAfterSessions) || 2)) {
        periodState.cueLevel = Math.min(periodState.cueLevel + 1, cueLevels.length - 1);
        periodState.targetSessions = 0;
      }
    } else {
      periodState.targetSessions = 0;
    }
    state.sessionHistory.push({ period: key, completedAt: new Date().toISOString() });
    state.sessionHistory = state.sessionHistory.slice(-500);
    save();
    return getState(key);
  }

  function setParameters(parameters) {
    state.parameters = {
      ...state.parameters,
      startInterval: Math.min(30, Math.max(1, Number(parameters.startInterval) || 1)),
      multiplier: Math.min(4, Math.max(1.2, Number(parameters.multiplier) || 2)),
      fadeAfterSessions: Math.min(10, Math.max(1, Number(parameters.fadeAfterSessions) || 2))
    };
    save();
    return { ...state.parameters };
  }

  function getSummary() {
    const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentSessions = state.sessionHistory.filter((session) => Date.parse(session.completedAt) >= weekStart);
    const promptDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return { date: key, count: state.promptsByDate[key] || 0 };
    });
    const currentStates = periods.map((period) => getState(period));
    return {
      sessionsThisWeek: recentSessions.length,
      longestInterval: Math.max(...currentStates.map((periodState) => periodState.intervalDays)),
      streak: Math.max(...currentStates.map((periodState) => periodState.streak)),
      cueLevels: currentStates.map(({ period, cueName, intervalDays }) => ({ period, cueName, intervalDays })),
      promptsByDay: promptDays
    };
  }

  window.ReMindTrainer = Object.freeze({ periods, cueLevels, getState, getRoutine, getAnswerOptions, recordAnswer, completeSession, setParameters, getSummary });
})();
