// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
// Accessible UI primitives. Every app styles them through its Brand, so nine apps share
// behaviour (touch targets, labels, focus, states) without sharing a look.
import Ionicons from '@expo/vector-icons/Ionicons';
import { type ComponentProps, type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tap } from './haptics';
import { useTheme } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const MAX_WIDTH = 560;

// ---------- Layout ----------

export function Screen({
  children,
  scroll = true,
  footer,
  banner,
  edges = ['top'],
  testID,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  /** A sticky ad slot under the content (kit/ads <AdBanner>). Never on screens with a footer of actions. */
  banner?: ReactNode;
  edges?: ('top' | 'bottom')[];
  testID?: string;
}) {
  const { c } = useTheme();
  const inner = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: c.bg }]} testID={testID}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        <View style={[styles.fill, styles.scroll]}>{inner}</View>
      )}
      {footer ? <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.bg }]}>{footer}</View> : null}
      {banner}
    </SafeAreaView>
  );
}

export function Row({ children, gap = 8, style, wrap }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Stack({ children, gap = 12, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export function Spacer({ h = 16 }: { h?: number }) {
  return <View style={{ height: h }} />;
}

// ---------- Text ----------

type TxtProps = { children: ReactNode; style?: StyleProp<TextStyle>; center?: boolean; color?: string; testID?: string; numberOfLines?: number };

function useTxt(base: TextStyle, display: boolean, { style, center, color }: Omit<TxtProps, 'children'>): StyleProp<TextStyle> {
  const { c, font } = useTheme();
  return [base, { color: color ?? c.text, fontFamily: display ? font.display : font.body }, center && { textAlign: 'center' }, style];
}

export function Display({ children, ...p }: TxtProps) {
  return (
    <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={useTxt({ fontSize: 40, lineHeight: 46 }, true, p)} testID={p.testID} numberOfLines={p.numberOfLines}>
      {children}
    </Text>
  );
}
export function H1({ children, ...p }: TxtProps) {
  return (
    <Text accessibilityRole="header" maxFontSizeMultiplier={1.6} style={useTxt({ fontSize: 28, lineHeight: 34 }, true, p)} testID={p.testID}>
      {children}
    </Text>
  );
}
export function H2({ children, ...p }: TxtProps) {
  return (
    <Text accessibilityRole="header" maxFontSizeMultiplier={1.8} style={useTxt({ fontSize: 20, lineHeight: 26 }, true, p)} testID={p.testID}>
      {children}
    </Text>
  );
}
export function Body({ children, ...p }: TxtProps) {
  return (
    <Text style={useTxt({ fontSize: 16, lineHeight: 23 }, false, p)} testID={p.testID} numberOfLines={p.numberOfLines}>
      {children}
    </Text>
  );
}
export function Strong({ children, ...p }: TxtProps) {
  return (
    <Text style={useTxt({ fontSize: 16, lineHeight: 23, fontWeight: '700' }, false, p)} testID={p.testID} numberOfLines={p.numberOfLines}>
      {children}
    </Text>
  );
}
export function Muted({ children, ...p }: TxtProps) {
  const { c } = useTheme();
  return (
    <Text style={useTxt({ fontSize: 14, lineHeight: 20 }, false, { ...p, color: p.color ?? c.textMuted })} testID={p.testID} numberOfLines={p.numberOfLines}>
      {children}
    </Text>
  );
}
export function Label({ children, ...p }: TxtProps) {
  const { c } = useTheme();
  return <Text style={useTxt({ fontSize: 13, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' }, false, { ...p, color: p.color ?? c.textMuted })}>{children}</Text>;
}

// ---------- Controls ----------

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', icon, disabled, loading, small, testID, accessibilityLabel, accessibilityHint, style }: ButtonProps) {
  const { c, radius } = useTheme();
  const palette = {
    primary: { bg: c.primary, fg: c.primaryText, border: c.primary },
    accent: { bg: c.accent, fg: c.accentText, border: c.accent },
    secondary: { bg: c.surface, fg: c.text, border: c.border },
    ghost: { bg: 'transparent', fg: c.primary, border: 'transparent' },
    danger: { bg: 'transparent', fg: c.danger, border: c.danger },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      aria-disabled={!!off}
      aria-busy={!!loading}
      disabled={off}
      onPress={() => {
        tap();
        onPress();
      }}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: palette.bg, borderColor: palette.border, borderRadius: radius, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Row gap={8} style={{ justifyContent: 'center' }}>
          {icon ? <Ionicons name={icon} size={small ? 16 : 20} color={palette.fg} /> : null}
          <Text style={{ color: palette.fg, fontSize: small ? 14 : 16, fontWeight: '700' }} maxFontSizeMultiplier={1.5}>
            {title}
          </Text>
        </Row>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, color, size = 22, testID }: { icon: IconName; label: string; onPress: () => void; color?: string; size?: number; testID?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      hitSlop={8}
      testID={testID}
      style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={icon} size={size} color={color ?? c.text} />
    </Pressable>
  );
}

export function Card({ children, onPress, style, tone, testID, accessibilityLabel }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; tone?: 'alt' | 'primary' | 'accent'; testID?: string; accessibilityLabel?: string }) {
  const { c, radius } = useTheme();
  const bg = tone === 'primary' ? c.primary : tone === 'accent' ? c.accent : tone === 'alt' ? c.surfaceAlt : c.surface;
  const base = [styles.card, { backgroundColor: bg, borderColor: tone ? bg : c.border, borderRadius: radius + 4 }, style];
  if (!onPress) return <View style={base} testID={testID}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [base, { opacity: pressed ? 0.9 : 1 }]}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}

export function Field({ label, hint, error, prefix, style, ...rest }: TextInputProps & { label: string; hint?: string; error?: string | null; prefix?: string; testID?: string }) {
    const { c, radius } = useTheme();
    const [focused, setFocused] = useState(false);
    return (
      <View style={{ gap: 6 }}>
        <Text style={{ color: c.text, fontWeight: '600', fontSize: 15 }}>{label}</Text>
        <View
          style={[
            styles.field,
            { borderColor: error ? c.danger : focused ? c.focus : c.border, backgroundColor: c.surface, borderRadius: radius },
          ]}
        >
          {prefix ? <Text style={{ color: c.textMuted, fontSize: 17, marginRight: 4 }}>{prefix}</Text> : null}
          <TextInput
            accessibilityLabel={label}
            accessibilityHint={hint}
            placeholderTextColor={c.textMuted}
            style={[{ flex: 1, color: c.text, fontSize: 17, paddingVertical: 12, minHeight: 48 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object), style]}
            onFocus={(e) => {
              setFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              rest.onBlur?.(e);
            }}
            {...rest}
          />
        </View>
        {error ? (
          <Text accessibilityLiveRegion="polite" style={{ color: c.danger, fontSize: 14 }}>
            {error}
          </Text>
        ) : hint ? (
          <Text style={{ color: c.textMuted, fontSize: 13 }}>{hint}</Text>
        ) : null}
      </View>
    );
}

export function Segmented<T extends string>({ options, value, onChange, label, testID }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string; testID?: string }) {
  const { c, radius } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segmented, { backgroundColor: c.surfaceAlt, borderRadius: radius }]} testID={testID}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            aria-checked={on}
            accessibilityLabel={o.label}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[styles.segment, { borderRadius: radius - 2, backgroundColor: on ? c.surface : 'transparent', borderColor: on ? c.border : 'transparent' }]}
          >
            <Text style={{ color: on ? c.text : c.textMuted, fontWeight: on ? '700' : '500', fontSize: 14, textAlign: 'center' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, selected, onPress, icon, testID }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName; testID?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'checkbox' : 'text'}
      accessibilityState={onPress ? { checked: !!selected } : undefined}
      aria-checked={onPress ? !!selected : undefined}
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={() => {
        tap();
        onPress?.();
      }}
      testID={testID}
      style={[styles.chip, { backgroundColor: selected ? c.primary : c.surface, borderColor: selected ? c.primary : c.border }]}
    >
      <Row gap={6}>
        {icon ? <Ionicons name={icon} size={14} color={selected ? c.primaryText : c.text} /> : null}
        <Text style={{ color: selected ? c.primaryText : c.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
      </Row>
    </Pressable>
  );
}

