// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// One gentle daily reminder per app, at a time the person picks (The Progression Loop:
// at most one nudge a day, never guilt). Permission is only requested when the person
// switches a reminder on, right after the screen has explained why.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { track } from './analytics';

export const remindersSupported = Platform.OS === 'ios' || Platform.OS === 'android';

if (remindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export type ReminderResult = { ok: true } | { ok: false; reason: 'unsupported' | 'denied' | 'error' };

/** A daily reminder, or a weekly one when `weekday` is set (1 = Sunday … 7 = Saturday). */
export async function enableDailyReminder(opts: { id: string; hour: number; minute: number; title: string; body: string; weekday?: number }): Promise<ReminderResult> {
  if (!remindersSupported) return { ok: false, reason: 'unsupported' };
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return { ok: false, reason: 'denied' };
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily', { name: 'Daily reminder', importance: Notifications.AndroidImportance.DEFAULT });
    }
    await Notifications.cancelScheduledNotificationAsync(opts.id).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: opts.id,
      content: { title: opts.title, body: opts.body },
      trigger:
        opts.weekday != null
          ? { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: opts.weekday, hour: opts.hour, minute: opts.minute, channelId: 'daily' }
          : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: opts.hour, minute: opts.minute, channelId: 'daily' },
    });
    track('reminder_enabled', { hour: opts.hour, weekly: opts.weekday != null });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

export async function disableReminder(id: string) {
  if (!remindersSupported) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  track('reminder_disabled');
}

export function reminderError(r: ReminderResult): string | null {
  if (r.ok) return null;
  if (r.reason === 'unsupported') return 'Reminders work in the phone app, not in the browser.';
  if (r.reason === 'denied') return 'Notifications are switched off for this app. You can turn them on in your phone settings.';
  return "Couldn't set the reminder. Please try again.";
}
