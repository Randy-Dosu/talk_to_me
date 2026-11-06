/**
 * The one question the app opens with — morning and evening.
 *
 * Questions only: no suggestions, no suggested answers, no advice, no labels.
 * Three variants per window are chosen by the date so the app does not read as
 * a script, and every variant is short enough to answer in a line.
 */

export type PromptKind = 'morning' | 'evening';

export const OPENER_VARIANTS: Record<PromptKind, string[]> = {
  morning: ['What is on your mind this morning?', 'How are you starting today?', 'What do you want from today?'],
  evening: ['How did today go?', 'What is still on your mind tonight?', 'What was today like?'],
};

/** A small, deterministic seed so the question does not reshuffle on re-render. */
export function daySeed(now = new Date()): number {
  return now.getFullYear() * 372 + (now.getMonth() + 1) * 31 + now.getDate();
}

export function openerFor(kind: PromptKind, seed = daySeed()): string {
  const variants = OPENER_VARIANTS[kind];
  return variants[Math.abs(seed) % variants.length];
}