export function Toggle({ label, value, onChange, hint, testID }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string; testID?: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      aria-checked={value}
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={() => {
        tap();
        onChange(!value);
      }}
      testID={testID}
      style={styles.listRow}
    >
      <View style={{ flex: 1 }}>
        <Body>{label}</Body>
        {hint ? <Muted>{hint}</Muted> : null}
      </View>
      <View style={[styles.switch, { backgroundColor: value ? c.primary : c.border }]}>
        <View style={[styles.knob, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
      </View>
    </Pressable>
  );
}

export function ListRow({ title, subtitle, right, icon, onPress, testID, danger }: { title: string; subtitle?: string; right?: ReactNode; icon?: IconName; onPress?: () => void; testID?: string; danger?: boolean }) {
  const { c } = useTheme();
  const content = (
    <>
      {icon ? <Ionicons name={icon} size={22} color={danger ? c.danger : c.textMuted} /> : null}
      <View style={{ flex: 1 }}>
        <Body color={danger ? c.danger : undefined}>{title}</Body>
        {subtitle ? <Muted>{subtitle}</Muted> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={c.textMuted} /> : null)}
    </>
  );
  if (!onPress) return <View style={styles.listRow} testID={testID}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title} onPress={onPress} style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.7 }]} testID={testID}>
      {content}
    </Pressable>
  );
}

