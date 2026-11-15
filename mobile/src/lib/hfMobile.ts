import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Analysis } from '@shared/engine/types';
import {
  buildMessages,
  DEFAULT_HF_MODEL,
  HF_ENDPOINT,
  HF_MODEL_CANDIDATES,
  localReflection,
  maySendToModel,
  sanitizeReply,
} from './mobileCore';

export {
  buildMessages,
  DEFAULT_HF_MODEL,
  HF_ENDPOINT,
  HF_MODEL_CANDIDATES,
  localReflection,
  maySendToModel,
  sanitizeReply,
};

const TOKEN_KEY = 'nkommo_hf_token_v1';
let memoryToken = '';

export function hfEndpoint(): string {
  const custom = process.env.EXPO_PUBLIC_HF_ENDPOINT;
  return custom && custom.trim() ? custom.trim() : HF_ENDPOINT;
}

export function usingProxy(): boolean {
  return hfEndpoint() !== HF_ENDPOINT;
}

export async function getHfToken(): Promise<string> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.sessionStorage?.getItem(TOKEN_KEY) ?? memoryToken;
    } catch {
      return memoryToken;
    }
  }
  try {
    const val = await SecureStore.getItemAsync(TOKEN_KEY);
    return val ?? memoryToken;
  } catch {
    return memoryToken;
  }
}

export async function setHfToken(token: string): Promise<void> {
  const trimmed = token.trim();
  memoryToken = trimmed;
  if (Platform.OS === 'web') {
    try {
      if (trimmed) globalThis.sessionStorage?.setItem(TOKEN_KEY, trimmed);
      else globalThis.sessionStorage?.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
    return;
  }
  try {
    if (trimmed) await SecureStore.setItemAsync(TOKEN_KEY, trimmed);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // ignore
  }
}

function extractText(payload: unknown): string {
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

const MODEL_PROBLEM = /model|provider|not supported|not found|no provider|unsupported/i;

function errorFromBody(payload: unknown): string {
  const data = payload as { error?: unknown; message?: unknown };
  if (typeof data?.error === 'string') return data.error;
  if (data?.error && typeof (data.error as { message?: unknown }).message === 'string') {
    return (data.error as { message: string }).message;
  }
  if (typeof data?.message === 'string') return data.message;
  return '';
}

export interface HfReply {
  ok: boolean;
  text: string;
  error?: string;
  model?: string;
}

export async function hfReplyMobile(options: {
  text: string;
  analysis: Analysis;
  model: string;
  token: string;
  timeoutMs?: number;
}): Promise<HfReply> {
  const { text, analysis, model, token, timeoutMs = 25_000 } = options;
  const endpoint = hfEndpoint();
  if (!token && !usingProxy()) {
    return { ok: false, text: '', error: 'No Hugging Face token saved.' };
  }

  const candidates = [model, ...HF_MODEL_CANDIDATES.filter((c) => c !== model)];
  for (const candidate of candidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: candidate,
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
        return { ok: false, text: '', error: 'Token rejected (check Inference Providers permission).' };
      }
      if (response.status === 429) {
        return { ok: false, text: '', error: 'Model rate-limited right now.' };
      }
      if (response.status === 404 || (response.status === 400 && MODEL_PROBLEM.test(errorFromBody(payload)))) {
        continue;
      }
      if (!response.ok) {
        return { ok: false, text: '', error: `Model service returned ${response.status}.` };
      }
      const clean = sanitizeReply(extractText(payload));
      if (!clean) {
        return { ok: false, text: '', error: 'Reply suppressed (diagnostic or empty).' };
      }
      return { ok: true, text: clean, model: candidate };
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      return {
        ok: false,
        text: '',
        error: aborted ? 'Model timed out.' : 'No connection to model service.',
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, text: '', error: 'None of the candidate chat models answered.' };
}

export async function testHfMobileConnection(
  model: string,
  token: string,
): Promise<{ ok: boolean; model?: string; error?: string }> {
  if (!token && !usingProxy()) {
    return { ok: false, error: 'Paste a Hugging Face access token first.' };
  }
  const endpoint = hfEndpoint();
  const candidates = [model, ...HF_MODEL_CANDIDATES.filter((c) => c !== model)];
  for (const candidate of candidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18_000);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(endpoint, {
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
      const raw = await res.text();
      let payload: unknown = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = null;
      }
      if (res.status === 401 || res.status === 403) return { ok: false, error: 'Token rejected (401/403).' };
      if (res.status === 429) return { ok: false, error: 'Rate-limited (429).' };
      if (res.status === 404 || (res.status === 400 && MODEL_PROBLEM.test(errorFromBody(payload)))) continue;
      if (!res.ok) return { ok: false, error: `Service returned ${res.status}.` };
      if (extractText(payload)) return { ok: true, model: candidate };
    } catch {
      return { ok: false, error: 'Could not reach the model service.' };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, error: 'No candidate model answered on this account.' };
}
