// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
// Toasts (with undo) and confirm sheets. Both work the same on iOS, Android and web
// (React Native's Alert is a no-op on web, so we never rely on it).
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './theme';
import { Body, Button, Sheet, Stack } from './ui';

type ToastOpts = { actionLabel?: string; onAction?: () => void; ms?: number };
type ConfirmOpts = { title: string; body?: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean };

const Ctx = createContext<{
  toast: (msg: string, opts?: ToastOpts) => void;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
} | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { c, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [toastState, setToast] = useState<{ msg: string; opts: ToastOpts } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmState, setConfirm] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);

  const toast = useCallback((msg: string, opts: ToastOpts = {}) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, opts });
    timer.current = setTimeout(() => setToast(null), opts.ms ?? (opts.actionLabel ? 6000 : 3000));
  }, []);

  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => setConfirm({ ...opts, resolve })), []);

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);
  const close = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirm(null);
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {toastState ? (
        <View pointerEvents="box-none" style={[styles.toastWrap, { bottom: insets.bottom + 72 }]}>
          <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.toast, { backgroundColor: c.text, borderRadius: radius }]} testID="toast">
            <Text style={{ color: c.bg, fontSize: 15, flex: 1 }}>{toastState.msg}</Text>
            {toastState.opts.actionLabel ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  toastState.opts.onAction?.();
                  setToast(null);
                }}
                hitSlop={10}
                testID="toast-action"
              >
                <Text style={{ color: c.bg, fontWeight: '800', fontSize: 15, textDecorationLine: 'underline' }}>{toastState.opts.actionLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
      <Sheet visible={!!confirmState} onClose={() => close(false)} title={confirmState?.title ?? ''} testID="confirm-sheet">
        <Stack>
          {confirmState?.body ? <Body>{confirmState.body}</Body> : null}
          <Button title={confirmState?.confirmLabel ?? 'Confirm'} variant={confirmState?.destructive ? 'danger' : 'primary'} onPress={() => close(true)} testID="confirm-yes" />
          <Button title={confirmState?.cancelLabel ?? 'Cancel'} variant="secondary" onPress={() => close(false)} testID="confirm-no" />
        </Stack>
      </Sheet>
    </Ctx.Provider>
  );
}

export function useFeedback() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFeedback must be used inside <FeedbackProvider>');
  return v;
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 14, maxWidth: 520, width: '100%' },
});
