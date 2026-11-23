// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// Celebration moments (each app's five signature scenes). The API is stable:
// `celebrate({ scene, emoji, title, body })`. Today it shows a bouncy card. The FluidStick
// scene player slots in behind the same call (see ADR-007). It respects reduced motion and
// never blocks: tap anywhere or wait 2.6 s and it's gone.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import { success } from './haptics';
import { useTheme } from './theme';

export type Moment = { scene: string; emoji: string; title: string; body?: string };

const Ctx = createContext<((m: Moment) => void) | null>(null);

export function CelebrateProvider({ children }: { app: string; children: ReactNode }) {
  const { c, radius, font } = useTheme();
  const [m, setM] = useState<Moment | null>(null);
  const scale = useRef(new Animated.Value(0.6)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);

  const celebrate = useCallback(
    (moment: Moment) => {
      success();
      setM(moment);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setM(null), 2600);
      if (!reduce) {
        scale.setValue(0.6);
        spin.setValue(0);
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
          Animated.timing(spin, { toValue: 1, duration: 700, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        ]).start();
      } else scale.setValue(1);
    },
    [reduce, scale, spin],
  );

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] });

  return (
    <Ctx.Provider value={celebrate}>
      {children}
      {m ? (
        <Pressable style={styles.wrap} onPress={() => setM(null)} accessibilityRole="alert" accessibilityLabel={`${m.title}. ${m.body ?? ''}`} testID="celebrate">
          <Animated.View style={[styles.card, { backgroundColor: c.surface, borderColor: c.primary, borderRadius: radius + 8, transform: [{ scale }] }]}>
            <Animated.Text style={[styles.emoji, { transform: [{ rotate }] }]}>{m.emoji}</Animated.Text>
            <Text style={{ fontFamily: font.display, fontSize: 24, color: c.text, textAlign: 'center' }}>{m.title}</Text>
            {m.body ? <Text style={{ color: c.textMuted, fontSize: 15, textAlign: 'center' }}>{m.body}</Text> : null}
          </Animated.View>
        </Pressable>
      ) : null}
    </Ctx.Provider>
  );
}

export function useCelebrate() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCelebrate must be used inside <CelebrateProvider>');
  return v;
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' },
  card: { paddingHorizontal: 28, paddingVertical: 24, borderWidth: 3, alignItems: 'center', gap: 6, maxWidth: 320 },
  emoji: { fontSize: 64 },
});

