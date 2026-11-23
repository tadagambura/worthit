// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initAnalytics } from './analytics';
import { Billing, testClient, type TestControls } from './billing';
import { revenueCatClient, revenueCatKey } from './billing.revenuecat';
import { CelebrateProvider } from './celebrate';
import { FeedbackProvider } from './feedback';
import { PremiumProvider } from './premium';
import { ThemeProvider, useTheme, type Brand } from './theme';

/** True in development, and in internal pilot builds made with EXPO_PUBLIC_TEST_MODE=1. */
export const TEST_MODE = __DEV__ || process.env.EXPO_PUBLIC_TEST_MODE === '1';

function Bar() {
  const { dark } = useTheme();
  return <StatusBar style={dark ? 'light' : 'dark'} />;
}

// One Billing per app process, created once: RevenueCat must only be configured once.
let shared: { billing: Billing; test: TestControls | null } | null = null;

export function billingFor(app: string): { billing: Billing; test: TestControls | null } {
  if (shared) return shared;
  const key = revenueCatKey({ ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY, android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY }, __DEV__);
  if (key) {
    shared = { billing: new Billing(revenueCatClient(key, __DEV__)), test: null };
  } else {
    const t = testClient(app, TEST_MODE);
    shared = { billing: new Billing(t), test: t.controls };
  }
  return shared;
}

export function KitRoot({ brand, children }: { brand: Brand; children: ReactNode }) {
  useEffect(() => initAnalytics(brand.slug), [brand.slug]);
  const { billing, test } = billingFor(brand.slug);
  return (
    <SafeAreaProvider>
      <PremiumProvider app={brand.slug} appName={brand.name} billing={billing} test={test}>
        <ThemeProvider brand={brand}>
          <FeedbackProvider>
            <CelebrateProvider app={brand.slug}>
              <Bar />
              {children}
            </CelebrateProvider>
          </FeedbackProvider>
        </ThemeProvider>
      </PremiumProvider>
    </SafeAreaProvider>
  );
}
