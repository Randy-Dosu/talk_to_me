import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PromptKind } from '@shared/data/prompts';
import { dayStamp } from './mobileCore';

export {
  dayStamp,
  formatClock,
  nextSlot,
  parseTime,
  periodLabel,
  periodOfDay,
  promptWindow,
  type Period,
} from './mobileCore';

const DISMISS_KEY = 'nkommo.mobile.slotHints.v1';

export async function isWindowDismissed(kind: PromptKind, now = new Date()): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return Boolean(parsed?.[`${dayStamp(now)}:${kind}`]);
  } catch {
    return false;
  }
}

export async function dismissWindow(kind: PromptKind, now = new Date()): Promise<void> {
  try {
    const today = dayStamp(now);
    const raw = await AsyncStorage.getItem(DISMISS_KEY);
    const prev = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    const kept: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(prev)) {
      if (k.startsWith(today)) kept[k] = v;
    }
    kept[`${today}:${kind}`] = true;
    await AsyncStorage.setItem(DISMISS_KEY, JSON.stringify(kept));
  } catch {
    // ignore storage errors
  }
}
