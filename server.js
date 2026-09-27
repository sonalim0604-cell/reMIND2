require('dotenv').config();

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloneVoice, generateSpeech } = require('./lib/elevenLabsService');
const reminderPhrases = require('./data/reminderPhrases');
const routinesStore = require('./lib/routinesStore');

const app = express();
app.set('trust proxy', 1);
const port = Number(process.env.PORT) || 3000;
const sessionSecret = process.env.SESSION_SECRET || 'reMIND-local-development-secret';
const sessionCookieName = 'remind.sid';
const uploadsDirectory = path.join(__dirname, 'uploads');
const audioCacheDirectory = path.join(__dirname, 'audio-cache');
fs.mkdirSync(uploadsDirectory, { recursive: true });
fs.mkdirSync(audioCacheDirectory, { recursive: true });

const audioUpload = multer({
  storage: multer.diskStorage({
    destination: uploadsDirectory,
    filename: (req, file, callback) => {
      const extensionByType = {
        'audio/webm': '.webm',
        'audio/ogg': '.ogg',
        'audio/mp4': '.m4a',
        'audio/mpeg': '.mp3',
        'audio/wav': '.wav',
        'audio/x-wav': '.wav'
      };
      const extension = extensionByType[file.mimetype.split(';')[0].toLowerCase()] || '.audio';
      callback(null, `session-${req.sessionID}-${Date.now()}${extension}`);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.toLowerCase().startsWith('audio/')) {
      return callback(new Error('Please upload an audio recording.'));
    }
    callback(null, true);
  }
}).single('audio');

const phraseUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      const sessionDirectory = path.join(audioCacheDirectory, req.sessionID);
      fs.mkdirSync(sessionDirectory, { recursive: true });
      callback(null, sessionDirectory);
    },
    filename: (req, file, callback) => callback(null, `${req.params.key}.mp3`)
  }),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!Object.hasOwn(reminderPhrases, req.params.key)) {
      return callback(new Error('Choose a valid reminder phrase.'));
    }
    if (!['audio/mpeg', 'audio/mp3'].includes(file.mimetype.toLowerCase())) {
      return callback(new Error('Please upload an MP3 audio clip.'));
    }
    callback(null, true);
  }
}).single('audio');

const stepCueUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      const destination = path.dirname(routinesStore.stepCuePath(req.sessionID, req.params.stepId));
      fs.mkdirSync(destination, { recursive: true });
      callback(null, destination);
    },
    filename: (req, file, callback) => callback(null, `${req.params.stepId}.mp3`)
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.toLowerCase().startsWith('audio/')) return callback(new Error('Please record an audio cue.'));
    callback(null, true);
  }
}).single('audio');

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(session({
  name: sessionCookieName,
  secret: sessionSecret,
  store: new routinesStore.PersistentSessionStore(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

const routineSlots = new Set(['morning', 'afternoon', 'evening', 'night']);
const routineIcons = new Set([
  'clockCalendar', 'calendar', 'pill', 'checklist', 'exercise', 'music', 'musicalNote',
  'learning', 'person', 'speaker', 'cup', 'spoon', 'plate', 'key', 'glasses', 'umbrella',
  'book', 'shirt', 'hat', 'sock', 'oldRadio', 'rotaryTelephone', 'recordPlayer',
  'filmCamera', 'sewingMachine', 'traditionalLamp', 'lightbulb'
]);

function persistRoutineSession(req, res, next) {
  if (req.session.routinesSessionInitialized) return next();
  req.session.routinesSessionInitialized = true;
  req.session.save((error) => {
    if (error) return res.status(500).json({ error: 'Unable to initialize your routine session.' });
    next();
  });
}

function validateRoutine(body, id) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Routine data is required.' };
  if (!routineSlots.has(body.slot)) return { error: 'Choose a valid time-of-day slot.' };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 100) return { error: 'Routine name must be between 1 and 100 characters.' };
  if (!Array.isArray(body.steps) || body.steps.length > 200) return { error: 'Routine steps must be a list of 200 items or fewer.' };
  if (!body.steps.length) return { error: 'Add at least one step to the routine.' };

  const usedIds = new Set();
  const steps = [];
  for (const step of body.steps) {
    if (!step || typeof step !== 'object' || Array.isArray(step)) return { error: 'Each routine step must be an object.' };
    const label = typeof step.label === 'string' ? step.label.trim() : '';
    const cuePhrase = typeof step.cuePhrase === 'string' ? step.cuePhrase.trim() : '';
    if (!label || label.length > 120 || cuePhrase.length > 300) return { error: 'Step labels must be 1-120 characters and cue phrases 300 characters or fewer.' };
    if (!routineIcons.has(step.icon)) return { error: 'Choose an icon from the available app icons.' };
    const stepId = typeof step.id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(step.id) ? step.id : require('crypto').randomUUID();
    if (usedIds.has(stepId)) return { error: 'Each step needs a unique ID.' };
    usedIds.add(stepId);
    steps.push({ id: stepId, label, icon: step.icon, cuePhrase });
  }

  return { routine: { id: id || (typeof body.id === 'string' ? body.id : undefined), slot: body.slot, name, steps } };
}

console.log('Server starting, registering routes...');
app.get('/api/routines', persistRoutineSession, (req, res) => {
  try {
    res.json(routinesStore.getRoutines(req.sessionID));
  } catch {
    res.status(500).json({ error: 'Unable to load routines.' });
  }
});
console.log('Routines route registered');

app.get('/api/routines/training', persistRoutineSession, (req, res) => {
  try {
    res.json(routinesStore.getTrainingData(req.sessionID));
  } catch {
    res.status(500).json({ error: 'Unable to load routine training progress.' });
  }
});

app.post('/api/routines', persistRoutineSession, (req, res) => {
  const result = validateRoutine(req.body);
  if (result.error) return res.status(400).json({ error: result.error });
  try {
    const routine = routinesStore.saveRoutine(req.sessionID, result.routine);
    res.status(201).json(routine);
  } catch {
    res.status(500).json({ error: 'Unable to save this routine.' });
  }
});

app.put('/api/routines/:id', persistRoutineSession, (req, res) => {
  const existing = routinesStore.getRoutines(req.sessionID).find(routine => routine.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Routine not found.' });
  const result = validateRoutine(req.body, req.params.id);
  if (result.error) return res.status(400).json({ error: result.error });
  try {
    routinesStore.saveRoutine(req.sessionID, result.routine);
    const ordered = routinesStore.reorderSteps(req.sessionID, req.params.id, result.routine.steps.map(step => step.id));
    res.json(ordered);
  } catch {
    res.status(500).json({ error: 'Unable to update this routine.' });
  }
});

app.delete('/api/routines/:id', persistRoutineSession, (req, res) => {
  try {
    if (!routinesStore.deleteRoutine(req.sessionID, req.params.id)) return res.status(404).json({ error: 'Routine not found.' });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'Unable to delete this routine.' });
  }
});

app.get('/api/routines/:routineId/steps/:stepId/state', persistRoutineSession, (req, res) => {
  const routine = routinesStore.getRoutines(req.sessionID).find(item => item.id === req.params.routineId);
  if (!routine || !routine.steps.some(step => step.id === req.params.stepId)) return res.status(404).json({ error: 'Routine step not found.' });
  res.json(routinesStore.getStepState(req.sessionID, req.params.stepId));
});

app.post('/api/routines/:routineId/steps/:stepId/answer', persistRoutineSession, (req, res) => {
  const routine = routinesStore.getRoutines(req.sessionID).find(item => item.id === req.params.routineId);
  if (!routine || !routine.steps.some(step => step.id === req.params.stepId)) return res.status(404).json({ error: 'Routine step not found.' });
  if (typeof req.body?.correct !== 'boolean') return res.status(400).json({ error: 'Answer result must be true or false.' });
  res.json(routinesStore.recordStepAnswer(req.sessionID, req.params.stepId, req.body.correct, req.body.parameters));
});

app.get('/api/session', (req, res) => {
  const registration = req.session.registration || {};
  const audioRecording = registration.audioRecording || {};
  res.json({
    ...registration,
    voiceGeneration: req.session.voiceGeneration || { status: 'not-started' },
    safetyAlerts: req.session.safetyAlerts || [],
    activeSafetyAlert: req.session.activeSafetyAlert || null,
    audioRecording: {
      ...audioRecording,
      exists: Boolean(audioRecording.filename),
      filename: audioRecording.filename || null
    }
  });
});

app.post('/api/reminders/:id/confirm', (req, res) => {
  const registration = req.session.registration || {};
  let userReminders = Array.isArray(registration.userReminders) ? [...registration.userReminders] : [];
  if (!userReminders.length && req.params.id === 'medication-default') {
    userReminders = [{
      id: 'medication-default',
      title: registration.topicNotes?.['medication-reminder'] || 'Medication reminder',
      time: '15:00',
      period: 'afternoon',
      type: 'medication',
      enabled: true
    }];
  }
  const index = userReminders.findIndex(reminder => reminder.id === req.params.id && reminder.type === 'medication');
  if (index < 0) return res.status(404).json({ error: 'This medication reminder is no longer available.' });

  const date = new Date();
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  userReminders[index] = { ...userReminders[index], lastConfirmedDate: dateKey, lastConfirmedAt: date.toISOString() };
  req.session.registration = { ...registration, userReminders };
  req.session.save(error => {
    if (error) return res.status(500).json({ error: 'The medication confirmation could not be saved.' });
    res.json({ reminder: userReminders[index] });
  });
});

app.post('/api/registration', (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Registration data must be an object.' });
  }

  const current = req.session.registration || {};
  const incoming = req.body;
  const next = { ...current, ...incoming };

  if (incoming.patient && typeof incoming.patient === 'object' && !Array.isArray(incoming.patient)) {
    next.patient = {
      ...(current.patient || {}),
      ...incoming.patient,
      ...(incoming.patient.contact && typeof incoming.patient.contact === 'object'
        ? { contact: { ...(current.patient?.contact || {}), ...incoming.patient.contact } }
        : {}),
      ...(incoming.patient.address && typeof incoming.patient.address === 'object'
        ? { address: { ...(current.patient?.address || {}), ...incoming.patient.address } }
        : {})
    };
  }

  if (incoming.caretaker && typeof incoming.caretaker === 'object' && !Array.isArray(incoming.caretaker)) {
    next.caretaker = {
      ...(current.caretaker || {}),
      ...incoming.caretaker,
      ...(incoming.caretaker.contact && typeof incoming.caretaker.contact === 'object'
        ? { contact: { ...(current.caretaker?.contact || {}), ...incoming.caretaker.contact } }
        : {})
    };
  }

  if (Array.isArray(incoming.selectedTopics)) {
    next.topicNotes = Object.fromEntries(
      Object.entries(current.topicNotes || {})
        .filter(([topicId]) => incoming.selectedTopics.includes(topicId))
    );
  }

  if (incoming.topicNotes && typeof incoming.topicNotes === 'object' && !Array.isArray(incoming.topicNotes)) {
    next.topicNotes = { ...(next.topicNotes || current.topicNotes || {}), ...incoming.topicNotes };
  }

  req.session.registration = next;
  req.session.save((error) => {
    if (error) {
      return res.status(500).json({ error: 'Unable to save registration.' });
    }
    res.json(req.session.registration);
  });
});

