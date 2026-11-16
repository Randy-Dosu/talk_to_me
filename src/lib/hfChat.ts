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

/**
 * Chat models differ by account and by week: Hugging Face rotates what its
 * Inference Providers serve. These are tried in order when a model id comes
 * back as not served, so a stale default does not look like a broken feature.
 */
export const HF_MODEL_CANDIDATES = [
  DEFAULT_HF_MODEL,
  'Qwen/Qwen2.5-7B-Instruct',
  'meta-llama/Llama-3.1-8B-Instruct',
  'mistralai/Mistral-7B-Instruct-v0.3',
];

const TOKEN_KEY = 'nkommo.hf.token';

function envValue(key: string): string {
  const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
  const fromVite = meta.env?.[key];
  if (fromVite) return String(fromVite).trim();
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return (proc?.env?.[key] ?? '').trim();
}

/** The configured endpoint; a self-hosted or Cloud Function proxy can be used instead. */
export function hfEndpoint(): string {
  return envValue('VITE_HF_ENDPOINT') || HF_ENDPOINT;
}

/** When the endpoint is not Hugging Face itself, the token can stay on the server. */
export function usingProxy(): boolean {
  return hfEndpoint() !== HF_ENDPOINT;
}

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

export type HfErrorKind = 'auth' | 'rate' | 'network' | 'timeout' | 'bad' | 'empty' | 'model';

export interface HfReply {
  ok: boolean;
  text: string;
  error?: string;
  kind?: HfErrorKind;
  /** The model that actually answered, when a fallback was needed. */
  model?: string;
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

/** Providers return text in several shapes; read all of the common ones. */
export function extractText(payload: unknown): string {
  const data = payload as {
    choices?: { message?: { content?: unknown }; text?: unknown }[];
    generated_text?: unknown;
  };
  const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : ((part as { text?: string })?.text ?? '')))
      .join(' ')
      .trim();
  }
  if (typeof data?.generated_text === 'string') return data.generated_text;
  return '';
}

function errorFromBody(payload: unknown): string {
  const data = payload as { error?: unknown; message?: unknown };
  if (typeof data?.error === 'string') return data.error;
  if (data?.error && typeof (data.error as { message?: unknown }).message === 'string') {
    return (data.error as { message: string }).message;
  }
  if (typeof data?.message === 'string') return data.message;
  return '';
}

const MODEL_PROBLEM = /model|provider|not supported|not found|no provider|unsupported/i;

async function attempt(
  endpoint: string,
  options: { text: string; analysis: Analysis; model: string; token: string; timeoutMs: number },
): Promise<HfReply> {
  const { text, analysis, model, token, timeoutMs } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: buildMessages(text, analysis),
        max_tokens: 160,
        temperature: 0.6,
      }),
      signal: controller.signal,
    });

    const rawBody = await response.text();
    let payload: unknown = null;
    try {
      payload = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      payload = null;
    }

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        text: '',
        kind: 'auth',
        error: token
          ? 'The token was rejected. Check that it has the Inference Providers permission.'
          : 'No token is saved, and this endpoint needs one.',
      };
    }
    if (response.status === 429) {
      return { ok: false, text: '', kind: 'rate', error: 'The model is rate-limited right now.' };
    }
    if (response.status === 404 || (response.status === 400 && MODEL_PROBLEM.test(errorFromBody(payload)))) {
      return {
        ok: false,
        text: '',
        kind: 'model',
        error: `This account does not serve ${model}.`,
      };
    }
    if (!response.ok) {
      const detail = errorFromBody(payload);
      return {
        ok: false,
        text: '',
        kind: 'bad',
        error: detail
          ? `The model service returned ${response.status}: ${detail.slice(0, 120)}`
          : `The model service returned ${response.status}.`,
      };
    }

    const clean = sanitizeReply(extractText(payload));
    if (!clean) {
      return {
        ok: false,
        text: '',
        kind: 'empty',
        error: 'The model answered in a way we will not show (diagnosis or empty).',
      };
    }
    return { ok: true, text: clean, model };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
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
 * Tries the chosen model, then the known-good list when the id is not served.
 * Auth, rate-limit, timeout and network failures stop immediately: retrying
 * them would just burn quota.
 */
export async function hfReply(options: {
  text: string;
  analysis: Analysis;
  model: string;
  token: string;
  timeoutMs?: number;
}): Promise<HfReply> {
  const { text, analysis, model, token, timeoutMs = 25_000 } = options;
  const endpoint = hfEndpoint();
  if (!token && !usingProxy()) {
    return { ok: false, text: '', kind: 'auth', error: 'No Hugging Face token saved.' };
  }

  const candidates = [model, ...HF_MODEL_CANDIDATES.filter((candidate) => candidate !== model)];
  let last: HfReply = { ok: false, text: '', kind: 'model', error: 'No model answered.' };

  for (const candidate of candidates) {
    const result = await attempt(endpoint, { text, analysis, model: candidate, token, timeoutMs });
    if (result.ok) return { ...result, model: candidate };
    last = result;
    if (result.kind !== 'model') return result;
  }

  return {
    ...last,
    error: 'None of the known chat models are served on this account. Pick another model id in Settings.',
  };
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
export async function testHfConnection(
  model: string,
  token: string,
): Promise<{ ok: boolean; model?: string; error?: string }> {
  if (!token && !usingProxy()) return { ok: false, error: 'Paste a Hugging Face access token first.' };

  const endpoint = hfEndpoint();
  const candidates = [model, ...HF_MODEL_CANDIDATES.filter((candidate) => candidate !== model)];
  let lastError = 'No connection from this browser (this preview sandbox may block it).';

  for (const candidate of candidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: candidate,
          messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
          max_tokens: 8,
          temperature: 0,
        }),
        signal: controller.signal,
      });
      const rawBody = await response.text();
      let payload: unknown = null;
      try {
        payload = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        payload = null;
      }

      if (response.status === 401 || response.status === 403) {
        return { ok: false, error: token ? 'Token rejected (401/403).' : 'This endpoint needs a token.' };
      }
      if (response.status === 429) return { ok: false, error: 'Rate-limited (429). Try again shortly.' };
      if (response.status === 404 || (response.status === 400 && MODEL_PROBLEM.test(errorFromBody(payload)))) {
        lastError = `${candidate} is not served on this account.`;
        continue;
      }
      if (!response.ok) {
        const detail = errorFromBody(payload);
        return { ok: false, error: detail ? `Service returned ${response.status}: ${detail.slice(0, 100)}` : `Service returned ${response.status}.` };
      }
      if (extractText(payload)) return { ok: true, model: candidate };
      return { ok: false, error: 'Reached the service, but no text came back.' };
    } catch {
      return { ok: false, error: 'No connection from this browser (this preview sandbox may block it).' };
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, error: `${lastError} Try another model id.` };
}
