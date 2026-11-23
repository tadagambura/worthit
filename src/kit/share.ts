// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
import { Platform, Share } from 'react-native';
import { track } from './analytics';

/** Share a short message. Returns true if the share sheet completed (or text was copied on web). */
export async function shareText(message: string, kind: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: { text: string }) => Promise<void> }) : null;
      if (nav?.share) {
        await nav.share({ text: message });
      } else if (nav?.clipboard) {
        await nav.clipboard.writeText(message);
      } else return false;
      track('share_completed', { kind });
      return true;
    }
    const r = await Share.share({ message });
    if (r.action === Share.sharedAction) {
      track('share_completed', { kind });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
