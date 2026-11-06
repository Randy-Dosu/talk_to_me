/**
 * Time-of-day prompting: plan in the morning, reflect in the evening.
 *
 * Nothing here fires in the background. A browser tab cannot reliably wake
 * itself, so "reminders" are (a) an in-app card when the window is open and
 * (b) a Notification while the tab is alive. The copy says so rather than
 * pretending to be a push service.
 */

import type { Settings } from '../engine/types';
import type { PromptKind } from '../data/prompts';

export type Period = 'morning' | 'afternoon' | 'evening' | 'night';

export const DISMISS_KEY = 'nkommo.slotHints.v1';

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

/** Which prompt the open app should offer right now, if any. */
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

function readDismissals(): Record<string, true> {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, true>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function isDismissed(kind: PromptKind, now = new Date()): boolean {
  return Boolean(readDismissals()[`${dayStamp(now)}:${kind}`]);
}

export function dismiss(kind: PromptKind, now = new Date()): void {
  try {
    const today = dayStamp(now);
    const kept: Record<string, true> = {};
    for (const [key, value] of Object.entries(readDismissals())) {
      if (key.startsWith(today)) kept[key] = value;
    }
    kept[`${today}:${kind}`] = true;
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(kept));
  } catch {
    // private mode: the card just reappears next time
  }
}

export function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function minutesUntil(value: string, now = new Date()): number | null {
  const parsed = parseTime(value);
  if (!parsed) return null;
  const target = new Date(now);
  target.setHours(parsed.hour, parsed.minute, 0, 0);
  const diff = target.getTime() - now.getTime();
  return Math.round(diff / 60_000);
}

export interface ReminderSlot {
  kind: PromptKind;
  at: Date;
}

/** The next morning/evening reminder after `now`, within the next 24 hours. */
export function nextSlot(settings: Settings, now = new Date()): ReminderSlot | null {
  if (!settings.remindersEnabled) return null;
  const candidates: ReminderSlot[] = [];
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

export function formatClock(value: string): string {
  const parsed = parseTime(value);
  if (!parsed) return value;
  const suffix = parsed.hour >= 12 ? 'pm' : 'am';
  const hour = parsed.hour % 12 === 0 ? 12 : parsed.hour % 12;
  return `${hour}:${`${parsed.minute}`.padStart(2, '0')} ${suffix}`;
}
