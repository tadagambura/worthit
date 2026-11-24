// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The game shell every KC Arcade game runs inside: how to play → 3-2-1 → a short timed round
// → results (score, best, what it earned, what you learned). Mechanics only report points.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useAdBreak, useRewardedAd } from '../ads';
import { track } from '../analytics';
import { success, tap } from '../haptics';
import { useTheme } from '../theme';
import { Body, Button, Card, H1, H2, Muted, ProgressBar, Row, Stack, Strong } from '../ui';
import { hashString } from './engine';
import { MECHANICS, UNTIMED } from './mechanics';
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
  const [doubled, setDoubled] = useState(false);
  const [busy, setBusy] = useState(false);
  const adBreak = useAdBreak();
  const double = useRewardedAd('arcade_double');
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
    setDoubled(false);
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
    if (phase !== 'play' || !timed) return;
    if (left <= 0) {
      end();
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left, timed, end]);

  const addScore = useCallback((n: number) => {
    scoreRef.current = Math.max(0, scoreRef.current + n);
    setScore(scoreRef.current);
    if (n > 0) tap();
  }, []);
  const learn = useCallback((s: string) => setLearned((l) => (l.includes(s) || l.length > 6 ? l : [...l, s])), []);

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
        {result.earned > 0 && !doubled && double.ready ? (
          <Button
            title={`Double it: +${result.earned} ${catalog.currency.emoji} for a short ad`}
            icon="play-circle-outline"
            variant="secondary"
            loading={busy}
            testID="game-double"
            accessibilityHint="Optional. Plays a short video ad, then doubles what this round earned."
            onPress={async () => {
              setBusy(true);
              const r = await double.show();
              if (r.earned) {
                useWallet.getState().bonus(result.earned);
                setDoubled(true);
              }
              setBusy(false);
            }}
          />
        ) : null}
        {doubled ? <Strong center testID="game-doubled">{`Doubled! +${result.earned} more ${catalog.currency.emoji}`}</Strong> : null}
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
      <Mech key={round} pack={pack as never} seed={hashString(`${game.id}:${round}:${Date.now() >> 16}`)} addScore={addScore} learn={learn} end={end} />
      <Button title="End round" variant="ghost" small onPress={end} testID="game-end" />
    </Stack>
  );
}
