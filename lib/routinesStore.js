'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const session = require('express-session');

const dataDirectory = path.join(__dirname, '..', 'data');
const routinesFile = path.join(dataDirectory, 'routines.json');
const sessionsFile = path.join(dataDirectory, 'sessions.json');
const stepCueDirectory = path.join(__dirname, '..', 'audio-cache', 'step-cues');
const audioCacheDirectory = path.join(__dirname, '..', 'audio-cache');
const cueLevelNames = ['Full cue', 'Photo only', 'Short prompt', 'No cue'];

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(dataDirectory, { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function stepCuePath(sessionId, stepId) {
  return path.join(stepCueDirectory, sessionId, `${stepId}.mp3`);
}

function removeStepRecording(sessionId, stepId) {
  fs.rmSync(stepCuePath(sessionId, stepId), { force: true });
  fs.rmSync(path.join(audioCacheDirectory, sessionId, 'step-phrases', `${stepId}.mp3`), { force: true });
}

function readRoutineData() {
  return readJson(routinesFile, { routinesBySession: {}, stepStatesBySession: {} });
}

function getRoutines(sessionId) {
  const data = readRoutineData();
  return [...(data.routinesBySession[sessionId] || [])]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function saveRoutine(sessionId, routine) {
  if (!sessionId) throw new TypeError('A session ID is required.');
  const data = readRoutineData();
  const routines = data.routinesBySession[sessionId] || [];
  const existing = routines.find(item => item.id === routine.id);
  const previousSteps = new Map((existing?.steps || []).map(step => [step.id, step]));
  const now = new Date().toISOString();
  const saved = {
    id: routine.id || crypto.randomUUID(),
    slot: routine.slot,
    name: routine.name,
    steps: routine.steps.map(step => {
      const previous = previousSteps.get(step.id);
      return {
        id: step.id || crypto.randomUUID(),
        label: step.label,
        icon: step.icon,
        cuePhrase: step.cuePhrase || '',
        ...(previous?.personalRecording ? {
          personalRecording: true,
          personalRecordingMimeType: previous.personalRecordingMimeType || 'audio/webm',
          personalRecordingAt: previous.personalRecordingAt
        } : {})
      };
    }),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  const retainedStepIds = new Set(saved.steps.map(step => step.id));
  (existing?.steps || []).forEach(step => {
    if (!retainedStepIds.has(step.id)) {
      removeStepRecording(sessionId, step.id);
      delete data.stepStatesBySession[sessionId]?.[step.id];
    }
  });
  data.routinesBySession[sessionId] = [...routines.filter(item => item.id !== saved.id), saved];
  writeJson(routinesFile, data);
  return saved;
}

function deleteRoutine(sessionId, routineId) {
  const data = readRoutineData();
  const routines = data.routinesBySession[sessionId] || [];
  const removed = routines.find(item => item.id === routineId);
  data.routinesBySession[sessionId] = routines.filter(item => item.id !== routineId);
  if (removed) {
    const states = data.stepStatesBySession[sessionId] || {};
    removed.steps.forEach(step => {
      delete states[step.id];
      removeStepRecording(sessionId, step.id);
    });
    data.stepStatesBySession[sessionId] = states;
  }
  writeJson(routinesFile, data);
  return Boolean(removed);
}

function findStep(sessionId, stepId) {
  const routine = getRoutines(sessionId).find(item => item.steps.some(step => step.id === stepId));
  return routine ? { routine, step: routine.steps.find(step => step.id === stepId) } : null;
}

function markStepRecording(sessionId, stepId, mimeType) {
  const data = readRoutineData();
  const routine = (data.routinesBySession[sessionId] || []).find(item => item.steps.some(step => step.id === stepId));
  if (!routine) return null;
  const step = routine.steps.find(item => item.id === stepId);
  step.personalRecording = true;
  step.personalRecordingMimeType = mimeType;
  step.personalRecordingAt = new Date().toISOString();
  routine.updatedAt = step.personalRecordingAt;
  writeJson(routinesFile, data);
  return step;
}

function reorderSteps(sessionId, routineId, newStepOrder) {
  const data = readRoutineData();
  const routines = data.routinesBySession[sessionId] || [];
  const routine = routines.find(item => item.id === routineId);
  if (!routine) return null;
  const stepsById = new Map(routine.steps.map(step => [step.id, step]));
  const ordered = newStepOrder.map(id => stepsById.get(id)).filter(Boolean);
  const included = new Set(ordered.map(step => step.id));
  routine.steps = [...ordered, ...routine.steps.filter(step => !included.has(step.id))];
  routine.updatedAt = new Date().toISOString();
  writeJson(routinesFile, data);
  return routine;
}

function defaultStepState(stepId) {
  return {
    stepId,
    intervalDays: 1,
    intervalIndex: 0,
    lastSuccessfulInterval: 0,
    cueLevel: 0,
    cueName: cueLevelNames[0],
    consecutiveSuccesses: 0,
    totalAnswers: 0
  };
}

function getStepState(sessionId, stepId) {
  const data = readRoutineData();
  return {
    ...defaultStepState(stepId),
    ...(data.stepStatesBySession[sessionId]?.[stepId] || {})
  };
}

function recordStepAnswer(sessionId, stepId, correct, parameters = {}) {
  const data = readRoutineData();
  const states = data.stepStatesBySession[sessionId] || {};
  const state = { ...defaultStepState(stepId), ...(states[stepId] || {}) };
  const startInterval = Math.max(1, Math.min(30, Number(parameters.startInterval) || 1));
  const multiplier = Math.max(1.2, Math.min(4, Number(parameters.multiplier) || 2));
  const fadeAfterSessions = Math.max(1, Math.min(10, Number(parameters.fadeAfterSessions) || 2));

  if (correct) {
    state.consecutiveSuccesses += 1;
    state.intervalIndex = Math.min(state.intervalIndex + 1, 4);
    state.lastSuccessfulInterval = state.intervalIndex;
    state.intervalDays = Math.min(365, Math.max(startInterval, Math.round(startInterval * multiplier ** state.intervalIndex)));
    if (state.consecutiveSuccesses % fadeAfterSessions === 0) {
      state.cueLevel = Math.min(state.cueLevel + 1, cueLevelNames.length - 1);
    }
  } else {
    state.consecutiveSuccesses = 0;
    state.intervalIndex = state.lastSuccessfulInterval;
    state.intervalDays = Math.min(365, Math.max(startInterval, Math.round(startInterval * multiplier ** state.intervalIndex)));
    state.cueLevel = Math.max(0, state.cueLevel - 1);
  }

  state.cueName = cueLevelNames[state.cueLevel];
  state.totalAnswers += 1;
  state.lastAnsweredAt = new Date().toISOString();
  states[stepId] = state;
  data.stepStatesBySession[sessionId] = states;
  writeJson(routinesFile, data);
  return state;
}

function getTrainingData(sessionId) {
  return getRoutines(sessionId).map(routine => ({
    ...routine,
    steps: routine.steps.map(step => ({ ...step, training: getStepState(sessionId, step.id) }))
  }));
}

class PersistentSessionStore extends session.Store {
  get(sessionId, callback) {
    try {
      const sessions = readJson(sessionsFile, {});
      const saved = sessions[sessionId];
      if (saved?.cookie?.expires && Date.parse(saved.cookie.expires) <= Date.now()) {
        delete sessions[sessionId];
        writeJson(sessionsFile, sessions);
        return callback(null, null);
      }
      callback(null, saved || null);
    } catch (error) {
      callback(error);
    }
  }

  set(sessionId, value, callback = () => {}) {
    try {
      const sessions = readJson(sessionsFile, {});
      sessions[sessionId] = value;
      writeJson(sessionsFile, sessions);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  touch(sessionId, value, callback = () => {}) {
    this.set(sessionId, value, callback);
  }

  destroy(sessionId, callback = () => {}) {
    try {
      const sessions = readJson(sessionsFile, {});
      delete sessions[sessionId];
      writeJson(sessionsFile, sessions);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }
}

module.exports = {
  getRoutines,
  saveRoutine,
  deleteRoutine,
  reorderSteps,
  findStep,
  markStepRecording,
  stepCuePath,
  getStepState,
  recordStepAnswer,
  getTrainingData,
  PersistentSessionStore
};
