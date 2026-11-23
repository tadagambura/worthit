// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
// The shared Settings screen: premium, one daily reminder, your data, about.
// Each app passes its own sections in `children` (shown first).
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import { debugEvents, analyticsMode } from './analytics';
import { deleteAllData, exportData } from './data';
import { useFeedback } from './feedback';
import { PaywallSheet } from './Paywall';
import { prefsStore } from './prefs';
import { usePremium } from './premium';
import { disableReminder, enableDailyReminder, reminderError, remindersSupported } from './reminders';
import { TEST_MODE } from './Root';
import { useTheme } from './theme';
import { Body, Card, Chip, Divider, H1, ListRow, Muted, Row, Screen, Section, Toggle } from './ui';

const HOURS = [7, 8, 9, 12, 17, 19, 21];
const WEEKDAYS = [
  { n: 2, label: 'Mon' },
  { n: 3, label: 'Tue' },
  { n: 4, label: 'Wed' },
  { n: 5, label: 'Thu' },
  { n: 6, label: 'Fri' },
  { n: 7, label: 'Sat' },
  { n: 1, label: 'Sun' },
];
const label = (h: number) => (h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`);

export function KitSettings({ children, reminder, onDataDeleted }: { children?: ReactNode; reminder?: { title: string; body: string; explain: string; weekly?: boolean }; onDataDeleted?: () => void }) {
  const { brand } = useTheme();
  const { isPremium, mode, restore, cancelTest } = usePremium();
  const { toast, confirm } = useFeedback();
  const prefs = prefsStore(brand.slug)();
  const [paywall, setPaywall] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const reminderId = `${brand.slug}-daily`;

  const weekday = reminder?.weekly ? (prefs.reminder.weekday ?? 6) : undefined;
  const setReminder = async (on: boolean, hour = prefs.reminder.hour, day = weekday) => {
    if (!reminder) return;
    if (!on) {
      await disableReminder(reminderId);
      prefs.setReminder({ on: false });
      return;
    }
    const r = await enableDailyReminder({ id: reminderId, hour, minute: 0, title: reminder.title, body: reminder.body, weekday: day });
    const err = reminderError(r);
    if (err) {
      toast(err);
      prefs.setReminder({ on: false });
      return;
    }
    prefs.setReminder({ on: true, hour, weekday: day });
    const dayName = WEEKDAYS.find((w) => w.n === day)?.label;
    toast(day != null ? `Reminder set for ${dayName}s at ${label(hour)}.` : `Reminder set for ${label(hour)} each day.`);
  };

  return (
    <Screen testID="settings">
      <H1>Settings</H1>
      {children}

      <Section title="Premium">
        <Card>
          <ListRow
            icon="star-outline"
            title={isPremium ? 'Premium is on' : `${brand.name} Premium`}
            subtitle={isPremium ? (mode === 'test' ? 'Test mode' : 'Thank you!') : brand.premiumPerks[0]}
            onPress={() => setPaywall(true)}
            testID="settings-premium"
          />
          <Divider />
          <ListRow
            icon="refresh"
            title="Restore purchases"
            onPress={async () => {
              const r = await restore();
              toast(r.message);
            }}
          />
        </Card>
      </Section>

      {reminder ? (
        <Section title="Reminder">
          <Card>
            <Toggle label={reminder.weekly ? 'Weekly reminder' : 'Daily reminder'} hint={reminder.explain} value={prefs.reminder.on} onChange={(v) => setReminder(v)} testID="settings-reminder" />
            {prefs.reminder.on && reminder.weekly ? (
              <Row wrap gap={8}>
                {WEEKDAYS.map((w) => (
                  <Chip key={w.n} label={w.label} selected={weekday === w.n} onPress={() => setReminder(true, prefs.reminder.hour, w.n)} />
                ))}
              </Row>
            ) : null}
            {prefs.reminder.on ? (
              <Row wrap gap={8}>
                {HOURS.map((h) => (
                  <Chip key={h} label={label(h)} selected={prefs.reminder.hour === h} onPress={() => setReminder(true, h)} />
                ))}
              </Row>
            ) : null}
            {!remindersSupported ? <Muted>Reminders work in the phone app.</Muted> : null}
          </Card>
        </Section>
      ) : null}

      <Section title="Your data">
        <Card>
          <Muted>Everything is stored on this device. Nothing is uploaded unless you turn on a cloud feature.</Muted>
          <ListRow
            icon="download-outline"
            title="Export my data"
            subtitle="A JSON file you can keep or open anywhere"
            testID="settings-export"
            onPress={async () => {
              const r = await exportData(brand.slug, version);
              if (!r.ok) toast(r.message);
            }}
          />
          <Divider />
          <ListRow
            icon="trash-outline"
            title="Delete all my data"
            danger
            testID="settings-delete"
            onPress={async () => {
              const ok = await confirm({
                title: 'Delete everything?',
                body: `This removes all your ${brand.name} data from this device. It can't be undone. Export first if you want a copy.`,
                confirmLabel: 'Delete everything',
                destructive: true,
              });
              if (!ok) return;
              await disableReminder(reminderId);
              deleteAllData(brand.slug);
              onDataDeleted?.();
              toast('All your data has been deleted.');
            }}
          />
        </Card>
      </Section>

      <Section title="About">
        <Card>
          <ListRow icon="shield-checkmark-outline" title="Privacy policy" onPress={() => WebBrowser.openBrowserAsync(brand.privacyUrl)} />
          <Divider />
          <ListRow icon="document-text-outline" title="Terms" onPress={() => WebBrowser.openBrowserAsync(brand.termsUrl)} />
          <Divider />
          <ListRow icon="chatbubble-ellipses-outline" title="Ideas and feedback" subtitle="Vote on what we build next" onPress={() => WebBrowser.openBrowserAsync(`https://kaoticchainz.com/feedback?app=${brand.slug}`)} />
          <Divider />
          <ListRow icon="mail-outline" title="Contact us" subtitle={brand.supportEmail} onPress={() => Linking.openURL(`mailto:${brand.supportEmail}?subject=${encodeURIComponent(brand.name)}`)} />
        </Card>
        <Muted center>{`${brand.name} ${version}\nA Kaotic Chainz Production`}</Muted>
      </Section>

      {TEST_MODE ? (
        <Section title="Developer (test builds only)">
          <Card>
            <ListRow icon="analytics-outline" title={`Analytics: ${analyticsMode()} mode`} subtitle="Show the last events" onPress={() => setShowDebug((v) => !v)} />
            {showDebug ? debugEvents().slice(0, 15).map((e, i) => <Muted key={i}>{`${e.event} ${JSON.stringify(e.props)}`}</Muted>) : null}
            {cancelTest && isPremium ? (
              <>
                <Divider />
                <ListRow icon="close-circle-outline" title="Turn off test Premium" onPress={cancelTest} />
              </>
            ) : null}
          </Card>
        </Section>
      ) : null}

      <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} />
      <Body> </Body>
    </Screen>
  );
}
