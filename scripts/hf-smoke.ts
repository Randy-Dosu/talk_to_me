/**
 * Real HTTP round trip through the shipping Hugging Face adapter, against a
 * local server that speaks the same OpenAI-style contract. Proves the request
 * shape, headers, parsing, sanitisation and error mapping without needing a
 * token or a live Hugging Face connection.
 *
 *   npm run hf:smoke
 */

import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { analyse } from '../src/engine/analyze';
import { DEFAULT_HF_MODEL, hfReply, maySendToModel, testHfConnection } from '../src/lib/hfChat';

let lastBody = '';
let requests = 0;
let failAllModels = false;

const server = createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    requests += 1;
    lastBody = body;
    const url = req.url ?? '';
    const isProxy = url.startsWith('/proxy');
    const auth = req.headers.authorization ?? '';
    const send = (status: number, payload: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    };

    if (!isProxy && !auth.startsWith('Bearer good-')) {
      send(401, { error: 'Invalid credentials' });
      return;
    }
    const parsed = JSON.parse(body) as { model?: string };
    if (failAllModels || parsed.model === 'nobody/nothing' || parsed.model === 'retired/model') {
      send(404, { error: 'Model not found' });
      return;
    }
    if (parsed.model === 'array/model') {
      send(200, {
        choices: [{ message: { content: [{ type: 'text', text: 'That sounds heavy.' }, { type: 'text', text: 'What helped?' }] } }],
      });
      return;
    }
    if (parsed.model === 'diagnosis/model') {
      send(200, { choices: [{ message: { content: 'You have depression. You should see a doctor.' } }] });
      return;
    }
    send(200, { choices: [{ message: { content: 'That sounds heavy. What was the hardest part?' } }] });
  });
});

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = (server.address() as AddressInfo).port;
const realFetch = globalThis.fetch;
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
  realFetch(String(input).replace('https://router.huggingface.co', `http://127.0.0.1:${port}`), init)) as typeof fetch;

const analysis = analyse('Work was heavy today and I could not sleep.');
const safe = { text: 'Work was heavy today and I could not sleep.', analysis, model: DEFAULT_HF_MODEL };
const results: { name: string; ok: boolean; detail: string }[] = [];
function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(34)} ${detail}`);
}

const noToken = await hfReply({ ...safe, token: '' });
check('refuses without a token', noToken.kind === 'auth' && requests === 0, noToken.error ?? '');

const rejected = await hfReply({ ...safe, token: 'bad-token' });
check('rejects a refused token', rejected.kind === 'auth', rejected.error ?? '');

const missing = await hfReply({ ...safe, token: 'good-token', model: 'nobody/nothing' });
check('a dead model id falls back', missing.ok, `answered by ${missing.model}`);

const reply = await hfReply({ ...safe, token: 'good-token' });
check('returns a sanitised reflection', reply.ok && reply.text.length > 0, JSON.stringify(reply.text));
check('sends model + messages', /"model":"HuggingFaceH4\/zephyr-7b-beta"/.test(lastBody) && /"messages":\[/.test(lastBody), `${lastBody.length} byte body`);

const diagnostic = await hfReply({ ...safe, token: 'good-token', model: 'diagnosis/model' });
check('drops a diagnostic claim', !diagnostic.ok && diagnostic.kind === 'empty', diagnostic.error ?? '');

const connection = await testHfConnection(DEFAULT_HF_MODEL, 'good-token');
check('Settings connection test passes', connection.ok, connection.error ?? 'ready');

const crisis = analyse('I do not want to be here anymore.');
check('crisis text never leaves the device', !maySendToModel(crisis, 'I do not want to be here anymore.'), 'blocked locally');

const fallback = await hfReply({ ...safe, token: 'good-token', model: 'retired/model' });
check('falls back to a served model', fallback.ok && fallback.model === DEFAULT_HF_MODEL, `answered by ${fallback.model}`);

const parts = await hfReply({ ...safe, token: 'good-token', model: 'array/model' });
check('reads array-shaped content', parts.ok && parts.text === 'That sounds heavy. What helped?', JSON.stringify(parts.text));

process.env.VITE_HF_ENDPOINT = 'https://router.huggingface.co/proxy/v1/chat/completions';
const proxied = await hfReply({ ...safe, token: '' });
check('proxied endpoint needs no browser token', proxied.ok && /heavy/i.test(proxied.text), JSON.stringify(proxied.text));
delete process.env.VITE_HF_ENDPOINT;

failAllModels = true;
const nothingServed = await hfReply({ ...safe, token: 'good-token', model: 'retired/model' });
check(
  'explains when no model is served',
  nothingServed.kind === 'model' && /none of the known chat models/i.test(nothingServed.error ?? ''),
  nothingServed.error ?? '',
);
failAllModels = false;

const timeout = await hfReply({ ...safe, token: 'good-token', timeoutMs: 1 });
check('times out instead of hanging', !timeout.ok, timeout.kind ?? 'unknown');

server.close();
globalThis.fetch = realFetch;
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed against a local HF-compatible endpoint.`);
console.log('Live huggingface.co was not contacted: this environment blocks it and no token is configured.');
process.exit(failed === 0 ? 0 : 1);
