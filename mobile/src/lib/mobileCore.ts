/**
 * Pure, dependency-free core logic for Nkommo Mobile.
 *
 * Kept free of React Native native-module imports so it can be unit-tested
 * alongside the shared engine while driving the mobile store, safety gates,
 * backup import/export, and reminder slot scheduling.
 */

import type { PromptKind } from '@shared/data/prompts';
import type {
  Analysis,
  JournalEntry,
  SafetyPlan,
  Settings,
  StoreShape,
} from '@shared/engine/types';
import { mergeById } from '@shared/lib/cloudModel';

export const STORE_VERSION = 1;
export const HF_ENDPOINT = 'https://router.huggingface.co/v1/chat/completions';
export const DEFAULT_HF_MODEL = 'HuggingFaceH4/zephyr-7b-beta';

export const HF_MODEL_CANDIDATES = [
  DEFAULT_HF_MODEL,
  'Qwen/Qwen2.5-7B-Instruct',
  'meta-llama/Llama-3.1-8B-Instruct',
  'mistralai/Mistral-7B-Instruct-v0.3',
];

export const DEFAULT_SETTINGS: Settings = {
  displayName: '',
  language: 'tw-en',
  remindersEnabled: true,
  morningTime: '07:30',
  eveningTime: '20:30',
  trusted: null,
  showResourcesOnOpen: false,
  onboarded: false,
  clinicianMode: false,
  location: null,
  cloudEnabled: false,
  lastBackupAt: null,
  ai: { enabled: false, model: DEFAULT_HF_MODEL },
};

export const DEFAULT_PLAN: SafetyPlan = {
  warningSigns: [],
  copingSteps: [],
  people: [],
  places: [],
  reasons: [],
  professional: '',
};

export const DEFAULT_STORE: StoreShape = {
  version: STORE_VERSION,
  entries: [],
  checkins: [],
  settings: DEFAULT_SETTINGS,
  safetyPlan: DEFAULT_PLAN,
  alerts: [],
};

export function hydrateStoreShape(raw: string | null): StoreShape {
  if (!raw) return DEFAULT_STORE;
  try {
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      ...DEFAULT_STORE,
      ...parsed,
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings ?? {}),
        ai: { ...DEFAULT_SETTINGS.ai, ...(parsed.settings?.ai ?? {}) },
      },
      safetyPlan: { ...DEFAULT_PLAN, ...(parsed.safetyPlan ?? {}) },
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      checkins: Array.isArray(parsed.checkins) ? parsed.checkins : [],
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
      version: STORE_VERSION,
    };
  } catch {
    return DEFAULT_STORE;
  }
}

export function mergeBackupIntoStore(
  current: StoreShape,
  rawJson: string,
): { ok: boolean; next: StoreShape; entriesAdded: number; error?: string } {
  try {
    const parsed = JSON.parse(rawJson) as Partial<StoreShape>;
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, next: current, entriesAdded: 0, error: 'Backup is not valid JSON.' };
    }
    const incomingEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
    const incomingCheckins = Array.isArray(parsed.checkins) ? parsed.checkins : [];
    if (
      incomingEntries.length === 0 &&
      incomingCheckins.length === 0 &&
      !parsed.safetyPlan &&
      !parsed.settings
    ) {
      return {
        ok: false,
        next: current,
        entriesAdded: 0,
        error: 'No Nkommo entries or settings found in backup.',
      };
    }
    const mergedEntries = mergeById(current.entries, incomingEntries);
    const entriesAdded = Math.max(0, mergedEntries.length - current.entries.length);
    const next: StoreShape = {
      ...current,
      entries: mergedEntries,
      checkins: mergeById(current.checkins, incomingCheckins),
      safetyPlan: parsed.safetyPlan
        ? { ...current.safetyPlan, ...parsed.safetyPlan }
        : current.safetyPlan,
      settings: {
        ...current.settings,
        displayName: parsed.settings?.displayName || current.settings.displayName,
        language: parsed.settings?.language ?? current.settings.language,
        onboarded: true,
      },
    };
    return { ok: true, next, entriesAdded };
  } catch {
    return { ok: false, next: current, entriesAdded: 0, error: 'Could not parse JSON backup.' };
  }
}

