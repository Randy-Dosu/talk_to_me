import { useCallback, useEffect, useState } from 'react';
import type { Settings } from '../engine/types';
import { daySeed, openerFor } from '../data/prompts';
import { nextSlot } from './dayPrompter';

type Permission = 'unsupported' | 'default' | 'granted' | 'denied';

const PERMISSION_EVENT = 'nkommo:permission';

function readPermission(): Permission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as Permission;
}

/** Permission state for UI. Asking must come from a user gesture. */
export function useNotificationPermission() {
  const [permission, setPermission] = useState<Permission>(readPermission);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return 'unsupported' as Permission;
    }
    try {
      const result = (await Notification.requestPermission()) as Permission;
      setPermission(result);
      window.dispatchEvent(new Event(PERMISSION_EVENT));
      return result;
    } catch {
      setPermission('denied');
      return 'denied' as Permission;
    }
  }, []);

  return { permission, requestPermission, supported: permission !== 'unsupported' };
}

/**
 * Schedules at most one reminder per slot, while this tab is alive.
 *
 * There is no service worker and no push subscription: a closed tab does not
 * get a notification, and the UI says so. The body is a starter question —
 * never journal content.
 */
export function useReminderScheduler(settings: Settings) {
  const [tick, setTick] = useState(0);
  const [permission, setPermission] = useState<Permission>(readPermission);

  // Permission can be granted from Settings or the chat card; re-read it then.
  useEffect(() => {
    const sync = () => setPermission(readPermission());
    window.addEventListener(PERMISSION_EVENT, sync);
    return () => window.removeEventListener(PERMISSION_EVENT, sync);
  }, []);

  useEffect(() => {
    if (permission !== 'granted' || !settings.remindersEnabled) return;
    const slot = nextSlot(settings, new Date());
    if (!slot) return;
    const delay = slot.at.getTime() - Date.now();
    if (delay <= 0 || delay > 2_147_483_647) return;

    const timer = window.setTimeout(() => {
      setTick((value) => value + 1);
      try {
        const question = openerFor(slot.kind, daySeed(new Date()));
        new Notification(slot.kind === 'morning' ? 'Nkommo · plan the day' : 'Nkommo · close the day', {
          body: question,
          tag: `nkommo-${slot.kind}`,
        });
      } catch {
        // hidden page or blocked notification: the in-app card still appears
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [settings.remindersEnabled, settings.morningTime, settings.eveningTime, permission, tick]);
}
