/**
 * The shape of what may be uploaded, and how a restore merges with local data.
 *
 * Kept pure so the merge rules are testable without a network. Deliberate
 * omissions: location (never leaves the device), the trusted contact, the HF
 * token and the AI settings.
 */

import type { CheckIn, JournalEntry, SafetyPlan, Settings } from '../engine/types';

export interface CloudSettings {
  displayName: string;
  language: Settings['language'];
  remindersEnabled: boolean;
  morningTime: string;
  eveningTime: string;
}

export interface CloudRoot {
  version: 1;
  updatedAt: string;
  settings: CloudSettings;
  safetyPlan: SafetyPlan;
}

export interface CloudPayload {
  root: CloudRoot;
  entries: JournalEntry[];
  checkins: CheckIn[];
}

export function settingsForCloud(settings: Settings): CloudSettings {
  return {
    displayName: settings.displayName,
    language: settings.language,
    remindersEnabled: settings.remindersEnabled,
    morningTime: settings.morningTime,
    eveningTime: settings.eveningTime,
  };
}

export function settingsFromCloud(cloud: Partial<CloudSettings> | undefined, local: Settings): Partial<Settings> {
  const patch: Partial<Settings> = {};
  if (typeof cloud?.displayName === 'string') patch.displayName = cloud.displayName;
  if (cloud?.language === 'en' || cloud?.language === 'tw-en') patch.language = cloud.language;
  if (typeof cloud?.remindersEnabled === 'boolean') patch.remindersEnabled = cloud.remindersEnabled;
  if (typeof cloud?.morningTime === 'string') patch.morningTime = cloud.morningTime;
  if (typeof cloud?.eveningTime === 'string') patch.eveningTime = cloud.eveningTime;
  return { ...patch, location: local.location, trusted: local.trusted, ai: local.ai };
}

/**
 * Union by id, remote winning on a clash. A restore is additive: it never
 * deletes something written on this device that the cloud has not seen.
 */
export function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const merged = new Map<string, T>();
  for (const item of local) merged.set(item.id, item);
  for (const item of remote) merged.set(item.id, item);
  return [...merged.values()];
}

export function newestFirst<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
