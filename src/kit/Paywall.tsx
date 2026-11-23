// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
// The paywall: yearly plan first, honest renewal terms, restore, no fake urgency.
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { track } from './analytics';
import { useFeedback } from './feedback';
import { usePremium } from './premium';
import { useTheme, type Plan } from './theme';
import { Body, Button, Muted, Note, Row, Sheet, Stack, Strong } from './ui';

export function PaywallSheet({ visible, onClose, reason }: { visible: boolean; onClose: () => void; reason?: string }) {
  const { brand, c, radius } = useTheme();
  const { mode, purchase, restore, isPremium } = usePremium();
  const { toast } = useFeedback();
  const [plan, setPlan] = useState<Plan['id']>(brand.plans[0]?.id ?? 'yearly');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) track('paywall_viewed', { reason: reason ?? 'settings', mode });
  }, [visible, reason, mode]);

  const store = Platform.OS === 'ios' ? 'Apple ID' : Platform.OS === 'android' ? 'Google Play account' : 'app store account';

  return (
    <Sheet visible={visible} onClose={onClose} title={`${brand.name} Premium`} testID="paywall">
      <Stack gap={14}>
        {mode === 'test' ? <Note tone="warning">Test mode: no real purchase. This build isn't connected to the App Store or Google Play yet.</Note> : null}
        {mode === 'unavailable' ? <Note>Premium is coming soon. Everything in the free version keeps working.</Note> : null}
        {isPremium ? <Note>You've got Premium. Thank you for supporting a small independent studio.</Note> : null}
        {reason ? <Body>{reason}</Body> : null}
        <Stack gap={8}>
          {brand.premiumPerks.map((p) => (
            <Row key={p} gap={10} style={{ alignItems: 'flex-start' }}>
              <Ionicons name="checkmark-circle" size={20} color={c.success} />
              <Body style={{ flex: 1 }}>{p}</Body>
            </Row>
          ))}
        </Stack>
        {mode !== 'unavailable' && !isPremium ? (
          <>
            <View accessibilityRole="radiogroup" accessibilityLabel="Choose a plan" style={{ gap: 8 }}>
              {brand.plans.map((p, i) => {
                const on = p.id === plan;
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    aria-checked={on}
                    accessibilityLabel={`${p.label}, ${p.price}${p.note ? `, ${p.note}` : ''}`}
                    onPress={() => setPlan(p.id)}
                    testID={`plan-${p.id}`}
                    style={{ borderWidth: 2, borderColor: on ? c.primary : c.border, borderRadius: radius, padding: 14, backgroundColor: c.surface }}
                  >
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Strong>{p.label}</Strong>
                      <Strong>{p.price}</Strong>
                    </Row>
                    {p.note || i === 0 ? <Muted>{p.note ?? 'Best value'}</Muted> : null}
                  </Pressable>
                );
              })}
            </View>
            <Button
              title={mode === 'test' ? 'Start Premium (test)' : 'Continue'}
              loading={busy}
              testID="paywall-buy"
              onPress={async () => {
                setBusy(true);
                const r = await purchase(plan);
                setBusy(false);
                toast(r.message);
                if (r.ok) onClose();
              }}
            />
          </>
        ) : null}
        <Button
          title="Restore purchases"
          variant="ghost"
          testID="paywall-restore"
          onPress={async () => {
            const r = await restore();
            toast(r.message);
          }}
        />
        <Muted>
          {`Subscriptions are charged to your ${store} and renew automatically unless cancelled at least 24 hours before the end of the current period. You can manage or cancel anytime in your account settings. Lifetime is a one-off payment.`}
        </Muted>
        <Row gap={16} style={{ justifyContent: 'center' }}>
          <Text accessibilityRole="link" style={{ color: c.primary }} onPress={() => WebBrowser.openBrowserAsync(brand.termsUrl)}>
            Terms
          </Text>
          <Text accessibilityRole="link" style={{ color: c.primary }} onPress={() => WebBrowser.openBrowserAsync(brand.privacyUrl)}>
            Privacy
          </Text>
        </Row>
      </Stack>
    </Sheet>
  );
}
