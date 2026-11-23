// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// Premium adapter. Live mode will use RevenueCat (react-native-purchases) once
// EXPO_PUBLIC_REVENUECAT_IOS_KEY / _ANDROID_KEY exist and the SDK is added at native-build
// time. Until then there are two honest modes:
// - "test": development builds only. Purchases flip a local flag, clearly labelled
//   "Test mode: no real purchase", so the premium journey can be tested end to end.
// - "unavailable": release builds with no store keys. The paywall says premium isn't
//   available yet and never pretends to charge.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { track } from './analytics';
import { kv } from './storage';
import type { Plan } from './theme';

export type PremiumMode = 'live' | 'test' | 'unavailable';

export type PremiumAdapter = {
  mode: PremiumMode;
  isPremium: () => boolean;
  purchase: (plan: Plan['id']) => Promise<{ ok: boolean; message: string }>;
  restore: () => Promise<{ ok: boolean; message: string }>;
  cancelTest?: () => void;
};

export function testAdapter(app: string, isDev: boolean): PremiumAdapter {
  const key = `${app}.premium.test`;
  return {
    mode: isDev ? 'test' : 'unavailable',
    isPremium: () => isDev && kv.get(key) === '1',
    purchase: async (plan) => {
      if (!isDev) return { ok: false, message: "Premium isn't available yet. Everything free keeps working." };
      kv.set(key, '1');
      track('subscription_started', { plan, mode: 'test' });
      return { ok: true, message: 'Test mode: premium switched on. No real purchase was made.' };
    },
    restore: async () => {
      if (!isDev) return { ok: false, message: 'Nothing to restore yet.' };
      return kv.get(key) === '1' ? { ok: true, message: 'Test mode: premium restored.' } : { ok: false, message: 'No purchases found on this device.' };
    },
    cancelTest: () => kv.remove(key),
  };
}

const Ctx = createContext<{
  isPremium: boolean;
  mode: PremiumMode;
  purchase: (plan: Plan['id']) => Promise<{ ok: boolean; message: string }>;
  restore: () => Promise<{ ok: boolean; message: string }>;
  cancelTest: (() => void) | null;
} | null>(null);

export function PremiumProvider({ adapter, children }: { adapter: PremiumAdapter; children: ReactNode }) {
  const [isPremium, setPremium] = useState(adapter.isPremium());
  const value = useMemo(
    () => ({
      isPremium,
      mode: adapter.mode,
      purchase: async (plan: Plan['id']) => {
        const r = await adapter.purchase(plan);
        setPremium(adapter.isPremium());
        return r;
      },
      restore: async () => {
        const r = await adapter.restore();
        if (r.ok) track('purchase_restored', { mode: adapter.mode });
        setPremium(adapter.isPremium());
        return r;
      },
      cancelTest: adapter.cancelTest
        ? () => {
            adapter.cancelTest!();
            setPremium(adapter.isPremium());
          }
        : null,
    }),
    [adapter, isPremium],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePremium() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePremium must be used inside <PremiumProvider>');
  return v;
}
