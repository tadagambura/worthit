// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The one paywall every KC app uses: a single Arcade game (£0.99), this app's Premium (which
// includes every game in this app) and KC All Access (£25 once for every game in every app,
// plus the subscription for Premium everywhere).
// Rules: the price and billing period are on the button itself, one-off and recurring prices
// are always labelled as such, yearly is shown first with its real monthly equivalent (never a
// made-up "was" price), no countdowns or fake urgency, cancelling is one tap to the store, and
// restore is always visible.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { track } from './analytics';
import { arcade, paidGameIds } from './arcade/registry';
import { allAccessSteps, type Product } from './billing';
import { checkPurchase } from './entitlements';
import { useFeedback } from './feedback';
import { andList, annualSavingPercent, appName, gameKey, gamesValue, LINE_COPY, monthlyEquivalent, periodLabel, type BillingPeriod, type ProductLine } from './plans';
import { usePremium } from './premium';
import { useTheme } from './theme';
import { Body, Button, H2, Muted, Note, Row, Segmented, Sheet, Stack, Strong } from './ui';

type Tab = 'game' | 'app_premium' | 'all_access';
type SubPeriod = 'monthly' | 'annual';

const ALL_ACCESS_PERKS = [
  'Premium in every Kaotic Chainz app',
  'Every Arcade game in every app, yours forever',
  'Keep the games even if you stop the subscription',
  'One account, one subscription',
];

export function priceLine(p: Product): string {
  if (p.period === 'lifetime') return `${p.priceString} once`;
  return `${p.priceString} ${periodLabel(p.period)}`;
}

export function buyLabel(p: Product, appName_: string, gameName?: string): string {
  if (p.line === 'game') return `Buy ${gameName ?? 'this game'} for ${p.priceString}`;
  if (p.line === 'arcade') return `Get every game for ${p.priceString}`;
  const what = p.line === 'all_access' ? 'All Access' : `${appName_} Premium`;
  return `Subscribe to ${what}: ${priceLine(p)}`;
}

/** "Pay £25 now, then £7.99 a month", or just the subscription when the £25 part is owned. */
export function allAccessLabel(steps: Product[]): string {
  const sub = steps.find((p) => p.line === 'all_access');
  const pass = steps.find((p) => p.line === 'arcade');
  if (!sub) return 'Get KC All Access';
  return pass ? `Pay ${pass.priceString} now, then ${priceLine(sub)}` : `Subscribe to All Access: ${priceLine(sub)}`;
}

function tabFor(line: ProductLine, hasGame: boolean): Tab {
  if (line === 'game') return hasGame ? 'game' : 'app_premium';
  if (line === 'arcade' || line === 'all_access') return 'all_access';
  return 'app_premium';
}

