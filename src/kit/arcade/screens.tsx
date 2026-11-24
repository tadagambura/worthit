// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// KC Arcade screens. Each app registers its catalog once (src/arcade/index.ts, generated) and
// adds two one-line routes: app/arcade/index.tsx and app/arcade/[game].tsx.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRewardedAd } from '../ads';
import { todayKey } from '../dates';
import { lineForTier, type Tier } from '../entitlements';
import { PaywallSheet } from '../Paywall';
import { usePremium } from '../premium';
import { useTheme } from '../theme';
import { Body, Button, Card, H1, Muted, Note, Row, Screen, Section, Stack, Strong } from '../ui';
import { dailyGame } from './engine';
import { loadPack, packState } from './packs';
import { GameShell } from './Shell';
import type { ArcadeCatalog, GameMeta, Pack } from './types';
import { DAILY_BONUS, walletStore } from './wallet';

type Registered = { catalog: ArcadeCatalog; bundled: Record<string, Pack> };
let registered: Registered | null = null;

export function registerArcade(catalog: ArcadeCatalog, bundled: Record<string, Pack>) {
  registered = { catalog, bundled };
}

export function arcade(): Registered | null {
  return registered;
}

const TIER_BADGE: Record<Tier, string> = {
  free: 'Free',
  premium: 'Premium',
  all_access: 'All Access',
  arcade: 'KC Arcade',
  arcade_subscription: 'All Access exclusive',
};

function kb(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${Math.ceil(bytes / 1024)} KB`;
}

export function ArcadeHome() {
  const { c, radius } = useTheme();
  const { can } = usePremium();
  const reg = registered;
  const useWallet = walletStore(reg?.catalog.app ?? 'none');
  const wallet = useWallet();
  const [paywall, setPaywall] = useState<Tier | null>(null);
  const bonus = useRewardedAd('arcade_daily');
  const [claiming, setClaiming] = useState(false);
  if (!reg) return <Screen><Body>The arcade isn't set up in this app yet.</Body></Screen>;
  const { catalog, bundled } = reg;
  const daily = dailyGame(catalog, todayKey(), (g) => can(g.tier));
  const dailyDone = wallet.dailyDone === todayKey();

  const open = (g: GameMeta, isDaily = false) => {
    if (!can(g.tier)) return setPaywall(g.tier);
    if (g.mechanic === 'route' && g.route) return router.push(g.route as never);
    router.push(`/arcade/${g.id}${isDaily ? '?daily=1' : ''}` as never);
  };

  return (
    <Screen testID="arcade">
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Strong testID="arcade-balance">{`${wallet.balance} ${catalog.currency.emoji}`}</Strong>
      </Row>
      <H1>{`${catalog.emoji} ${catalog.title}`}</H1>
      <Muted>{`Quick games, 30 to 60 seconds each. Win ${catalog.currency.name.toLowerCase()} as you play; soon you can swap them for ${catalog.unlocks}.`}</Muted>

      {daily ? (
        <Card tone="primary" onPress={() => open(daily, true)} testID="arcade-daily" accessibilityLabel={`Daily challenge: ${daily.name}`}>
          <Text style={{ color: c.primaryText, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', fontSize: 12 }}>{dailyDone ? 'Daily challenge: done today' : 'Daily challenge: double rewards'}</Text>
          <Text style={{ color: c.primaryText, fontSize: 22, fontWeight: '800' }}>{`${daily.emoji} ${daily.name}`}</Text>
        </Card>
      ) : null}

      {bonus.ready && wallet.bonusDay !== todayKey() ? (
        <Card
          testID="arcade-bonus"
          accessibilityLabel={`Daily bonus: ${DAILY_BONUS} ${catalog.currency.name.toLowerCase()} for watching a short ad. Optional.`}
          onPress={async () => {
            if (claiming) return;
            setClaiming(true);
            const r = await bonus.show();
            if (r.earned) useWallet.getState().claimDailyBonus(DAILY_BONUS);
            setClaiming(false);
          }}
        >
          <Row gap={12}>
            <Text style={{ fontSize: 28 }}>🎁</Text>
            <View style={{ flex: 1 }}>
              <Strong>{`Daily bonus: +${DAILY_BONUS} ${catalog.currency.emoji}`}</Strong>
              <Muted>Watch a short ad to claim it. Optional, once a day.</Muted>
            </View>
          </Row>
        </Card>
      ) : null}

      <Section title="Games">
        <Stack gap={10}>
          {catalog.games.map((g) => {
            const locked = !can(g.tier);
            const state = g.mechanic === 'route' ? 'bundled' : packState(catalog.app, g, bundled);
            const best = wallet.best[g.id];
            return (
              <Card key={g.id} onPress={() => open(g)} testID={`game-${g.id}`} accessibilityLabel={`${g.name}. ${g.how}${locked ? `. ${TIER_BADGE[g.tier]}` : ''}`}>
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
                          <Muted>{TIER_BADGE[g.tier]}</Muted>
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
      <Muted center>{"No lives, no streaks to break, nothing to lose. Games only download when you first play them."}</Muted>
      <PaywallSheet
        visible={!!paywall}
        onClose={() => setPaywall(null)}
        line={paywall ? lineForTier(paywall) : 'arcade'}
        reason={paywall === 'arcade_subscription' ? 'This one is a KC All Access exclusive.' : 'This game is part of KC Arcade: every included game in every Kaotic Chainz app, yours to keep for £14.99. All Access includes it too.'}
      />
    </Screen>
  );
}

export function ArcadeGame() {
  const { c } = useTheme();
  const { can } = usePremium();
  const { game: id, daily } = useLocalSearchParams<{ game: string; daily?: string }>();
  const reg = registered;
  const game = reg?.catalog.games.find((g) => g.id === id);
  const [pack, setPack] = useState<Pack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const allowed = !!game && can(game.tier);

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
        <Note>{`${game.name} is part of ${TIER_BADGE[game.tier]}.`}</Note>
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
  const reg = registered;
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
