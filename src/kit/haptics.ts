// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const on = Platform.OS === 'ios' || Platform.OS === 'android';

export function tap() {
  if (on) Haptics.selectionAsync().catch(() => {});
}
export function success() {
  if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
export function warn() {
  if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
