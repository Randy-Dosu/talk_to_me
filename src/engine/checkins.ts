/**
 * PHQ-9 and GAD-7.
 *
 * Both instruments are public-domain screeners. They are used here exactly as
 * intended: to grade symptom severity over the past two weeks and to prompt a
 * conversation — never to diagnose.
 *
 * Safety rule enforced in code: PHQ-9 item 9 (self-harm ideation) at any
 * level >= 1 raises a flag regardless of the total score.
 */

import crypto from './id';
import type { CheckIn, ScaleId } from './types';

export interface ScaleItem {
  id: string;
  text: string;
  /** Plain-language helper, written for a first-time, low-literacy reader. */
  helper?: string;
  safety?: boolean;
}

export interface ScaleDefinition {
  id: ScaleId;
  name: string;
  fullName: string;
  lookback: string;
  items: ScaleItem[];
  options: { label: string; helper: string; value: number }[];
  maxScore: number;
  bands: { max: number; label: string; advice: string }[];
  source: string;
}

const FOUR_POINT_OPTIONS = [
  { label: 'Not at all', helper: '0 days', value: 0 },
  { label: 'Several days', helper: '1–6 days', value: 1 },
  { label: 'More than half the days', helper: '7–11 days', value: 2 },
  { label: 'Nearly every day', helper: '12–14 days', value: 3 },
];

export const PHQ9: ScaleDefinition = {
  id: 'PHQ9',
  name: 'PHQ-9',
  fullName: 'Patient Health Questionnaire — 9',
  lookback: 'Over the last 2 weeks, how often have you been bothered by any of the following?',
  items: [
    { id: 'phq1', text: 'Little interest or pleasure in doing things you normally enjoy.', helper: 'Food, friends, church, football — nothing pulls you.' },
    { id: 'phq2', text: 'Feeling down, depressed, or hopeless.', helper: 'A flat, grey feeling that will not lift.' },
    { id: 'phq3', text: 'Trouble falling or staying asleep, or sleeping too much.', helper: 'Lying awake, waking at 3am, or unable to get up.' },
    { id: 'phq4', text: 'Feeling tired or having little energy.', helper: 'Even small tasks feel like carrying a bag of cement.' },
    { id: 'phq5', text: 'Poor appetite or overeating.', helper: 'Food has lost taste, or you are eating past fullness.' },
    { id: 'phq6', text: 'Feeling bad about yourself — or that you are a failure or have let your family down.', helper: 'A voice telling you that you are not enough.' },
    { id: 'phq7', text: 'Trouble concentrating on things, like reading or watching something.', helper: 'You read the same line four times.' },
    { id: 'phq8', text: 'Moving or speaking so slowly that others notice — or the opposite, being restless and unable to sit still.', helper: 'People may ask if you are tired, or why you cannot settle.' },
    { id: 'phq9', text: 'Thoughts that you would be better off dead, or of hurting yourself in some way.', helper: 'Any thought in this direction is worth telling someone about.', safety: true },
  ],
  options: FOUR_POINT_OPTIONS,
  maxScore: 27,
  bands: [
    { max: 4, label: 'Minimal', advice: 'Nothing here needs clinical attention. Keep journalling and checking in.' },
    { max: 9, label: 'Mild', advice: 'Worth watching. Sleep, movement, and talking to someone you trust can help. Re-screen in two weeks.' },
    { max: 14, label: 'Moderate', advice: 'This is the threshold where guidelines recommend a proper conversation with a health worker.' },
    { max: 19, label: 'Moderately severe', advice: 'Please book an appointment with a clinician or counsellor this week. You do not have to manage this alone.' },
    { max: 27, label: 'Severe', advice: 'Please reach out to a professional now. The helplines on this page are free and confidential.' },
  ],
  source: 'Kroenke, Spitzer & Williams (2001). Public domain.',
};

export const GAD7: ScaleDefinition = {
  id: 'GAD7',
  name: 'GAD-7',
  fullName: 'Generalised Anxiety Disorder — 7',
  lookback: 'Over the last 2 weeks, how often have you been bothered by the following?',
  items: [
    { id: 'gad1', text: 'Feeling nervous, anxious, or on edge.', helper: 'A body that will not relax.' },
    { id: 'gad2', text: 'Not being able to stop or control worrying.', helper: 'The same worry going round and round.' },
    { id: 'gad3', text: 'Worrying too much about different things.', helper: 'Money, school, family, the future — all at once.' },
    { id: 'gad4', text: 'Trouble relaxing.', helper: 'Even rest feels like work.' },
    { id: 'gad5', text: 'Being so restless that it is hard to sit still.', helper: 'Your legs, your hands, your mind keep moving.' },
    { id: 'gad6', text: 'Becoming easily annoyed or irritable.', helper: 'Small things set you off.' },
    { id: 'gad7', text: 'Feeling afraid, as if something awful might happen.', helper: 'A dread you cannot name.' },
  ],
  options: FOUR_POINT_OPTIONS,
  maxScore: 21,
  bands: [
    { max: 4, label: 'Minimal', advice: 'Anxiety is not dominating your days right now.' },
    { max: 9, label: 'Mild', advice: 'Try slowing your breathing and writing down what is in your head. Re-screen in two weeks.' },
    { max: 14, label: 'Moderate', advice: 'A counsellor can help you build tools before this grows. Guidelines suggest a clinical conversation at this level.' },
    { max: 21, label: 'Severe', advice: 'Please speak to a professional soon. Free helplines are listed below.' },
  ],
  source: 'Spitzer, Kroenke, Williams & Löwe (2006). Public domain.',
};

export const SCALES: Record<ScaleId, ScaleDefinition> = { PHQ9, GAD7 };

export function bandFor(def: ScaleDefinition, score: number) {
  return def.bands.find((b) => score <= b.max) ?? def.bands[def.bands.length - 1];
}

export function createCheckIn(scale: ScaleId, answers: number[], when = new Date()): CheckIn {
  const def = SCALES[scale];
  const safeAnswers = answers.map((a) => Math.min(3, Math.max(0, Math.round(a))));
  const score = safeAnswers.reduce((acc, a) => acc + a, 0);
  const band = bandFor(def, score);
  const safetyItemIndex = def.items.findIndex((i) => i.safety);
  const item9 = safetyItemIndex >= 0 ? safeAnswers[safetyItemIndex] : undefined;

  return {
    id: crypto.id(),
    createdAt: when.toISOString(),
    scale,
    answers: safeAnswers,
    score,
    maxScore: def.maxScore,
    band: band.label,
    item9,
    safetyFlag: item9 !== undefined && item9 >= 1,
  };
}

/** Higher = more symptomatic. Used to plot PHQ-9/GAD-7 on the same scale. */
export function severityPercent(checkin: CheckIn): number {
  return Math.round((checkin.score / checkin.maxScore) * 100);
}
