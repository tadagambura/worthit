// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// KC Arcade screens. Each app registers its catalog once (src/arcade/index.ts, generated) and
// adds two one-line routes: app/arcade/index.tsx and app/arcade/[game].tsx.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useFeedback } from '../feedback';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRewardedAd } from '../ads';
import { todayKey } from '../dates';
import { lineForTier, type Tier } from '../entitlements';
import { gameKey } from '../plans';
import { PaywallSheet } from '../Paywall';
import { usePremium } from '../premium';
import { useTheme } from '../theme';
import { Body, Button, Card, H1, Muted, Note, Row, Screen, Section, Stack, Strong } from '../ui';
import { DownloadsCard } from './downloads';
import { dailyGame } from './engine';
import { claimsLeft, gemsStore, GEMS } from './gems';
import { loadPack, packState } from './packs';
import { GameShell } from './Shell';
import { arcade } from './registry';
import type { GameMeta, Pack } from './types';
import { walletStore } from './wallet';

// The registry lives in ./registry (no UI imports) so billing can read the game list too.
export { arcade, registerArcade } from './registry';

const TIER_BADGE: Record<Tier, string> = {
  free: 'Free',
  premium: 'Premium',
  all_access: 'All Access',
  arcade: 'KC Arcade',
};

function kb(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${Math.ceil(bytes / 1024)} KB`;
}

export function ArcadeHome() {
  const { c, radius } = useTheme();
  const { canPlay, products, loadProducts, isPremium } = usePremium();
  const reg = arcade();
  const useWallet = walletStore(reg?.catalog.app ?? 'none');
  const wallet = useWallet();
  const [paywall, setPaywall] = useState<GameMeta | null>(null);
  const bonus = useRewardedAd('arcade_daily');
  const [claiming, setClaiming] = useState(false);
  // Prices for the locked badges ("£0.99"), straight from the store.
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);
  const { toast } = useFeedback();
  const useGems = gemsStore(reg?.catalog.app ?? 'none');
  const gemState = useGems();
  const freeGemsLeft = claimsLeft(gemState);
  useEffect(() => {
    // A small welcome gift the first time, so revives are discoverable.
    const n = useGems.getState().welcome();
    if (n) toast(`Welcome to the arcade! Here are ${n} 💎 to get you started.`);
  }, [useGems, toast]);
  if (!reg) return <Screen><Body>The arcade isn't set up in this app yet.</Body></Screen>;
  const { catalog, bundled } = reg;
  const daily = dailyGame(catalog, todayKey(), canPlay);
  const priceOf = (g: GameMeta) => products.items.find((p) => p.line === 'game' && p.gameId === gameKey(g.id))?.priceString;
  const dailyDone = wallet.dailyDone === todayKey();

  const open = (g: GameMeta, isDaily = false) => {
    if (!canPlay(g)) return setPaywall(g);
    if (g.mechanic === 'route' && g.route) return router.push(g.route as never);
    router.push(`/arcade/${g.id}${isDaily ? '?daily=1' : ''}` as never);
  };

  return (
    <Screen testID="arcade">
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Row gap={12}>
          <Strong testID="arcade-gems">{`${gemState.gems} 💎`}</Strong>
          <Strong testID="arcade-balance">{`${wallet.balance} ${catalog.currency.emoji}`}</Strong>
        </Row>
      </Row>
      <H1>{`${catalog.emoji} ${catalog.title}`}</H1>
      <Muted>{`Quick games, 30 to 60 seconds each. Win ${catalog.currency.name.toLowerCase()} as you play; soon you can swap them for ${catalog.unlocks}.`}</Muted>

      {daily ? (
        <Card tone="primary" onPress={() => open(daily, true)} testID="arcade-daily" accessibilityLabel={`Daily challenge: ${daily.name}`}>
          <Text style={{ color: c.primaryText, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', fontSize: 12 }}>{dailyDone ? 'Daily challenge: done today' : 'Daily challenge: double rewards'}</Text>
          <Text style={{ color: c.primaryText, fontSize: 22, fontWeight: '800' }}>{`${daily.emoji} ${daily.name}`}</Text>
        </Card>
      ) : null}

      {freeGemsLeft > 0 && (isPremium || bonus.ready) ? (
        <Card
          testID="arcade-bonus"
          accessibilityLabel={isPremium ? `Claim ${GEMS.perReward} gems` : `Free gems: ${GEMS.perReward} gems for watching a short ad. Optional.`}
          onPress={async () => {
            if (claiming) return;
            setClaiming(true);
            const ok = isPremium || (await bonus.show()).earned;
            if (ok && useGems.getState().claim()) toast(`+${GEMS.perReward} 💎`);
            setClaiming(false);
          }}
        >
          <Row gap={12}>
            <Text style={{ fontSize: 28 }}>💎</Text>
            <View style={{ flex: 1 }}>
              <Strong>{`Free gems: +${GEMS.perReward} 💎`}</Strong>
              <Muted>{isPremium ? `Subscriber bonus, no ads. ${freeGemsLeft} left today.` : `Watch a short ad to claim. Optional. ${freeGemsLeft} left today.`}</Muted>
            </View>
          </Row>
        </Card>
      ) : null}

      <Card testID="arcade-swap">
        <Strong>{`Swap gems for ${catalog.currency.name.toLowerCase()}`}</Strong>
        <Muted>{`1 💎 = ${GEMS.exchangeRate} ${catalog.currency.emoji}. Gems also buy revives (${GEMS.reviveCost} 💎).`}</Muted>
        <Row gap={8}>
          {[1, 5].map((n) => (
            <Button
              key={n}
              small
              variant="secondary"
              title={`${n} 💎 → ${n * GEMS.exchangeRate} ${catalog.currency.emoji}`}
              disabled={gemState.gems < n}
              testID={`swap-${n}`}
              onPress={() => {
                if (useGems.getState().exchange(n)) toast(`Swapped ${n} 💎 for ${n * GEMS.exchangeRate} ${catalog.currency.emoji}`);
              }}
            />
          ))}
        </Row>
      </Card>

      <Section title="Games">
        <Stack gap={10}>
          {catalog.games.map((g) => {
            const locked = !canPlay(g);
            const badge = g.tier === 'arcade' ? (priceOf(g) ?? 'Locked') : TIER_BADGE[g.tier];
            const state = g.mechanic === 'route' ? 'bundled' : packState(catalog.app, g, bundled);
            const best = wallet.best[g.id];
            return (
              <Card key={g.id} onPress={() => open(g)} testID={`game-${g.id}`} accessibilityLabel={`${g.name}. ${g.how}${locked ? `. Locked, ${badge}` : ''}`}>
                <Row gap={12} style={{ alignItems: 'flex-start' }}>
                  <View style={{ width: 52, height: 52, borderRadius: radius, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 28 }}>{g.emoji}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Strong style={{ flex: 1 }}>{g.name}</Strong>
                      {locked ? (
                        <Row gap={4}>
                          <Ionicons name="lock-closed" size={14} color={c.textMuted} />
                          <Muted>{badge}</Muted>
                        </Row>
                      ) : g.flagship ? (
                        <Muted>★ Flagship</Muted>
                      ) : null}
                    </Row>
                    <Muted numberOfLines={2}>{g.how}</Muted>
                    <Muted>{[best != null ? `Best ${best}` : null, !locked && state === 'remote' && g.pack ? `Download ${kb(g.pack.bytes)}` : null, !locked && state === 'cached' ? 'Downloaded' : null].filter(Boolean).join(' · ')}</Muted>
                  </View>
                </Row>
              </Card>
            );
          })}
        </Stack>
      </Section>
      <DownloadsCard catalog={catalog} bundled={bundled} />
      <Muted center>{"No lives, no streaks to break, nothing to lose. Games download inside the app when you first play them."}</Muted>
      <PaywallSheet
        visible={!!paywall}
        onClose={() => setPaywall(null)}
        line={paywall?.tier === 'arcade' ? 'game' : paywall ? lineForTier(paywall.tier) : 'app_premium'}
        game={paywall?.tier === 'arcade' ? { id: paywall.id, name: paywall.name, emoji: paywall.emoji } : undefined}
        reason={paywall?.teaches}
      />
    </Screen>
  );
}

export function ArcadeGame() {
  const { c } = useTheme();
  const { canPlay } = usePremium();
  const { game: id, daily } = useLocalSearchParams<{ game: string; daily?: string }>();
  const reg = arcade();
  const game = reg?.catalog.games.find((g) => g.id === id);
  const [pack, setPack] = useState<Pack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const allowed = !!game && canPlay(game);

  const load = useCallback(() => {
    if (!reg || !game || !allowed) return;
    setError(null);
    loadPack(reg.catalog.app, game, reg.bundled).then(setPack, (e: Error) => setError(e.message));
  }, [reg, game, allowed]);

  useEffect(() => {
    load();
  }, [load, tries]);

  const exit = () => (router.canGoBack() ? router.back() : router.replace('/arcade' as never));

  if (!reg || !game) return <Screen><Body>Game not found.</Body><Button title="Back to the arcade" onPress={exit} /></Screen>;
  if (!allowed) {
    return (
      <Screen>
        <Note>{game.tier === 'arcade' ? `${game.name} is a paid game. Buy it on its own, or get every game with Premium.` : `${game.name} is part of ${TIER_BADGE[game.tier]}.`}</Note>
        <Button title="Back to the arcade" onPress={exit} />
      </Screen>
    );
  }
  return (
    <Screen testID="arcade-game">
      {error ? (
        <Stack>
          <Note tone="warning">{error}</Note>
          <Button title="Try again" onPress={() => setTries((t) => t + 1)} testID="pack-retry" />
          <Button title="Back to the arcade" variant="ghost" onPress={exit} />
        </Stack>
      ) : !pack ? (
        <Row gap={10} style={{ justifyContent: 'center', padding: 40 }}>
          <ActivityIndicator color={c.primary} />
          <Muted>{game.pack ? `Getting ${game.name} (${kb(game.pack.bytes)})…` : 'Loading…'}</Muted>
        </Row>
      ) : (
        <GameShell catalog={reg.catalog} game={game} pack={pack} daily={daily === '1'} onExit={exit} />
      )}
    </Screen>
  );
}

/** The arcade's front door, for an app's home screen. */
export function ArcadeEntry() {
  const { c } = useTheme();
  const reg = arcade();
  const useWallet = walletStore(reg?.catalog.app ?? 'none');
  const balance = useWallet((s) => s.balance);
  if (!reg) return null;
  const { catalog } = reg;
  return (
    <Card onPress={() => router.push('/arcade' as never)} testID="arcade-entry" accessibilityLabel={`${catalog.title}: ${catalog.games.length} quick games`}>
      <Row gap={12}>
        <Text style={{ fontSize: 30 }}>{catalog.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Strong>{catalog.title}</Strong>
          <Muted>{`${catalog.games.length} quick games · ${balance} ${catalog.currency.emoji}`}</Muted>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
      </Row>
    </Card>
  );
}
