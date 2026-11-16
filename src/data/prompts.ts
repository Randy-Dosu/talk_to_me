/**
 * The question the app opens with.
 *
 * Not one fixed sentence: it is composed from what the last few entries read
 * like (heavy, anxious, angry, flat, bright, steady), the hour, and how much has
 * been written this week. Every candidate is a question, short enough to answer
 * in a line, with no advice, no suggestion and no answer attached.
 */

import type { Analysis, JournalEntry } from '../engine/types';

export type PromptKind = 'morning' | 'evening';

export type QuestionSignal = 'heavy' | 'anxious' | 'angry' | 'flat' | 'bright' | 'steady';

export const SIGNAL_QUESTIONS: Record<QuestionSignal, Record<PromptKind, string[]>> = {
  heavy: {
    morning: [
      'What feels heaviest this morning?',
      'How did you get through the night?',
      'What is today asking of you that you can put down?',
      'Where does it hurt most right now?',
    ],
    evening: [
      'What was the hardest part of today?',
      'What is still sitting with you tonight?',
      'What did today take out of you?',
      'What would you want to put down before sleep?',
    ],
  },
  anxious: {
    morning: [
      'What is the worry saying this morning?',
      'What is the worst case in your head today?',
      'Where do you feel it in your body right now?',
      'What part of today can you actually control?',
    ],
    evening: [
      'What did the worry keep returning to today?',
      'What did you rehearse in your head that never happened?',
      'What is still unresolved tonight?',
      'Where is the tension sitting now?',
    ],
  },
  angry: {
    morning: [
      'What is still bothering you from yesterday?',
      'What would you want to say before the day starts?',
      'What crossed a line?',
      'Who or what are you carrying anger about?',
    ],
    evening: [
      'What got under your skin today?',
      'What do you want to say that you did not?',
      'What would you want them to understand?',
      'What is the anger protecting?',
    ],
  },
  flat: {
    morning: [
      'What would you want to feel today?',
      'What usually moves you, even a little?',
      'What is one thing you can manage this morning?',
      'What does your body need first?',
    ],
    evening: [
      'What would you have wanted to feel today?',
      'When did you last feel something clearly?',
      'What was today like from the outside?',
      'What do you wish had happened differently?',
    ],
  },
  bright: {
    morning: [
      'What made yesterday work?',
      'What would you want more of today?',
      'Who or what helped last time?',
      'What are you looking forward to?',
    ],
    evening: [
      'What made today work?',
      'What would you want to keep from today?',
      'Who or what made today easier?',
      'What should tomorrow-you know about today?',
    ],
  },
  steady: {
    morning: [
      'What is on your mind this morning?',
      'What do you want from today?',
      'How are you starting today?',
      'What is the first thing you need today?',
    ],
    evening: [
      'How did today go?',
      'What was today like?',
      'What is worth noting before the day ends?',
      'What is still on your mind tonight?',
    ],
  },
};

const LEADS: Record<PromptKind, string[]> = {
  morning: ['', 'Morning. ', 'Before the day starts: ', 'Early again — '],
  evening: ['', 'Evening. ', 'Day done: ', 'Late one — '],
};

/** FNV-1a, so the choice spreads across the whole pool instead of stepping by one. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small deterministic number from the date, so a question does not reshuffle on re-render. */
export function daySeed(now = new Date()): number {
  return now.getFullYear() * 372 + (now.getMonth() + 1) * 31 + now.getDate();
}

/** Reads a signal from the last few entries, never from a diagnosis. */
export function signalFromAnalysis(analysis: Analysis): QuestionSignal {
  const top = analysis.emotions[0]?.label;
  if (analysis.risk.level === 'urgent' || analysis.risk.level === 'elevated') return 'heavy';
  if (analysis.moodBand === 'heavy' || analysis.distress >= 65) return 'heavy';
  if (top === 'anxiety' || top === 'fear') return 'anxious';
  if (top === 'anger') return 'angry';
  if (top === 'numbness') return 'flat';
  if (analysis.moodBand === 'bright' && analysis.distress < 35) return 'bright';
  return 'steady';
}

export function signalFromEntries(entries: JournalEntry[]): QuestionSignal {
  if (entries.length === 0) return 'steady';
  const recent = entries.slice(0, 3).map((entry) => signalFromAnalysis(entry.analysis));
  const heavy = recent.filter((signal) => signal === 'heavy').length;
  if (heavy >= 2) return 'heavy';
  if (recent.every((signal) => signal === 'bright')) return 'bright';
  return recent[0];
}

export function kindForHour(hour: number): PromptKind {
  return hour >= 5 && hour < 17 ? 'morning' : 'evening';
}

export interface QuestionContext {
  kind: PromptKind;
  entries: JournalEntry[];
  now?: Date;
}

/**
 * Builds the question. `avoid` is the last one shown, so the app does not ask
 * the same thing twice in a row.
 */
export function questionFor({ kind, entries, now = new Date() }: QuestionContext, avoid?: string): string {
  const signal = signalFromEntries(entries);
  const pool = SIGNAL_QUESTIONS[signal][kind];
  const leads = LEADS[kind];
  const seed = hash(
    [
      daySeed(now),
      kind,
      signal,
      entries.length,
      entries[0]?.id ?? '',
      entries[0]?.text.slice(-32) ?? '',
      now.getHours(),
    ].join('|'),
  );
  const candidates: string[] = [];
  for (const question of pool) {
    for (const lead of leads) candidates.push(`${lead}${question}`);
  }

  const start = Math.abs(seed) % candidates.length;
  for (let step = 0; step < candidates.length; step += 1) {
    const candidate = candidates[(start + step) % candidates.length];
    if (candidate !== avoid) return candidate;
  }
  return candidates[start];
}

/** Kept for the notification scheduler, which has no store access. */
export function openerFor(kind: PromptKind, seed = daySeed()): string {
  const pool = SIGNAL_QUESTIONS.steady[kind];
  return pool[Math.abs(seed) % pool.length];
}
