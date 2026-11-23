import { Unbounded_700Bold, useFonts } from '@expo-google-fonts/unbounded';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Intro } from '@/kit/Intro';
import { prefsStore } from '@/kit/prefs';
import { KitRoot } from '@/kit/Root';
import { useTheme } from '@/kit/theme';
import { brand } from '@/brand';

SplashScreen.preventAutoHideAsync().catch(() => {});
const usePrefs = prefsStore('worthit', 20);
const Art = ({ children }: { children: string }) => <Text style={{ fontSize: 88 }}>{children}</Text>;

function Shell() {
  const { c } = useTheme();
  const onboarded = usePrefs((s) => s.onboarded);
  const header = { headerShown: true, headerTintColor: c.text, headerStyle: { backgroundColor: c.bg }, headerShadowVisible: false } as const;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="person/new" options={{ ...header, title: 'Someone new', presentation: 'modal' }} />
        <Stack.Screen name="person/[id]" options={{ ...header, title: '' }} />
        <Stack.Screen name="checkin" options={{ ...header, title: "How's it going?", presentation: 'modal' }} />
      </Stack>
      {!onboarded ? (
        <View style={StyleSheet.absoluteFill}>
          <Intro
            cta="Let's see"
            onDone={() => usePrefs.getState().setOnboarded()}
            steps={[
              { title: 'Get out of your head', body: 'After you see them, do a 20-second check-in: how you felt before and after, the flags, words versus actions.', art: <Art>🕵️</Art> },
              { title: 'Look at the pattern', body: 'WorthIt? shows the pattern over time, so you can see what is really going on. It never scores a person.', art: <Art>🧩</Art> },
              { title: 'Private by design', body: 'Nicknames only. Everything stays on this phone. No account, no uploads.', art: <Art>🔒</Art> },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Unbounded_700Bold });
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <KitRoot brand={brand}>
      <Shell />
    </KitRoot>
  );
}
