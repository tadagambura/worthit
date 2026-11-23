import { CardLibrary, type CardPack } from '@/kit/cards';
import { H1, Muted, Screen } from '@/kit/ui';
import raw from '@/content/cards.json';

const pack = raw as CardPack;

export default function Learn() {
  return (
    <Screen testID="learn">
      <H1>Relationship clarity</H1>
      <Muted>Cards on dating, boundaries and red flags. Inspired by The School of Life and evidence-based sources.</Muted>
      <CardLibrary pack={pack} app="worthit" />
    </Screen>
  );
}