app.post('/api/audio/upload', (req, res) => {
  if (req.session.registration?.audioConsent !== true) {
    return res.status(403).json({ error: 'Audio consent is required before uploading a recording.' });
  }
  audioUpload(req, res, (error) => {
    if (error) {
      return res.status(400).json({ error: error.message || 'Unable to upload recording.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Choose an audio recording to upload.' });
    }

    const registration = req.session.registration || {};
    req.session.registration = {
      ...registration,
      audioRecording: {
        filename: req.file.filename,
        mimeType: req.file.mimetype,
        uploadedAt: new Date().toISOString()
      }
    };
    req.session.save((saveError) => {
      if (saveError) {
        return res.status(500).json({ error: 'Recording was uploaded but session data could not be saved.' });
      }
      res.status(201).json({ audioRecording: req.session.registration.audioRecording });
    });
  });
});

app.post('/api/audio/step-cue/:stepId', (req, res, next) => {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(req.params.stepId)) return res.status(400).json({ error: 'Invalid routine step ID.' });
  if (!routinesStore.findStep(req.sessionID, req.params.stepId)) return res.status(404).json({ error: 'Routine step not found.' });
  stepCueUpload(req, res, error => {
    if (error) return res.status(400).json({ error: error.message || 'Unable to save this cue recording.' });
    if (!req.file) return res.status(400).json({ error: 'Record a short cue before saving.' });
    try {
      routinesStore.markStepRecording(req.sessionID, req.params.stepId, req.file.mimetype);
      res.status(201).json({ stepId: req.params.stepId, personalRecording: true, mimeType: req.file.mimetype });
    } catch {
      fs.rmSync(req.file.path, { force: true });
      res.status(500).json({ error: 'Unable to save this cue recording.' });
    }
  });
});

