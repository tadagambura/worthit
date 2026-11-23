// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The one paywall every KC app uses: this app's Premium, KC All Access and KC Arcade.
// Rules: the recurring price and billing period are on the button itself, yearly is shown
// first with its real monthly equivalent (never a made-up "was" price), no countdowns or fake
// urgency, cancelling is one tap to the store, and restore is always visible.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { track } from './analytics';
import type { Product } from './billing';
import { checkPurchase } from './entitlements';
import { useFeedback } from './feedback';
import { annualSavingPercent, LINE_COPY, monthlyEquivalent, periodLabel, type BillingPeriod, type ProductLine } from './plans';
import { usePremium } from './premium';
import { useTheme } from './theme';
import { Body, Button, H2, Muted, Note, Row, Segmented, Sheet, Stack, Strong } from './ui';

const ALL_ACCESS_PERKS = ['Premium in every Kaotic Chainz app', 'The whole KC Arcade while you subscribe', 'Subscriber-only games and extras', 'One subscription, one price'];
const ARCADE_PERKS = ['Every included KC Arcade game, in every app', 'Yours forever: one payment, no subscription', 'Rewards from games feed back into your apps'];

export function priceLine(p: Product): string {
  if (p.period === 'lifetime') return `${p.priceString} once`;
  return `${p.priceString} ${periodLabel(p.period)}`;
}

export function buyLabel(p: Product, appName: string): string {
  if (p.line === 'arcade') return `Buy KC Arcade for ${p.priceString}`;
  const what = p.line === 'all_access' ? 'All Access' : `${appName} Premium`;
  return `Subscribe to ${what}: ${priceLine(p)}`;
}