/* --- Safety & HF reflection rules --- */

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
      analysis.emotions
        .slice(0, 2)
        .map((e) => e.label)
        .join(', ') || 'unclear'
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

export function sanitizeReply(raw: string): string | null {
  const text = raw
    .replace(/^\s*(nkommo|assistant|ai)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text || DIAGNOSTIC_CLAIM.test(text)) return null;
  return text.length > 600 ? `${text.slice(0, 597).trimEnd()}…` : text;
}

const LOCAL_ONLY =
  /\b(suicide|suicidal|kill myself|killing myself|kill me|end my life|take my own life|take my life|want to die|wanna die|want to be dead|self[- ]harm|cut myself|cutting myself|hurt myself|overdose|no reason to live|better off dead|do not want to be here|don't want to be here|not want to be here|how i would (do it|end it|kill myself)|sleep and never wake)\b/i;

export function maySendToModel(analysis: Analysis, text = ''): boolean {
  if (analysis.risk.level === 'elevated' || analysis.risk.level === 'urgent') return false;
  if (analysis.risk.matches.length > 0) return false;
  if (LOCAL_ONLY.test(text || analysis.text)) return false;
  return true;
}

export function localReflection(entry: JournalEntry): string {
  const { risk, moodBand, distress } = entry.analysis;
  if (risk.level === 'urgent') {
    return 'I am glad you put that in words. This sounds like real danger, and it is bigger than an app — please talk to a person now. The numbers below answer.';
  }
  if (risk.level === 'elevated') {
    return 'That reads heavier than a bad day. Please say it to a person today; the numbers below are free and answered.';
  }
  if (risk.subject === 'other') {
    return 'This sounds like it is about someone else, so your own pattern stays clear. Tap Safety for how to help a friend.';
  }
  if (risk.level === 'watch') {
    return 'I am reading something worth watching — not an alarm, but worth saying out loud to someone.';
  }
  if (distress >= 65) {
    return 'That sounds like a heavy day. Thank you for saying it here instead of carrying it alone.';
  }
  if (moodBand === 'heavy') return 'A heavy one. Noted, gently.';
  if (moodBand === 'unsettled') return 'A mixed day, by the sound of it.';
  if (moodBand === 'bright') return 'Good to read that. Kept.';
  return 'Steady, with some weight in it. Kept.';
}

/* --- Time-of-day prompting math --- */

export type Period = 'morning' | 'afternoon' | 'evening' | 'night';

export function periodOfDay(now = new Date()): Period {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export function periodLabel(period: Period): string {
  return { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Late' }[period];
}

export function promptWindow(now = new Date()): PromptKind | null {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 17 && hour < 24) return 'evening';
  return null;
}

export function dayStamp(now = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function formatClock(value: string): string {
  const parsed = parseTime(value);
  if (!parsed) return value;
  const suffix = parsed.hour >= 12 ? 'pm' : 'am';
  const hour = parsed.hour % 12 === 0 ? 12 : parsed.hour % 12;
  return `${hour}:${`${parsed.minute}`.padStart(2, '0')} ${suffix}`;
}

export function nextSlot(
  settings: Settings,
  now = new Date(),
): { kind: PromptKind; at: Date } | null {
  if (!settings.remindersEnabled) return null;
  const candidates: { kind: PromptKind; at: Date }[] = [];
  for (const [kind, time] of [
    ['morning', settings.morningTime],
    ['evening', settings.eveningTime],
  ] as const) {
    const parsed = parseTime(time);
    if (!parsed) continue;
    const at = new Date(now);
    at.setHours(parsed.hour, parsed.minute, 0, 0);
    if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
    candidates.push({ kind, at });
  }
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => a.at.getTime() - b.at.getTime())[0];
}
