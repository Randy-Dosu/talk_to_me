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
const { defineSecret } = require('firebase-functions/params');
const speech = require('@google-cloud/speech');

const client = new speech.SpeechClient();
const HF_TOKEN = defineSecret('HF_TOKEN');

/**
 * Optional chat proxy. Keeps the Hugging Face token on the server instead of in
 * a browser tab, and gives the app one place to enforce quotas.
 *
 *   firebase functions:secrets:set HF_TOKEN
 *   firebase deploy --only functions:chat
 *
 * Then set VITE_HF_ENDPOINT to this function's URL and redeploy the site.
 */
exports.chat = onRequest(
  { cors: true, region: 'europe-west1', secrets: [HF_TOKEN], invoker: 'public', timeoutSeconds: 60 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'POST only' });
      return;
    }
    const { model, messages, max_tokens } = req.body || {};
    if (typeof model !== 'string' || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'model and messages are required' });
      return;
    }
    if (messages.some((m) => typeof m?.content !== 'string' || m.content.length > 4000)) {
      res.status(400).json({ error: 'message content is invalid or too long' });
      return;
    }

    try {
      const upstream = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${HF_TOKEN.value()}`,
        },
        body: JSON.stringify({
          model,
          messages: messages.slice(0, 4),
          max_tokens: Math.min(Number(max_tokens) || 160, 256),
          temperature: 0.6,
        }),
      });
      const text = await upstream.text();
      res.status(upstream.status).type('application/json').send(text);
    } catch (error) {
      console.error('chat proxy failed', error);
      res.status(502).json({ error: 'model request failed' });
    }
  },
);
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
