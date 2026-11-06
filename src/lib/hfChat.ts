/**
 * Optional Hugging Face Inference API path for conversation.
 *
 * Off by default, and deliberately narrow:
 *  - high-risk entries never leave the device (the local safety path handles them);
 *  - the model is told to reflect, not to diagnose or advise;
 *  - replies are sanitised, length-capped, and dropped if they contain a
 *    diagnostic claim;
 *  - the token lives in sessionStorage only, so closing the tab forgets it.
 *
 * The rest of the app works identically without a network connection.
 */

import type { Analysis } from '../engine/types';

export const HF_ENDPOINT = 'https://router.huggingface.co/v1/chat/completions';
export const DEFAULT_HF_MODEL = 'HuggingFaceH4/zephyr-7b-beta';

const TOKEN_KEY = 'nkommo.hf.token';

export function getHfToken(): string {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setHfToken(token: string): void {
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // sessionStorage can be blocked; the setting simply will not persist
  }
}

export type HfErrorKind = 'auth' | 'rate' | 'network' | 'timeout' | 'bad' | 'empty';

export interface HfReply {
  ok: boolean;
  text: string;
  error?: string;
  kind?: HfErrorKind;
}

const SYSTEM_PROMPT = [
  'You are Nkommo, a listening companion inside a private journal used in Ghana.',
  'Reply in 1–3 short sentences, warm and plain. Match the writer’s mix of English and Pidgin if they use it.',
  'Reflect what you heard and name the feeling. Ask at most one gentle, open question.',
  'Never diagnose, never name medication, never give instructions or “you should” advice, never mention being an AI model.',
  'If the writer mentions wanting to die or self-harm, do not counsel: say plainly that they deserve a person now and that the app has numbers for them.',
].join(' ');

export function buildMessages(text: string, analysis: Analysis) {
  const context = [
    `Their words: ${text}`,
    `On-device reading (may be wrong): mood ${analysis.moodBand}, distress ${analysis.distress}/100, strongest feelings ${
      analysis.emotions.slice(0, 2).map((emotion) => emotion.label).join(', ') || 'unclear'
    }.`,
    'Respond to the person, not to this data.',
  ].join('\n');

  return [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: context },
  ];
}

const DIAGNOSTIC_CLAIM =
  /\b(you|u)\s+(have|are suffering from|definitely have)\s+(depression|anxiety disorder|bipolar|ptsd|schizophrenia|ocd|an eating disorder)\b/i;

/** Returns null when the text should not be shown as-is. */
export function sanitizeReply(raw: string): string | null {
  const text = raw
    .replace(/^\s*(nkommo|assistant|ai)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text || DIAGNOSTIC_CLAIM.test(text)) return null;
  return text.length > 600 ? `${text.slice(0, 597).trimEnd()}…` : text;
}

export async function hfReply(options: {
  text: string;
  analysis: Analysis;
  model: string;
  token: string;
  timeoutMs?: number;
}): Promise<HfReply> {
  const { text, analysis, model, token, timeoutMs = 25_000 } = options;
  if (!token) return { ok: false, text: '', kind: 'auth', error: 'No Hugging Face token saved.' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(HF_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        messages: buildMessages(text, analysis),
        max_tokens: 160,
        temperature: 0.6,
      }),
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, text: '', kind: 'auth', error: 'The token was rejected. Check it in Settings.' };
    }
    if (response.status === 429) {
      return { ok: false, text: '', kind: 'rate', error: 'The model is rate-limited right now.' };
    }
    if (response.status === 404) {
      return {
        ok: false,
        text: '',
        kind: 'bad',
        error: 'That model id is not served by Hugging Face. Try another id in Settings.',
      };
    }
    if (!response.ok) {
      return { ok: false, text: '', kind: 'bad', error: `The model service returned ${response.status}.` };
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? '';
    const clean = sanitizeReply(raw);
    if (!clean) {
      return { ok: false, text: '', kind: 'empty', error: 'The model answered in a way we will not show (diagnosis or empty).' };
    }
    return { ok: true, text: clean };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    return {
      ok: false,
      text: '',
      kind: aborted ? 'timeout' : 'network',
      error: aborted ? 'The model took too long to answer.' : 'No connection to the model service.',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Crisis language stays on the device. The keyword backstop catches phrasing
 * the tiering puts at `none` ("how I would do it" with no death word).
 */
const LOCAL_ONLY =
  /\b(suicide|suicidal|kill myself|killing myself|kill me|end my life|take my own life|take my life|want to die|wanna die|want to be dead|self[- ]harm|cut myself|cutting myself|hurt myself|overdose|no reason to live|better off dead|do not want to be here|don't want to be here|not want to be here|how i would (do it|end it|kill myself)|sleep and never wake)\b/i;

export function maySendToModel(analysis: Analysis, text = ''): boolean {
  if (analysis.risk.level === 'elevated' || analysis.risk.level === 'urgent') return false;
  if (analysis.risk.matches.length > 0) return false;
  if (LOCAL_ONLY.test(text || analysis.text)) return false;
  return true;
}

/** Small round-trip used by the Settings page's "Test" button. */
export async function testHfConnection(model: string, token: string): Promise<{ ok: boolean; error?: string }> {
  if (!token) return { ok: false, error: 'Paste a Hugging Face access token first.' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(HF_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
        max_tokens: 8,
        temperature: 0,
      }),
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) return { ok: false, error: 'Token rejected (401/403).' };
    if (response.status === 404) return { ok: false, error: 'Model not found on this account or endpoint.' };
    if (response.status === 429) return { ok: false, error: 'Rate-limited (429). Try again shortly.' };
    if (!response.ok) return { ok: false, error: `Service returned ${response.status}.` };
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content
      ? { ok: true }
      : { ok: false, error: 'Reached the service, but no text came back.' };
  } catch {
    return { ok: false, error: 'No connection from this browser (this preview sandbox may block it).' };
  } finally {
    clearTimeout(timer);
  }
}
