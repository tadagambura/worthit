// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
// The shared Settings screen: premium, one daily reminder, your data, about.
// Each app passes its own sections in `children` (shown first).
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { arcade } from './arcade/screens';
import { debugEvents, analyticsMode } from './analytics';
import { deleteAllData, exportData } from './data';
import { useFeedback } from './feedback';
import { PaywallSheet } from './Paywall';
import { prefsStore } from './prefs';
import { usePremium } from './premium';
import { disableReminder, enableDailyReminder, reminderError, remindersSupported } from './reminders';
import { TEST_MODE } from './Root';
import { useTheme } from './theme';
import { swatch, themeIsFree, THEMES } from './themes';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Body, Card, Chip, Divider, H1, ListRow, Muted, Note, Row, Screen, Section, Toggle } from './ui';

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
  const { brand, themeId, chosenTheme, c } = useTheme();
  const { isPremium, mode, restore, access, manageSubscriptions, test } = usePremium();
  const { toast, confirm } = useFeedback();
  const usePrefs = prefsStore(brand.slug);
  const prefs = usePrefs();
  const [paywall, setPaywall] = useState<false | 'app_premium' | 'all_access' | 'arcade'>(false);
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

      <Section title="Theme">
        <Muted>{isPremium ? 'All 20 themes are yours. The app icon changes colour too.' : 'Six themes are free. Premium unlocks all 20, and the app icon changes to match.'}</Muted>
        {chosenTheme && chosenTheme !== themeId && !isPremium ? <Note>Your chosen theme comes back when Premium is on again.</Note> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Theme">
          {[...THEMES].sort((a, b) => Number(themeIsFree(b.id, brand.defaultTheme)) - Number(themeIsFree(a.id, brand.defaultTheme))).map((t) => {
            const on = themeId === t.id;
            const locked = !isPremium && !themeIsFree(t.id, brand.defaultTheme);
            return (
              <Pressable
                key={t.id}
                accessibilityRole="radio"
                aria-checked={on}
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${t.name}${t.id === brand.defaultTheme ? ' (default)' : ''}${locked ? ', Premium' : ''}`}
                onPress={() => (locked ? setPaywall('app_premium') : prefs.setTheme(t.id === brand.defaultTheme ? undefined : t.id))}
                testID={`theme-${t.id}`}
                style={{ alignItems: 'center', width: 64, gap: 4, opacity: locked ? 0.55 : 1 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: swatch(t.id), borderWidth: on ? 4 : 2, borderColor: on ? c.text : c.border, alignItems: 'center', justifyContent: 'center' }}>
                  {locked ? <Ionicons name="lock-closed" size={14} color={c.text} /> : null}
                </View>
                <Text style={{ fontSize: 11, color: c.textMuted, textAlign: 'center' }} numberOfLines={1}>
                  {t.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Premium">
        <Card>
          {access.billingIssue ? <Note tone="warning">{"Your last payment didn't go through. The store is retrying; update your payment details to keep Premium."}</Note> : null}
          {access.overlapping.length ? <Note tone="warning">You have All Access plus an app Premium still renewing. Cancel the extra one so you are not paying twice.</Note> : null}
          <ListRow
            icon="star-outline"
            title={isPremium ? (access.premiumSource === 'all_access' ? 'Premium is on (KC All Access)' : 'Premium is on') : `${brand.name} Premium`}
            subtitle={isPremium ? (mode === 'test' ? 'Test mode' : 'Thank you!') : access.expired.length ? 'Your subscription ended. Your data is all still here.' : brand.premiumPerks[0]}
            onPress={() => setPaywall('app_premium')}
            testID="settings-premium"
          />
          <Divider />
          <ListRow icon="planet-outline" title="KC All Access" subtitle={access.allAccess ? 'On: every app, every game' : 'Every Kaotic Chainz app and the whole Arcade'} onPress={() => setPaywall('all_access')} testID="settings-allaccess" />
          <Divider />
          <ListRow icon="game-controller-outline" title="KC Arcade" subtitle={access.arcadePermanent ? 'Yours forever' : access.arcade ? 'Included with All Access' : 'One payment, yours to keep'} onPress={() => setPaywall('arcade')} testID="settings-arcade" />
          {arcade() ? (
            <>
              <Divider />
              <ListRow icon="happy-outline" title={`Play the ${arcade()!.catalog.title}`} subtitle={`${arcade()!.catalog.games.length} quick games`} onPress={() => router.push('/arcade' as never)} testID="settings-play-arcade" />
            </>
          ) : null}
          <Divider />
          <ListRow
            icon="refresh"
            title="Restore purchases"
            testID="settings-restore"
            onPress={async () => {
              const r = await restore();
              toast(r.message);
            }}
          />
          {(access.appPremium || access.allAccess) && mode === 'live' ? (
            <>
              <Divider />
              <ListRow icon="card-outline" title="Manage subscription" subtitle="Change or cancel in your store account" onPress={manageSubscriptions} />
            </>
          ) : null}
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
            {test ? (
              <>
                <Divider />
                <Muted>Test store: simulate what real subscribers go through.</Muted>
                <Row wrap gap={8}>
                  <Chip label="Expire subs" onPress={() => test.expireAll()} testID="test-expire" />
                  <Chip label="Billing issue" onPress={() => test.billingIssue()} />
                  <Chip label="Cancel renewals" onPress={() => test.cancelRenewals()} />
                  <Chip label="Next: cancelled" onPress={() => test.failNext('1')} />
                  <Chip label="Next: pending" onPress={() => test.failNext('20')} />
                  <Chip label="Next: offline" onPress={() => test.failNext('10')} />
                  <Chip label="Reset purchases" onPress={() => test.reset()} testID="test-reset" />
                </Row>
              </>
            ) : null}
          </Card>
        </Section>
      ) : null}

      <PaywallSheet visible={!!paywall} onClose={() => setPaywall(false)} line={paywall || 'app_premium'} />
      <Body> </Body>
    </Screen>
  );
}
