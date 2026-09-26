const fs = require('fs/promises');
const path = require('path');

function getApiKey() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    const error = new Error('Voice generation is not configured. Add ELEVENLABS_API_KEY to the server environment.');
    error.code = 'ELEVENLABS_NOT_CONFIGURED';
    throw error;
  }
  return apiKey;
}

async function readApiError(response) {
  const body = await response.text();
  let detail = body;
  try {
    const parsed = JSON.parse(body);
    detail = parsed.detail?.message || parsed.detail || parsed.message || body;
  } catch {
    // Keep the provider's plain-text error when its response is not JSON.
  }
  return new Error(`ElevenLabs request failed (${response.status}): ${detail || response.statusText}`);
}

async function cloneVoice(samplePath, voiceName) {
  const apiKey = getApiKey();
  const sample = await fs.readFile(samplePath);
  const mimeTypeByExtension = {
    '.m4a': 'audio/mp4',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.webm': 'audio/webm'
  };
  const form = new FormData();
  form.append('name', String(voiceName || 'reMIND familiar voice').slice(0, 80));
  form.append('files', new Blob([sample], { type: mimeTypeByExtension[path.extname(samplePath).toLowerCase()] || 'application/octet-stream' }), path.basename(samplePath));

  const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form
  });
  if (!response.ok) throw await readApiError(response);
  const result = await response.json();
  if (!result.voice_id) throw new Error('ElevenLabs created no voice ID for this sample.');
  return result.voice_id;
}

async function generateSpeech(text, voiceId) {
  const apiKey = getApiKey();
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  });
  if (!response.ok) throw await readApiError(response);
  return Buffer.from(await response.arrayBuffer());
}

module.exports = { cloneVoice, generateSpeech };