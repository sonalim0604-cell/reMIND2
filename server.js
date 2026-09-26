require('dotenv').config();

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloneVoice, generateSpeech } = require('./lib/elevenLabsService');
const reminderPhrases = require('./data/reminderPhrases');

const app = express();
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

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(session({
  name: sessionCookieName,
  secret: sessionSecret,
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

app.get('/api/voice/phrase/:key', (req, res) => {
  const { key } = req.params;
  if (!Object.hasOwn(reminderPhrases, key)) return res.status(404).json({ error: 'Phrase not found.' });
  const audioPath = path.join(audioCacheDirectory, req.sessionID, `${key}.mp3`);
  if (!fs.existsSync(audioPath)) return res.status(404).json({ error: 'No audio is cached for this phrase yet.', text: reminderPhrases[key] });
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
  console.log(`reMIND is listening on http://localhost:${port}`);
});