app.post('/api/voice/clone-and-generate', async (req, res) => {
  const recording = req.session.registration?.audioRecording;
  if (!recording?.filename) {
    return res.status(400).json({ error: 'Upload a voice sample before generating phrases.' });
  }
  if (req.session.voiceGeneration?.status === 'ready' && req.session.voiceGeneration.audioFilename === recording.filename) {
    return res.json(req.session.voiceGeneration);
  }

  req.session.voiceGeneration = { status: 'preparing', startedAt: new Date().toISOString() };
  try {
    await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
    const samplePath = path.join(uploadsDirectory, path.basename(recording.filename));
    if (!fs.existsSync(samplePath)) {
      const error = new Error('The saved voice sample could not be found.');
      error.code = 'VOICE_SAMPLE_NOT_FOUND';
      throw error;
    }

    const voiceId = await cloneVoice(samplePath, req.session.registration.audioNickname || 'reMIND familiar voice');
    req.session.voiceId = voiceId;
    req.session.voiceGeneration = {
      status: 'generating',
      startedAt: req.session.voiceGeneration.startedAt,
      audioFilename: recording.filename
    };
    await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));

    const sessionDirectory = path.join(audioCacheDirectory, req.sessionID);
    fs.rmSync(sessionDirectory, { recursive: true, force: true });
    fs.mkdirSync(sessionDirectory, { recursive: true });
    for (const [phraseKey, phraseText] of Object.entries(reminderPhrases)) {
      const audio = await generateSpeech(phraseText, voiceId);
      fs.writeFileSync(path.join(sessionDirectory, `${phraseKey}.mp3`), audio);
    }

    req.session.voiceGeneration = {
      status: 'ready',
      phraseCount: Object.keys(reminderPhrases).length,
      audioFilename: recording.filename,
      completedAt: new Date().toISOString()
    };
    await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
    res.json(req.session.voiceGeneration);
  } catch (error) {
    req.session.voiceGeneration = {
      status: 'failed',
      audioFilename: recording.filename,
      error: error.message,
      failedAt: new Date().toISOString()
    };
    await new Promise((resolve) => req.session.save(() => resolve()));
    const status = error.code === 'ELEVENLABS_NOT_CONFIGURED' ? 503 : error.code === 'VOICE_SAMPLE_NOT_FOUND' ? 404 : 502;
    res.status(status).json({ error: error.message, voiceGeneration: req.session.voiceGeneration });
  }
});

