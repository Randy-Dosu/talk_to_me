/**
 * Conversation starters with a psychological mechanism behind each one.
 *
 * They are questions, not advice. Each is short enough to answer in a line and
 * pointed enough to be useful: affect labelling, implementation intentions,
 * self-compassion, cognitive reappraisal, behavioural activation, savouring.
 *
 * Nothing here is a clinical instrument. The mechanism tag exists so the writer
 * (and a reviewing clinician) can see why a question is being asked.
 */

import type { Analysis, JournalEntry } from '../engine/types';

export type PromptKind = 'morning' | 'evening';

export type StarterState = 'low' | 'anxious' | 'angry' | 'numb' | 'good' | 'mixed';

export type Mechanism =
  | 'affect labelling'
  | 'implementation intention'
  | 'self-compassion'
  | 'values check'
  | 'cognitive reappraisal'
  | 'behavioural activation'
  | 'savouring'
  | 'interoception'
  | 'social support'
  | 'energy audit'
  | 'self-continuity'
  | 'narrative';

export interface Starter {
  id: string;
  text: string;
  mechanism: Mechanism;
}

export const MORNING_STARTERS: Starter[] = [
  { id: 'm1', text: 'What is one thing that would make today feel more like yours?', mechanism: 'values check' },
  { id: 'm2', text: 'Where could today be gentler than yesterday?', mechanism: 'self-compassion' },
  { id: 'm3', text: 'What are you carrying into today that you would rather put down?', mechanism: 'affect labelling' },
  { id: 'm4', text: 'By tonight, what would make today feel like enough?', mechanism: 'implementation intention' },
  { id: 'm5', text: 'If you did only one useful thing today, what should it be?', mechanism: 'behavioural activation' },
  { id: 'm6', text: 'What is the first hour of today asking of you?', mechanism: 'implementation intention' },
  { id: 'm7', text: 'Who usually steadies you — is there a version of that available today?', mechanism: 'social support' },
  { id: 'm8', text: 'What do you want to protect time for today?', mechanism: 'values check' },
];

export const EVENING_STARTERS: Starter[] = [
  { id: 'e1', text: 'Before the day closes: what is still sitting with you?', mechanism: 'affect labelling' },
  { id: 'e2', text: 'What did today ask of you that you did not expect?', mechanism: 'narrative' },
  { id: 'e3', text: 'If today had a weather report, what would it be — and what made it that way?', mechanism: 'affect labelling' },
  { id: 'e4', text: 'What would you say to a friend who had your exact day?', mechanism: 'self-compassion' },
  { id: 'e5', text: 'What is one moment from today you would keep?', mechanism: 'savouring' },
  { id: 'e6', text: 'Where did you push through today?', mechanism: 'values check' },
  { id: 'e7', text: 'What drained you today, and what refilled even a little?', mechanism: 'energy audit' },
  { id: 'e8', text: 'What do you want tomorrow-you to know about today?', mechanism: 'self-continuity' },
];

