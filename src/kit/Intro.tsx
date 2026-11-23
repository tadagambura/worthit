// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
// First-run intro: at most three short pages, always skippable, no sign-up, no permissions.
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { track } from './analytics';
import { useTheme } from './theme';
import { Body, Button, Display, Muted, Row, Screen } from './ui';

export type IntroStep = { title: string; body: string; art: ReactNode };

export function Intro({ steps, onDone, cta = 'Get started' }: { steps: IntroStep[]; onDone: () => void; cta?: string }) {
  const { c } = useTheme();
  const [i, setI] = useState(0);
  const step = steps[i];
  const last = i === steps.length - 1;
  const finish = () => {
    track('onboarding_completed', { skipped: !last, steps_seen: i + 1 });
    onDone();
  };
  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View style={{ gap: 8, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
          <Button title={last ? cta : 'Next'} onPress={() => (last ? finish() : setI(i + 1))} testID="intro-next" />
          {!last ? <Button title="Skip" variant="ghost" onPress={finish} testID="intro-skip" /> : null}
        </View>
      }
      testID="intro"
    >
      <View style={{ alignItems: 'center', paddingVertical: 24, minHeight: 220, justifyContent: 'center' }}>{step.art}</View>
      <Display center>{step.title}</Display>
      <Body center>{step.body}</Body>
      <Row gap={6} style={{ justifyContent: 'center' }}>
        {steps.map((_, j) => (
          <View key={j} style={{ width: j === i ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: j === i ? c.primary : c.border }} />
        ))}
      </Row>
      <Muted center>{`Step ${i + 1} of ${steps.length}`}</Muted>
    </Screen>
  );
}
