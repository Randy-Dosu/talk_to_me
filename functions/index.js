/**
 * Reference Cloud Functions for Nkommo.
 *
 * `transcribe` is only needed for browsers without SpeechRecognition. It takes a
 * raw audio body and returns { text }. It uses Application Default Credentials
 * and the Speech-to-Text API, which must be enabled on the project.
 *
 * Not deployed or executed in this repository's test run: the sandbox has no
 * Google Cloud credentials. Treat it as the deployment step, not as tested code.
 */
const { onRequest } = require('firebase-functions/v2/https');
const speech = require('@google-cloud/speech');

const client = new speech.SpeechClient();
const MAX_BYTES = 8 * 1024 * 1024;

exports.transcribe = onRequest({ cors: true, region: 'europe-west1' }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  const body = req.rawBody;
  if (!body || body.length === 0) {
    res.status(400).json({ error: 'No audio' });
    return;
  }
  if (body.length > MAX_BYTES) {
    res.status(413).json({ error: 'Audio too long' });
    return;
  }
  try {
    const [response] = await client.recognize({
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-GB',
        enableAutomaticPunctuation: true,
        model: 'latest_long',
      },
      audio: { content: body.toString('base64') },
    });
    const text = (response.results || [])
      .map((result) => (result.alternatives && result.alternatives[0] ? result.alternatives[0].transcript : ''))
      .join(' ')
      .trim();
    res.json({ text });
  } catch (error) {
    console.error('transcribe failed', error);
    res.status(502).json({ error: 'transcription failed' });
  }
});

exports.health = onRequest({ cors: true, region: 'europe-west1' }, (_req, res) => {
  res.json({ ok: true, service: 'nkommo', at: new Date().toISOString() });
});
