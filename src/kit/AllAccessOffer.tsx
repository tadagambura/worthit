// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The cross-app upgrade offer. Someone who already pays for Premium in another KC app opens
// this one: we suggest KC All Access once, with the real numbers, then leave them alone for
// 30 days. It only ever appears when we can see the other app's Premium, which needs a KC
// account (purchases are per app in both stores), and never during first-run onboarding.
import { useEffect, useState } from 'react';
import { crossAppOffer } from './entitlements';
import { PaywallSheet } from './Paywall';
import { andList, appName, fallbackPrice } from './plans';
import { prefsStore } from './prefs';
import { usePremium } from './premium';
import { kv } from './storage';
import { useTheme } from './theme';

const key = (app: string) => `kc.offer.allaccess.${app}`;

export function AllAccessOffer() {
  const { brand } = useTheme();
  const { access, ready, mode, products } = usePremium();
  // Bind the store hook to a use* name: the React Compiler caches plain calls, which would skip the hook.
  const usePrefs = prefsStore(brand.slug);
  const onboarded = usePrefs((s) => s.onboarded);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready || !onboarded || open || mode === 'unavailable') return;
    const raw = kv.get(key(brand.slug));
    const last = raw ? Number(raw) : null;
    if (!crossAppOffer(access, Number.isFinite(last) ? last : null, Date.now())) return;
    kv.set(key(brand.slug), String(Date.now()));
    setOpen(true);
  }, [ready, onboarded, access, brand.slug, open, mode]);

  if (!open) return null;
  const others = andList(access.otherPremiums.map(appName));
  // The store's own price once loaded (the sheet loads it), so non-UK stores see their currency.
  const each = products.items.find((p) => p.line === 'app_premium' && p.period === 'monthly')?.priceString ?? fallbackPrice('app_premium', 'monthly');
  return (
    <PaywallSheet
      visible={open}
      onClose={() => setOpen(false)}
      line="all_access"
      reason={`You already have ${others} Premium. Adding ${brand.name} Premium on its own would be another ${each} a month. KC All Access gives you Premium in every Kaotic Chainz app, and every Arcade game yours forever, in one subscription.`}
    />
  );
}