export const STATE_STARTERS: Record<StarterState, Starter[]> = {
  low: [
    { id: 'l1', text: 'When was the heaviness loudest today?', mechanism: 'affect labelling' },
    { id: 'l2', text: 'What did you need today that you did not get?', mechanism: 'affect labelling' },
    { id: 'l3', text: 'What felt even five percent easier than the rest today?', mechanism: 'behavioural activation' },
    { id: 'l4', text: 'If the heaviness could speak, what would it be asking for?', mechanism: 'self-compassion' },
  ],
  anxious: [
    { id: 'a1', text: 'What does the worry keep saying will happen?', mechanism: 'cognitive reappraisal' },
    { id: 'a2', text: 'What is the worst case your mind has been rehearsing?', mechanism: 'cognitive reappraisal' },
    { id: 'a3', text: 'Where do you feel it in your body right now?', mechanism: 'interoception' },
    { id: 'a4', text: 'What part of this is actually yours to carry?', mechanism: 'cognitive reappraisal' },
  ],
  angry: [
    { id: 'g1', text: 'What got crossed for you today?', mechanism: 'affect labelling' },
    { id: 'g2', text: 'If the anger could say what it needed, what would it say?', mechanism: 'affect labelling' },
    { id: 'g3', text: 'What would you want the other person to understand?', mechanism: 'narrative' },
  ],
  numb: [
    { id: 'n1', text: 'What do you wish you could feel right now?', mechanism: 'affect labelling' },
    { id: 'n2', text: 'What is one small thing that usually touches you, even a little?', mechanism: 'behavioural activation' },
    { id: 'n3', text: 'When did you last notice your body asking for something?', mechanism: 'interoception' },
  ],
  good: [
    { id: 'p1', text: 'What made today work?', mechanism: 'savouring' },
    { id: 'p2', text: 'Who or what made today easier?', mechanism: 'social support' },
    { id: 'p3', text: 'What from today would you want to carry into tomorrow?', mechanism: 'self-continuity' },
  ],
  mixed: [
    { id: 'x1', text: 'Which part of today is loudest in your head right now?', mechanism: 'affect labelling' },
    { id: 'x2', text: 'If today were two days, which one are you still in?', mechanism: 'narrative' },
    { id: 'x3', text: 'What would you want to leave here before you sleep?', mechanism: 'affect labelling' },
  ],
};

export const OPENER_VARIANTS: Record<PromptKind, string[]> = {
  morning: [
    'Before the day gets loud — what is already on your mind?',
    'What would make today a little more manageable?',
    'The day has not decided yet. What do you want from it?',
  ],
  evening: [
    'Before the day closes, what is still sitting with you?',
    'How did today actually go — not the polite version?',
    'What is worth putting down here before the day ends?',
  ],
};

/** A small, deterministic seed so prompts do not reshuffle on every render. */
export function daySeed(now = new Date()): number {
  return now.getFullYear() * 372 + (now.getMonth() + 1) * 31 + now.getDate();
}

export function stateFromAnalysis(analysis: Analysis): StarterState {
  const top = analysis.emotions[0]?.label;
  if (analysis.risk.level === 'urgent' || analysis.risk.level === 'elevated') return 'low';
  if (analysis.moodBand === 'heavy' || analysis.distress >= 65) return 'low';
  if (top === 'anxiety' || top === 'fear') return 'anxious';
  if (top === 'anger') return 'angry';
  if (top === 'numbness') return 'numb';
  if (analysis.moodBand === 'bright' && analysis.distress < 35) return 'good';
  return 'mixed';
}

/** Uses the most recent entries so starters reflect the week, not one line. */
export function stateFromEntries(entries: JournalEntry[]): StarterState {
  if (entries.length === 0) return 'mixed';
  const recent = entries.slice(0, 3);
  const states = recent.map((entry) => stateFromAnalysis(entry.analysis));
  const lowCount = states.filter((state) => state === 'low').length;
  if (lowCount >= 2) return 'low';
  const anxiousCount = states.filter((state) => state === 'anxious').length;
  if (anxiousCount >= 2) return 'anxious';
  if (states.every((state) => state === 'good')) return 'good';
  return states[0];
}

export function pickStarters(kind: PromptKind, state: StarterState, seed = daySeed(), count = 3): Starter[] {
  const timePool = kind === 'morning' ? MORNING_STARTERS : EVENING_STARTERS;
  const statePool = STATE_STARTERS[state];
  const picks: Starter[] = [
    timePool[seed % timePool.length],
    timePool[(seed + 3) % timePool.length],
    statePool[seed % statePool.length],
  ];
  const seen = new Set<string>();
  return picks.filter((starter) => {
    if (seen.has(starter.id)) return false;
    seen.add(starter.id);
    return true;
  }).slice(0, count);
}

/**
 * The opening line is a question and nothing else — no advice, no suggested
 * answer, no reassurance the person did not ask for.
 */
export function openerFor(kind: PromptKind, _state: StarterState, seed = daySeed()): string {
  const variants = OPENER_VARIANTS[kind];
  return variants[seed % variants.length];
}