export function PaywallSheet({ visible, onClose, reason, line: initialLine = 'app_premium' }: { visible: boolean; onClose: () => void; reason?: string; line?: ProductLine }) {
  const { brand, c, radius } = useTheme();
  const premium = usePremium();
  const { mode, access, products, loadProducts, purchase, restore, manageSubscriptions, pending } = premium;
  const { toast } = useFeedback();
  const [line, setLine] = useState<ProductLine>(initialLine);
  const [period, setPeriod] = useState<BillingPeriod>('annual');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLine(initialLine);
    setError(null);
    setDone(null);
    track('paywall_viewed', { reason: reason ? 'gate' : 'settings', line: initialLine, mode });
    loadProducts();
  }, [visible, initialLine, reason, mode, loadProducts]);

  const forLine = useMemo(() => products.items.filter((p) => p.line === line), [products.items, line]);
  const selected = forLine.find((p) => p.period === (line === 'arcade' ? 'lifetime' : period)) ?? forLine[0];
  const monthly = forLine.find((p) => p.period === 'monthly');
  const annual = forLine.find((p) => p.period === 'annual');
  const saving = monthly?.priceMinor && annual?.priceMinor ? annualSavingPercent(monthly.priceMinor, annual.priceMinor) : 0;
  const check = checkPurchase(access, line, brand.name);
  const store = Platform.OS === 'ios' ? 'Apple ID' : Platform.OS === 'android' ? 'Google Play account' : 'app store account';
  const hasSub = access.appPremium || access.allAccess;
  const perks = line === 'app_premium' ? brand.premiumPerks : line === 'all_access' ? ALL_ACCESS_PERKS : ARCADE_PERKS;

  const buy = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const r = await purchase(selected);
    setBusy(false);
    if (r.status === 'success') setDone(r.message);
    else if (r.status === 'cancelled') toast(r.message);
    else if (r.status === 'pending') toast(r.message);
    else setError(r.message);
  };

  if (done) {
    return (
      <Sheet visible={visible} onClose={onClose} title="You're all set" testID="paywall">
        <Stack gap={14}>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Ionicons name="checkmark-circle" size={56} color={c.success} />
            <H2 testID="paywall-success">{done}</H2>
            {mode === 'test' ? <Muted>Test mode: no real money changed hands.</Muted> : null}
          </View>
          <Button title="Back to the app" onPress={onClose} testID="paywall-done" />
        </Stack>
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={`${brand.name} Premium`} testID="paywall">
      <Stack gap={14}>
        {mode === 'test' ? <Note tone="warning">Test mode: no real purchase. This build isn't connected to the App Store or Google Play.</Note> : null}
        {mode === 'unavailable' ? <Note>Premium is coming soon. Everything in the free version keeps working.</Note> : null}
        {access.billingIssue ? (
          <Note tone="warning">{"Your last payment didn't go through. You keep everything for now while the store retries. Update your payment details to stay subscribed."}</Note>
        ) : null}
        {!access.premium && access.expired.length ? (
          <Note>Your subscription has ended. Everything you made is still here, and the free features keep working. You can resubscribe anytime.</Note>
        ) : null}
        {access.overlapping.length ? (
          <Note tone="warning">{`You have All Access and ${access.overlapping.length === 1 ? 'a separate app Premium' : `${access.overlapping.length} separate app Premiums`} still renewing. All Access already covers ${access.overlapping.length === 1 ? 'it' : 'them'}, so cancel the extra in your subscriptions to avoid paying twice.`}</Note>
        ) : null}
        {pending ? <Note>Your payment is waiting for approval. Everything unlocks as soon as the store confirms it.</Note> : null}
        {reason ? <Body>{reason}</Body> : null}

        <Segmented<ProductLine>
          label="What to unlock"
          value={line}
          onChange={(v) => {
            setLine(v);
            setError(null);
          }}
          options={[
            { value: 'app_premium', label: 'Premium' },
            { value: 'all_access', label: 'All Access' },
            { value: 'arcade', label: 'Arcade' },
          ]}
          testID="paywall-line"
        />
        <Muted>{LINE_COPY[line].blurb(brand.name)}</Muted>

        {line === 'app_premium' ? (
          <View style={{ flexDirection: 'row', gap: 10 }} accessible accessibilityLabel="Free versus Premium">
            <View style={{ flex: 1, gap: 6, padding: 12, borderRadius: radius, backgroundColor: c.surfaceAlt }}>
              <Strong>Free</Strong>
              {(brand.freeFeatures ?? ['All the core features', 'Your data stays on your phone', 'No account needed']).map((f) => (
                <Row key={f} gap={6} style={{ alignItems: 'flex-start' }}>
                  <Ionicons name="checkmark" size={16} color={c.textMuted} />
                  <Muted style={{ flex: 1 }}>{f}</Muted>
                </Row>
              ))}
            </View>
            <View style={{ flex: 1, gap: 6, padding: 12, borderRadius: radius, borderWidth: 2, borderColor: c.primary }}>
              <Strong>Premium</Strong>
              {perks.map((f) => (
                <Row key={f} gap={6} style={{ alignItems: 'flex-start' }}>
                  <Ionicons name="checkmark-circle" size={16} color={c.success} />
                  <Body style={{ flex: 1 }}>{f}</Body>
                </Row>
              ))}
            </View>
          </View>
        ) : (
          <Stack gap={8}>
            {perks.map((p) => (
              <Row key={p} gap={10} style={{ alignItems: 'flex-start' }}>
                <Ionicons name="checkmark-circle" size={20} color={c.success} />
                <Body style={{ flex: 1 }}>{p}</Body>
              </Row>
            ))}
          </Stack>
        )}

        {mode === 'unavailable' ? null : !check.ok ? (
          <Note>{check.message}</Note>
        ) : products.status === 'loading' || products.status === 'idle' ? (
          <Row gap={10} style={{ justifyContent: 'center', padding: 12 }}>
            <ActivityIndicator color={c.primary} />
            <Muted>Getting prices from the store…</Muted>
          </Row>
        ) : !selected ? (
          <Note tone="warning">{"Couldn't load prices from the store. Check your connection and try again."}</Note>
        ) : (
          <>
            {line !== 'arcade' && monthly && annual ? (
              <View accessibilityRole="radiogroup" accessibilityLabel="Billing period" style={{ gap: 8 }}>
                {[annual, monthly].map((p) => {
                  const on = p.period === selected.period;
                  return (
                    <Pressable
                      key={p.period}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      aria-checked={on}
                      accessibilityLabel={`${p.period === 'monthly' ? 'Monthly' : 'Yearly'}, ${priceLine(p)}`}
                      onPress={() => setPeriod(p.period)}
                      testID={`plan-${p.period}`}
                      style={{ borderWidth: 2, borderColor: on ? c.primary : c.border, borderRadius: radius, padding: 14, backgroundColor: c.surface }}
                    >
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Strong>{p.period === 'monthly' ? 'Monthly' : 'Yearly'}</Strong>
                        <Strong>{priceLine(p)}</Strong>
                      </Row>
                      {p.period === 'annual' && p.priceMinor ? (
                        <Muted>{`Works out at ${monthlyEquivalent(p.priceMinor)} a month${saving ? `, ${saving}% less than monthly` : ''}. Billed yearly.`}</Muted>
                      ) : (
                        <Muted>Billed every month.</Muted>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {check.note ? <Muted>{check.note}</Muted> : null}
            {error ? (
              <Note tone="warning">
                <Text testID="paywall-error">{error}</Text>
              </Note>
            ) : null}
            <Button title={mode === 'test' ? `${buyLabel(selected, brand.name)} (test)` : buyLabel(selected, brand.name)} loading={busy} disabled={busy} testID="paywall-buy" onPress={buy} />
          </>
        )}

        <Row gap={8} style={{ justifyContent: 'center' }} wrap>
          <Button
            title="Restore purchases"
            variant="ghost"
            small
            testID="paywall-restore"
            onPress={async () => {
              const r = await restore();
              toast(r.message);
            }}
          />
          {hasSub && mode === 'live' ? <Button title="Manage subscription" variant="ghost" small testID="paywall-manage" onPress={manageSubscriptions} /> : null}
        </Row>
        <Muted>
          {line === 'arcade'
            ? `KC Arcade is a one-off payment charged to your ${store}. It never renews.`
            : `Subscriptions are charged to your ${store} and renew automatically at the price shown unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in your ${store} subscription settings. Cancelling keeps all your data.`}
        </Muted>
        <Row gap={16} style={{ justifyContent: 'center' }}>
          <Text accessibilityRole="link" style={{ color: c.primary }} onPress={() => WebBrowser.openBrowserAsync(brand.termsUrl)}>
            Terms
          </Text>
          <Text accessibilityRole="link" style={{ color: c.primary }} onPress={() => WebBrowser.openBrowserAsync(brand.privacyUrl)}>
            Privacy
          </Text>
        </Row>
      </Stack>
    </Sheet>
  );
}
