// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The game shell every KC Arcade game runs inside: how to play → 3-2-1 → a short timed round
// → results (score, best, what it earned, what you learned). Mechanics only report points.
// Ads only ever pay gems; the one thing an ad can give directly is a revive (owner, 24 Nov).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useAdBreak, useRewardedAd } from '../ads';
import { track } from '../analytics';
import { success, tap } from '../haptics';
import { useTheme } from '../theme';
import { Body, Button, Card, H1, H2, Muted, ProgressBar, Row, Stack, Strong } from '../ui';
import { usePremium } from '../premium';
import { hashString } from './engine';
import { claimsLeft, gemsStore, GEMS, reviveOptions } from './gems';
import { MECHANICS, UNTIMED } from './mechanics';
import { RevivePrompt } from './revive';
import type { ArcadeCatalog, GameMeta, Pack } from './types';
import { walletStore } from './wallet';

type Phase = 'ready' | 'countdown' | 'play' | 'done';

export function GameShell({ catalog, game, pack, daily, onExit }: { catalog: ArcadeCatalog; game: GameMeta; pack: Pack; daily: boolean; onExit: () => void }) {
  const { c, font } = useTheme();
  const useWallet = walletStore(catalog.app);
  const best = useWallet((s) => s.best[game.id]);
  const [phase, setPhase] = useState<Phase>('ready');
  const [count, setCount] = useState(3);
  const [left, setLeft] = useState(game.seconds);
  const [score, setScore] = useState(0);
  const [learned, setLearned] = useState<string[]>([]);
  const [result, setResult] = useState<{ earned: number; best: boolean } | null>(null);
  const [round, setRound] = useState(0);
  const [gemsClaimed, setGemsClaimed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reviving, setReviving] = useState<(() => void) | null>(null);
  const [revivesUsed, setRevivesUsed] = useState(0);
  const adBreak = useAdBreak();
  const gemAd = useRewardedAd('arcade_double');
  const reviveAd = useRewardedAd('arcade_revive');
  const { isPremium } = usePremium();
  const useGems = gemsStore(catalog.app);
  const gems = useGems((s) => s.gems);
  const gemClaimsLeft = useGems((s) => claimsLeft(s));
  const scoreRef = useRef(0);
  const ended = useRef(false);
  const timed = !UNTIMED.has(game.mechanic);
  const Mech = MECHANICS[game.mechanic];

  const end = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    const r = useWallet.getState().finish(game.id, scoreRef.current, daily);
    setResult(r);
    setPhase('done');
    success();
    track('game_played', { game: game.id, score: scoreRef.current, earned: r.earned, daily });
  }, [useWallet, game.id, daily]);

  const start = () => {
    ended.current = false;
    scoreRef.current = 0;
    setScore(0);
    setLearned([]);
    setLeft(game.seconds);
    setResult(null);
    setGemsClaimed(0);
    setReviving(null);
    setRevivesUsed(0);
    setCount(3);
    setRound((n) => n + 1);
    setPhase('countdown');
  };

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count <= 0) {
      setPhase('play');
      return;
    }
    const t = setTimeout(() => setCount((n) => n - 1), 650);
    return () => clearTimeout(t);
  }, [phase, count]);

  useEffect(() => {
    if (phase !== 'play' || !timed || reviving) return;
    if (left <= 0) {
      end();
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left, timed, end, reviving]);

  const addScore = useCallback((n: number) => {
    scoreRef.current = Math.max(0, scoreRef.current + n);
    setScore(scoreRef.current);
    if (n > 0) tap();
  }, []);
  const learn = useCallback((s: string) => setLearned((l) => (l.includes(s) || l.length > 6 ? l : [...l, s])), []);
  const reviveOpts = reviveOptions({ gems, premium: isPremium, adReady: reviveAd.ready, revivesUsed });
  // A game that ends on a mistake asks here first. No revive available: the round just ends.
  const fail = useCallback(
    (resume: () => void) => {
      const o = reviveOptions({ gems: useGems.getState().gems, premium: isPremium, adReady: reviveAd.ready, revivesUsed });
      if (!o.free && !o.gems && !o.ad) return end();
      setReviving(() => resume);
    },
    [useGems, isPremium, reviveAd.ready, revivesUsed, end],
  );
  const revive = (how: 'free' | 'gems' | 'ad') => {
    const resume = reviving;
    if (!resume) return;
    setRevivesUsed((n) => n + 1);
    setReviving(null);
    track('core_action_completed', { action: 'revive', via: how, game: game.id });
    resume();
  };

  if (phase === 'ready') {
    return (
      <Stack gap={14}>
        <Text style={{ fontSize: 56, textAlign: 'center' }}>{game.emoji}</Text>
        <H1 center>{game.name}</H1>
        {daily ? <Strong center>{`Daily challenge: double ${catalog.currency.name.toLowerCase()} on your first round today`}</Strong> : null}
        <Card>
          <Strong>How to play</Strong>
          <Body>{game.how}</Body>
          <Strong>What it teaches</Strong>
          <Body>{game.teaches}</Body>
          {timed ? <Muted>{`${game.seconds}-second rounds. No lives, nothing to lose.`}</Muted> : <Muted>Take your time. No timer, nothing to lose.</Muted>}
          {best != null ? <Muted>{`Your best: ${best}`}</Muted> : null}
        </Card>
        <Button title="Play" icon="play" onPress={start} testID="game-start" />
        <Button title="Back to the arcade" variant="ghost" onPress={onExit} />
      </Stack>
    );
  }

  if (phase === 'countdown') {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 320 }} accessibilityLiveRegion="assertive">
        <Text style={{ fontFamily: font.display, fontSize: 96, color: c.primary }}>{count > 0 ? count : 'Go!'}</Text>
      </View>
    );
  }

  if (phase === 'done' && result) {
    return (
      <Stack gap={14} >
        <Text style={{ fontSize: 56, textAlign: 'center' }}>{result.best ? '🏆' : '🎉'}</Text>
        <H1 center testID="game-final">{`${score} points`}</H1>
        {result.best ? <Strong center>New personal best!</Strong> : best != null ? <Muted center>{`Best: ${best}`}</Muted> : null}
        <Card tone="accent">
          <Strong testID="game-earned">{result.earned > 0 ? `+${result.earned} ${catalog.currency.emoji} ${result.earned === 1 ? catalog.currency.one : catalog.currency.name.toLowerCase()}` : `You've earned today's ${catalog.currency.name.toLowerCase()}. Play just for fun!`}</Strong>
          <Muted>{`Coming soon: swap your ${catalog.currency.name.toLowerCase()} for ${catalog.unlocks}.`}</Muted>
        </Card>
        {learned.length ? (
          <Card>
            <Strong>Worth remembering</Strong>
            {learned.map((l) => (
              <Body key={l}>{`• ${l}`}</Body>
            ))}
          </Card>
        ) : null}
        {gemClaimsLeft > 0 && gemsClaimed === 0 && (isPremium || gemAd.ready) ? (
          <Button
            title={isPremium ? `Claim +${GEMS.perReward} 💎 (subscriber bonus)` : `Watch a short ad: +${GEMS.perReward} 💎`}
            icon={isPremium ? 'diamond-outline' : 'play-circle-outline'}
            variant="secondary"
            loading={busy}
            testID="game-gems"
            accessibilityHint={isPremium ? 'Adds gems. No ad.' : 'Optional. Plays a short video ad, then adds gems.'}
            onPress={async () => {
              setBusy(true);
              const ok = isPremium || (await gemAd.show()).earned;
              if (ok) setGemsClaimed(useGems.getState().claim());
              setBusy(false);
            }}
          />
        ) : null}
        {gemsClaimed ? <Strong center testID="game-gems-claimed">{`+${gemsClaimed} 💎 added. You have ${gems} 💎.`}</Strong> : null}
        <Button
          title="Play again"
          icon="refresh"
          disabled={busy}
          testID="game-again"
          onPress={async () => {
            setBusy(true);
            // A finished round is the natural break for an interstitial (every 2nd, frequency-capped).
            await adBreak('arcade_break');
            setBusy(false);
            start();
          }}
        />
        <Button
          title="Back to the arcade"
          variant="secondary"
          disabled={busy}
          testID="game-exit"
          onPress={async () => {
            setBusy(true);
            await adBreak('arcade_break');
            setBusy(false);
            onExit();
          }}
        />
      </Stack>
    );
  }

  return (
    <Stack gap={10}>
      <Row style={{ justifyContent: 'space-between' }}>
        <H2 testID="game-score">{`${score}`}</H2>
        {timed ? <Strong testID="game-timer">{`${left}s`}</Strong> : null}
      </Row>
      {timed ? <ProgressBar value={left / game.seconds} label={`${left} seconds left`} height={8} /> : null}
      {reviving ? (
        <RevivePrompt
          options={reviveOpts}
          gems={gems}
          busy={busy}
          onFree={() => revive('free')}
          onGems={() => {
            if (useGems.getState().spend(GEMS.reviveCost)) revive('gems');
          }}
          onAd={async () => {
            setBusy(true);
            const r = await reviveAd.show();
            setBusy(false);
            if (r.earned) revive('ad');
          }}
          onEnd={() => {
            setReviving(null);
            end();
          }}
        />
      ) : null}
      <View pointerEvents={reviving ? 'none' : 'auto'} style={{ opacity: reviving ? 0.35 : 1 }}>
        <Mech key={round} pack={pack as never} seed={hashString(`${game.id}:${round}:${Date.now() >> 16}`)} addScore={addScore} learn={learn} end={end} fail={fail} />
      </View>
      {reviving ? null : <Button title="End round" variant="ghost" small onPress={end} testID="game-end" />}
    </Stack>
  );
}
