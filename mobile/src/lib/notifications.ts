/**
 * On-device daily reminders for Android & iOS via `expo-notifications`.
 *
 * Unlike a closed browser tab on the website, the mobile app schedules local
 * OS notifications directly on the phone — no push server, no network call,
 * and no journal content in the notification body (only a short neutral
 * question, safe on shared phones).
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { openerFor } from '@shared/data/prompts';
import type { Settings } from '@shared/engine/types';
import { parseTime } from './mobileDayPrompter';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export type NotifPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getNotificationStatus(): Promise<NotifPermission> {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'undetermined';
  }
  try {
    const res = await Notifications.getPermissionsAsync();
    if (res.granted) return 'granted';
    if (!res.canAskAgain) return 'denied';
    return 'undetermined';
  } catch {
    return 'unsupported';
  }
}

export async function requestNotificationAccess(): Promise<NotifPermission> {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') return 'unsupported';
    try {
      const p = await Notification.requestPermission();
      return p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'undetermined';
    } catch {
      return 'denied';
    }
  }
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('nkommo-reminders', {
        name: 'Daily Journal Prompts',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: null,
        vibrationPattern: [0, 120],
      });
    }
    const res = await Notifications.requestPermissionsAsync();
    return res.granted ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}

export async function syncDailyReminders(settings: Settings): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!settings.remindersEnabled) return;

    const status = await getNotificationStatus();
    if (status !== 'granted') return;

    const morning = parseTime(settings.morningTime);
    const evening = parseTime(settings.eveningTime);

    if (morning) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Nkommo · Morning',
          body: openerFor('morning'),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: morning.hour,
          minute: morning.minute,
        },
      });
    }

    if (evening) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Nkommo · Evening',
          body: openerFor('evening'),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: evening.hour,
          minute: evening.minute,
        },
      });
    }
  } catch {
    // Simulator or restricted permission — fail quietly
  }
}