// ---------- Display ----------

export function ProgressBar({ value, label, color, height = 12 }: { value: number; label: string; color?: string; height?: number }) {
  const { c } = useTheme();
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      style={{ height, borderRadius: height, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}
    >
      <View style={{ width: `${v * 100}%`, height: '100%', borderRadius: height, backgroundColor: color ?? c.primary }} />
    </View>
  );
}

export function Stat({ label, value, testID, color }: { label: string; value: string; testID?: string; color?: string }) {
  const { c, font } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 90 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={{ color: c.textMuted, fontSize: 13 }}>{label}</Text>
      <Text testID={testID} maxFontSizeMultiplier={1.4} style={{ color: color ?? c.text, fontSize: 22, fontFamily: font.display }}>
        {value}
      </Text>
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: IconName; title: string; body?: string; action?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={styles.empty}>
      {icon ? <Ionicons name={icon} size={40} color={c.textMuted} /> : null}
      <H2 center>{title}</H2>
      {body ? <Muted center>{body}</Muted> : null}
      {action}
    </View>
  );
}

export function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' }) {
  const { c, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: radius, backgroundColor: c.surfaceAlt, alignItems: 'flex-start' }}>
      <Ionicons name={tone === 'warning' ? 'alert-circle-outline' : 'information-circle-outline'} size={18} color={tone === 'warning' ? c.warning : c.textMuted} />
      <Muted style={{ flex: 1 }}>{children}</Muted>
    </View>
  );
}

export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: 4 }} />;
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Label>{title}</Label>
        {right}
      </Row>
      {children}
    </View>
  );
}

// ---------- Sheet ----------

export function Sheet({ visible, onClose, title, children, testID }: { visible: boolean; onClose: () => void; title: string; children: ReactNode; testID?: string }) {
  const { c, radius } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      <View style={[styles.sheet, { backgroundColor: c.bg, borderTopLeftRadius: radius + 12, borderTopRightRadius: radius + 12 }]} testID={testID} accessibilityViewIsModal>
        <SafeAreaView edges={['bottom']}>
          <View style={styles.inner}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <H2>{title}</H2>
              <IconButton icon="close" label="Close" onPress={onClose} testID="sheet-close" />
            </Row>
            <ScrollView style={{ maxHeight: 560 }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  inner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', gap: 16 },
  footer: { paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  button: { minHeight: 52, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  buttonSmall: { minHeight: 40, paddingHorizontal: 14 },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 16, borderWidth: 1, gap: 8 },
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, paddingHorizontal: 14 },
  segmented: { flexDirection: 'row', padding: 3, gap: 3 },
  segment: { flex: 1, minHeight: 40, justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 8 },
  switch: { width: 50, height: 30, borderRadius: 15, padding: 3, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 16 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 16, maxHeight: '92%' },
});