export function PaywallSheet({
  visible,
  onClose,
  reason,
  line: initialLine = 'app_premium',
  game,
}: {
  visible: boolean;
  onClose: () => void;
  reason?: string;
  line?: ProductLine;
  /** Opened from a locked Arcade game: offers that game on its own first. */
  game?: { id: string; name: string; emoji?: string };
}) {
  const { brand, c, radius } = useTheme();
  const premium = usePremium();
  const { mode, access, products, loadProducts, purchase, purchaseAllAccess, restore, manageSubscriptions, pending, canPlay, signIn } = premium;
  const { toast } = useFeedback();
  const [tab, setTab] = useState<Tab>(tabFor(initialLine, !!game));
  const [period, setPeriod] = useState<SubPeriod>('annual');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTab(tabFor(initialLine, !!game));
    setError(null);
    setDone(null);
    track('paywall_viewed', { reason: game ? 'game' : reason ? 'gate' : 'settings', line: initialLine, mode });
    loadProducts();
  }, [visible, initialLine, game, reason, mode, loadProducts]);

  const items = products.items;
  const subs = useMemo(() => items.filter((p) => p.line === (tab === 'all_access' ? 'all_access' : 'app_premium')), [items, tab]);
  const monthly = subs.find((p) => p.period === 'monthly');
  const annual = subs.find((p) => p.period === 'annual');
  const saving = monthly?.priceMinor && annual?.priceMinor ? annualSavingPercent(monthly.priceMinor, annual.priceMinor) : 0;
  const premiumMonthly = items.find((p) => p.line === 'app_premium' && p.period === 'monthly');
  const gameProduct = game ? items.find((p) => p.line === 'game' && p.gameId === gameKey(game.id)) : undefined;
  const steps = tab === 'all_access' ? allAccessSteps(access, items, period) : [];
  const selected: Product | undefined = tab === 'game' ? gameProduct : tab === 'app_premium' ? (subs.find((p) => p.period === period) ?? subs[0]) : steps[steps.length - 1];
  const passStep = steps.find((p) => p.line === 'arcade');

  // The "one by one, or subscribe" comparison: only games this person hasn't got yet.
  const catalog = arcade()?.catalog;
  const lockedGames = paidGameIds().filter((id) => !canPlay({ id, tier: 'arcade' }));
  const anyGamePrice = gameProduct?.priceMinor ?? items.find((p) => p.line === 'game')?.priceMinor ?? undefined;
  const value = gamesValue(lockedGames.length, anyGamePrice ?? undefined);

  const check = checkPurchase(access, tab, brand.name, game?.id);
  const store = Platform.OS === 'ios' ? 'Apple ID' : Platform.OS === 'android' ? 'Google Play account' : 'app store account';
  const hasSub = access.appPremium || access.allAccess;
  const others = access.otherPremiums.map(appName);

  const buy = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const r = tab === 'all_access' ? await purchaseAllAccess(period) : await purchase(selected);
    setBusy(false);
    if (r.status === 'success') setDone(r.message);
    else if (r.status === 'cancelled' || r.status === 'pending') toast(r.message);
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
          <Button title={game && canPlay({ id: game.id, tier: 'arcade' }) ? `Play ${game.name}` : 'Back to the app'} onPress={onClose} testID="paywall-done" />
        </Stack>
      </Sheet>
    );
  }

  const tabs: { value: Tab; label: string }[] = [
    ...(game ? [{ value: 'game' as const, label: 'This game' }] : []),
    { value: 'app_premium', label: 'Premium' },
    { value: 'all_access', label: 'All Access' },
  ];

  const periodPicker = monthly && annual ? (
    <View accessibilityRole="radiogroup" accessibilityLabel="Billing period" style={{ gap: 8 }}>
      {[annual, monthly].map((p) => {
        const on = p.period === period;
        return (
          <Pressable
            key={p.period}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            aria-checked={on}
            accessibilityLabel={`${p.period === 'monthly' ? 'Monthly' : 'Yearly'}, ${priceLine(p)}`}
            onPress={() => setPeriod(p.period as SubPeriod)}
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
  ) : null;

  // Only shown when there's something to compare: 2+ games still locked and a Premium price.
  const gamesCompare =
    catalog && value.count > 1 && premiumMonthly ? (
      <View style={{ gap: 4, padding: 12, borderRadius: radius, backgroundColor: c.surfaceAlt }} testID="paywall-games-value">
        <Strong>{`${catalog.emoji} Every game in the ${catalog.title}`}</Strong>
        <Body>{`Buying the ${value.count} locked games one by one: ${value.total} once.`}</Body>
        <Body>{`With ${brand.name} Premium they're all included, plus everything else in Premium, for ${priceLine(premiumMonthly)}.`}</Body>
        {tab === 'game' ? <Button title={`See ${brand.name} Premium`} variant="ghost" small onPress={() => setTab('app_premium')} testID="paywall-see-premium" /> : null}
      </View>
    ) : null;

  const crossApp =
    others.length && !access.allAccess && tab !== 'all_access' ? (
      <View style={{ gap: 4, padding: 12, borderRadius: radius, borderWidth: 2, borderColor: c.primary }} testID="paywall-cross-app">
        <Strong>{`You already have ${andList(others)} Premium`}</Strong>
        <Body>{`Each app's Premium is ${premiumMonthly ? priceLine(premiumMonthly) : 'billed'} on its own. KC All Access covers Premium in every Kaotic Chainz app, and every game is yours forever.`}</Body>
        <Button title="See KC All Access" variant="ghost" small onPress={() => setTab('all_access')} testID="paywall-see-allaccess" />
      </View>
    ) : null;

  const signInPanel =
    !check.ok && check.reason === 'sign_in' ? (
      <Stack gap={8}>
        <Note>{signIn ? check.message : 'KC All Access is coming soon. It needs a free Kaotic Chainz account, so it works in every app and you never pay twice. Premium and single games are available now.'}</Note>
        {signIn ? <Button title="Sign in to Kaotic Chainz" onPress={signIn} testID="paywall-signin" /> : null}
      </Stack>
    ) : null;

  return (
    <Sheet visible={visible} onClose={onClose} title={tab === 'game' && game ? `${game.emoji ?? '🎮'} ${game.name}` : `${brand.name} Premium`} testID="paywall">
      <Stack gap={14}>
        {mode === 'test' ? <Note tone="warning">Test mode: no real purchase. This build isn't connected to the App Store or Google Play.</Note> : null}
        {mode === 'unavailable' ? <Note>Purchases are coming soon. Everything in the free version keeps working.</Note> : null}
        {access.billingIssue ? (
          <Note tone="warning">{"Your last payment didn't go through. You keep everything for now while the store retries. Update your payment details to stay subscribed."}</Note>
        ) : null}
        {!access.premium && access.expired.length ? (
          <Note>Your subscription has ended. Everything you made is still here, games you bought stay yours, and the free features keep working. You can resubscribe anytime.</Note>
        ) : null}
        {access.overlapping.length ? (
          <Note tone="warning">{`You have All Access and ${andList(access.overlapping.map((id) => `${appName(id.replace(/_premium$/, ''))} Premium`))} still renewing. All Access already covers ${access.overlapping.length === 1 ? 'it' : 'them'}, so cancel the extra in your subscriptions to avoid paying twice.`}</Note>
        ) : null}
        {pending ? <Note>Your payment is waiting for approval. Everything unlocks as soon as the store confirms it.</Note> : null}
        {reason ? <Body>{reason}</Body> : null}

        <Segmented<Tab>
          label="What to unlock"
          value={tab}
          onChange={(v) => {
            setTab(v);
            setError(null);
          }}
          options={tabs}
          testID="paywall-line"
        />
        <Muted>{LINE_COPY[tab].blurb(brand.name)}</Muted>

        {tab === 'app_premium' ? (
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
              {[...brand.premiumPerks, ...(catalog ? [`Every game in the ${catalog.title}`] : [])].map((f) => (
                <Row key={f} gap={6} style={{ alignItems: 'flex-start' }}>
                  <Ionicons name="checkmark-circle" size={16} color={c.success} />
                  <Body style={{ flex: 1 }}>{f}</Body>
                </Row>
              ))}
            </View>
          </View>
        ) : tab === 'all_access' ? (
          <Stack gap={8}>
            {ALL_ACCESS_PERKS.map((p) => (
              <Row key={p} gap={10} style={{ alignItems: 'flex-start' }}>
                <Ionicons name="checkmark-circle" size={20} color={c.success} />
                <Body style={{ flex: 1 }}>{p}</Body>
              </Row>
            ))}
          </Stack>
        ) : null}

        {tab !== 'all_access' ? gamesCompare : null}
        {crossApp}

        {mode === 'unavailable' ? null : signInPanel ? (
          signInPanel
        ) : !check.ok ? (
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
            {tab === 'all_access' && passStep ? (
              <View style={{ gap: 4, padding: 12, borderRadius: radius, backgroundColor: c.surfaceAlt }} testID="paywall-allaccess-parts">
                <Strong>{`${passStep.priceString} once, today`}</Strong>
                <Muted>Every Arcade game in every Kaotic Chainz app, yours forever. Paid once, never again.</Muted>
                <Strong>Then the subscription</Strong>
                <Muted>Premium in every app, for as long as you subscribe. Choose yearly or monthly:</Muted>
              </View>
            ) : null}
            {tab !== 'game' ? periodPicker : null}
            {check.note ? <Muted>{check.note}</Muted> : null}
            {error ? (
              <Note tone="warning">
                <Text testID="paywall-error">{error}</Text>
              </Note>
            ) : null}
            <Button
              title={`${tab === 'all_access' ? allAccessLabel(steps) : buyLabel(selected, brand.name, game?.name)}${mode === 'test' ? ' (test)' : ''}`}
              loading={busy}
              disabled={busy}
              testID="paywall-buy"
              onPress={buy}
            />
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
          {tab === 'game'
            ? `A one-off payment charged to your ${store}. It never renews, and the game stays yours.`
            : `${tab === 'all_access' && passStep ? `The ${passStep.priceString} is a one-off payment and never renews; the store asks you to confirm it first, then the subscription. ` : ''}Subscriptions are charged to your ${store} and renew automatically at the price shown unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in your ${store} subscription settings. Cancelling keeps all your data and any games you bought.`}
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