app.get('/api/voice/phrase/:key', async (req, res) => {
  const { key } = req.params;
  const ownedStep = routinesStore.findStep(req.sessionID, key);
  if (ownedStep) {
    const { step } = ownedStep;
    const personalPath = routinesStore.stepCuePath(req.sessionID, step.id);
    if (step.personalRecording && fs.existsSync(personalPath)) {
      res.type(step.personalRecordingMimeType || 'audio/webm');
      return res.sendFile(personalPath);
    }

    const voiceReady = req.session.registration?.audioConsent === true
      && req.session.voiceGeneration?.status === 'ready'
      && req.session.voiceId;
    if (step.cuePhrase && voiceReady) {
      const ttsDirectory = path.join(audioCacheDirectory, req.sessionID, 'step-phrases');
      const ttsPath = path.join(ttsDirectory, `${step.id}.mp3`);
      try {
        if (!fs.existsSync(ttsPath)) {
          const audio = await generateSpeech(step.cuePhrase, req.session.voiceId);
          fs.mkdirSync(ttsDirectory, { recursive: true });
          fs.writeFileSync(ttsPath, audio);
        }
        res.type('audio/mpeg');
        return res.sendFile(ttsPath);
      } catch {
        return res.status(503).json({ error: 'Voice cue is not available yet.' });
      }
    }
    return res.status(404).json({ error: 'Voice cue is not available yet.' });
  }

  if (!Object.hasOwn(reminderPhrases, key)) return res.status(404).json({ error: 'Voice cue is not available yet.' });
  const audioPath = path.join(audioCacheDirectory, req.sessionID, `${key}.mp3`);
  if (!fs.existsSync(audioPath)) return res.status(404).json({ error: 'Voice cue is not available yet.' });
  res.type('audio/mpeg').sendFile(audioPath);
});

app.get('/api/voice/phrases', (req, res) => {
  res.json(Object.entries(reminderPhrases).map(([key, text]) => ({ key, text })));
});

app.post('/api/voice/phrase/:key', (req, res) => {
  if (!Object.hasOwn(reminderPhrases, req.params.key)) return res.status(404).json({ error: 'Phrase not found.' });
  phraseUpload(req, res, (error) => {
    if (error) return res.status(400).json({ error: error.message || 'Unable to save this audio clip.' });
    if (!req.file) return res.status(400).json({ error: 'Choose an audio clip to upload.' });
    res.status(201).json({ phraseKey: req.params.key, saved: true });
  });
});

app.get('/api/config', (req, res) => {
  res.json({ googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || null });
});

app.post('/api/safety/alert', (req, res) => {
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  const distanceMetres = Number(req.body?.distanceMetres);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    || !Number.isFinite(distanceMetres) || distanceMetres < 0) {
    return res.status(400).json({ error: 'A valid location and distance are required.' });
  }
  const alert = {
    message: `Safe-zone boundary exceeded by ${Math.round(distanceMetres)} metres`,
    latitude,
    longitude,
    distanceMetres,
    createdAt: new Date().toISOString(),
    active: true
  };
  req.session.safetyAlerts = [...(req.session.safetyAlerts || []), alert].slice(-20);
  req.session.activeSafetyAlert = alert;
  req.session.save((error) => {
    if (error) return res.status(500).json({ error: 'The safety alert could not be saved.' });
    res.status(201).json(alert);
  });
});

app.post('/api/sign-out', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ error: 'Unable to sign out.' });
    }
    res.clearCookie(sessionCookieName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    res.status(204).end();
  });
});

app.listen(port, () => {
  console.log('Registered routes:', app._router.stack
    .filter(layer => layer.route)
    .map(layer => layer.route.path));
  console.log(`reMIND is listening on http://localhost:${port}`);
});
