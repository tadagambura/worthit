// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// <Gate> shows its children to people who can use a tier, and a friendly locked card with the
// right paywall tab to everyone else. Apps declare features once with defineFeatures() and
// never check entitlements themselves:
//   export const FEATURES = defineFeatures({ whiteboard: 'premium', spicyDeck: 'premium' });
//   <Gate tier={FEATURES.whiteboard} title="Whiteboard" reason="Draw on a tablet-sized board.">…</Gate>
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { lineForTier, type Tier } from './entitlements';
import { PaywallSheet } from './Paywall';
import { usePremium } from './premium';
import { useTheme } from './theme';
import { Button, Card, Muted, Row, Strong } from './ui';

const TIER_LABEL: Record<Tier, string> = {
  free: 'Free',
  premium: 'Premium',
  all_access: 'KC All Access',
  arcade: 'KC Arcade',
};

export function tierLabel(t: Tier): string {
  return TIER_LABEL[t];
}

export function Gate({ tier, title, reason, children, fallback }: { tier: Tier; title: string; reason: string; children: ReactNode; fallback?: ReactNode }) {
  const { can } = usePremium();
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  if (can(tier)) return <>{children}</>;
  return (
    <>
      {fallback ?? (
        <Card testID={`gate-${tier}`}>
          <Row gap={8}>
            <Ionicons name="lock-closed" size={18} color={c.primary} />
            <Strong style={{ flex: 1 }}>{title}</Strong>
            <Muted>{TIER_LABEL[tier]}</Muted>
          </Row>
          <Muted>{reason}</Muted>
          <Button title={`See ${TIER_LABEL[tier]}`} small onPress={() => setOpen(true)} testID={`gate-${tier}-open`} />
        </Card>
      )}
      <PaywallSheet visible={open} onClose={() => setOpen(false)} reason={reason} line={lineForTier(tier)} />
    </>
  );
}

/** For "tap to try, see paywall if locked" flows: returns a function that runs `fn` or opens the paywall. */
export function useGated(tier: Tier, reason: string) {
  const { can } = usePremium();
  const [open, setOpen] = useState(false);
  const run = (fn: () => void) => (can(tier) ? fn() : setOpen(true));
  const sheet = <PaywallSheet visible={open} onClose={() => setOpen(false)} reason={reason} line={lineForTier(tier)} />;
  return { run, sheet, allowed: can(tier) };
}
