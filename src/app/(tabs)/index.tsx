import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { PaywallSheet } from '@/kit/Paywall';
import { usePremium } from '@/kit/premium';
import { Button, Card, EmptyState, H1, Muted, Row, Screen, Section, Stack, Strong } from '@/kit/ui';
import { headline } from '@/domain/clarity';
import { FREE_PEOPLE } from '@/brand';
import { patternOf, usePeople } from '@/state/people';

export default function People() {
  const people = usePeople((s) => s.people);
  const { isPremium } = usePremium();
  const [paywall, setPaywall] = useState(false);
  const active = people.filter((p) => !p.ended);
  const ended = people.filter((p) => p.ended);
  const add = () => (!isPremium && active.length >= FREE_PEOPLE ? setPaywall(true) : router.push('/person/new'));

  return (
    <Screen testID="ranking">
      <Stack gap={2}>
        <H1>WorthIt?</H1>
        <Muted>Get out of your head. Look at the pattern.</Muted>
      </Stack>
      {active.length === 0 ? (
        <EmptyState icon="search-outline" title="Who's on your mind?" body="Add a nickname (never a real name) and do a 20-second check-in after you next see them." action={<Button title="Add someone" icon="add" onPress={add} testID="add-person" />} />
      ) : (
        <>
          <Stack gap={10}>
            {active.map((p) => {
              const h = headline(patternOf(p), p.nickname);
              return (
                <Card key={p.id} onPress={() => router.push(`/person/${p.id}`)} testID={`person-${p.nickname}`} accessibilityLabel={`${p.nickname}. ${h.text}`}>
                  <Row gap={12}>
                    <Text style={{ fontSize: 30 }}>{p.emoji}</Text>
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Strong>{p.nickname}</Strong>
                      <Muted numberOfLines={2} testID={`read-${p.nickname}`}>{h.text}</Muted>
                    </Stack>
                    <Text style={{ fontSize: 26 }}>{h.emoji}</Text>
                  </Row>
                </Card>
              );
            })}
          </Stack>
          <Button title="Add someone" icon="add" variant="secondary" onPress={add} testID="add-person" />
        </>
      )}
      {ended.length ? (
        <Section title="Ended">
          {ended.map((p) => (
            <Card key={p.id} onPress={() => router.push(`/person/${p.id}`)}>
              <Row gap={10}>
                <Text style={{ fontSize: 22, opacity: 0.6 }}>{p.emoji}</Text>
                <Muted>{`${p.nickname} · ${p.ended?.lesson ? `"${p.ended.lesson}"` : 'NEXT!'}`}</Muted>
              </Row>
            </Card>
          ))}
        </Section>
      ) : null}
      <Muted center>Private to this phone. WorthIt? reflects patterns and your feelings. It never scores a person.</Muted>
      <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} reason={`Free WorthIt? follows ${FREE_PEOPLE} people at a time. Premium has no limit.`} />
    </Screen>
  );
}
