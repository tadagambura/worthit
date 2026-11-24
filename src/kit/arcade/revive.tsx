// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The revive prompt, shown when a round ends on a mistake. One revive per round. The price is on
// the button before anyone taps it, and reviving never makes the game easier or harder. Ending
// the round is always one tap and costs nothing: no countdown pressure, no guilt.
import { Text, View } from 'react-native';
import { useTheme } from '../theme';
import { Body, Button, Card, Muted, Stack, Strong } from '../ui';
import { GEMS, type ReviveOptions } from './gems';

export function RevivePrompt({
  options,
  gems,
  busy,
  onFree,
  onGems,
  onAd,
  onEnd,
}: {
  options: ReviveOptions;
  gems: number;
  busy?: boolean;
  onFree: () => void;
  onGems: () => void;
  onAd: () => void;
  onEnd: () => void;
}) {
  const { c } = useTheme();
  const any = options.free || options.gems || options.ad;
  return (
    <Card testID="revive">
      <Stack gap={10}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 40 }}>💥</Text>
          <Strong center>{any ? 'Oops! Keep going?' : 'Round over'}</Strong>
          <Muted center>{`You have ${gems} 💎`}</Muted>
        </View>
        {options.free ? <Button title="Revive (free with your subscription)" icon="heart" onPress={onFree} loading={busy} testID="revive-free" /> : null}
        {options.gems ? <Button title={`Revive for ${GEMS.reviveCost} 💎`} icon="diamond-outline" onPress={onGems} loading={busy} testID="revive-gems" /> : null}
        {options.ad ? <Button title="Watch a short ad to revive" variant="secondary" icon="play-circle-outline" onPress={onAd} loading={busy} testID="revive-ad" /> : null}
        {!options.free && !options.gems && any ? <Body style={{ color: c.textMuted, textAlign: 'center' }}>{`Revives cost ${GEMS.reviveCost} 💎.`}</Body> : null}
        <Button title="End round" variant="ghost" onPress={onEnd} testID="revive-end" />
      </Stack>
    </Card>
  );
}
