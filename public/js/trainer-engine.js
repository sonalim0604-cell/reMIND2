(function () {
  'use strict';

  const storageKey = 'reMIND.trainer.v1';
  const periods = ['morning', 'afternoon', 'evening', 'night'];
  const cueLevels = ['Full cue', 'Photo only', 'Short prompt', 'No cue'];
  const defaultParameters = { startInterval: 1, multiplier: 2, fadeAfterSessions: 2 };
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

  async function getStepState(routineId, stepId) {
    const response = await fetch(`/api/routines/${encodeURIComponent(routineId)}/steps/${encodeURIComponent(stepId)}/state`, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not load this step’s training progress.');
    return result;
  }

  async function recordStepAnswer(routineId, stepId, correct, period) {
    const response = await fetch(`/api/routines/${encodeURIComponent(routineId)}/steps/${encodeURIComponent(stepId)}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ correct, parameters: state.parameters })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not save this step’s training progress.');
    recordAnswer(period, correct);
    return result;
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

  window.ReMindTrainer = Object.freeze({ periods, cueLevels, getState, recordAnswer, completeSession, setParameters, getSummary, getStepState, recordStepAnswer });
})();
