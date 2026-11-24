// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
// Web stand-ins: Google Mobile Ads doesn't run on web. Phones use views.native.tsx.
import type { SdkEvent } from './sdk.types';

export const viewsSupported = false;

type Common = { unitId: string; npa: boolean; onEvent: (e: SdkEvent) => void };

export function SdkBanner(_: Common & { onHeight: (h: number) => void }) {
  return null;
}

export function SdkNative(_: Common) {
  return null;
}
