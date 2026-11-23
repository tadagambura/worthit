import { KitSettings } from '@/kit/Settings';
import { Card, ListRow, Section } from '@/kit/ui';

export default function Settings() {
  return (
    <KitSettings reminder={{ title: 'WorthIt?', body: "How's it going? A 20-second check-in keeps your scores honest.", explain: 'A weekly nudge to check in. Never more.', weekly: true }}>
      <Section title="Privacy">
        <Card>
          <ListRow icon="lock-closed-outline" title="Everything stays on this phone" subtitle="Nicknames, notes and check-ins are never uploaded. There's no account and no public profile." />
          <ListRow icon="people-outline" title="Fair to everyone" subtitle="WorthIt? rates behaviours and how you feel, never someone's looks or worth as a person." />
        </Card>
      </Section>
    </KitSettings>
  );
}
