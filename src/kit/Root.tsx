// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initAnalytics } from './analytics';
import { CelebrateProvider } from './celebrate';
import { FeedbackProvider } from './feedback';
import { PremiumProvider, testAdapter } from './premium';
import { ThemeProvider, useTheme, type Brand } from './theme';

/** True in development, and in internal pilot builds made with EXPO_PUBLIC_TEST_MODE=1. */
export const TEST_MODE = __DEV__ || process.env.EXPO_PUBLIC_TEST_MODE === '1';

function Bar() {
  const { dark } = useTheme();
  return <StatusBar style={dark ? 'light' : 'dark'} />;
}

export function KitRoot({ brand, children }: { brand: Brand; children: ReactNode }) {
  useEffect(() => initAnalytics(brand.slug), [brand.slug]);
  const adapter = useMemo(() => testAdapter(brand.slug, TEST_MODE), [brand.slug]);
  return (
    <SafeAreaProvider>
      <ThemeProvider brand={brand}>
        <PremiumProvider adapter={adapter}>
          <FeedbackProvider>
            <CelebrateProvider app={brand.slug}>
              <Bar />
              {children}
            </CelebrateProvider>
          </FeedbackProvider>
        </PremiumProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
