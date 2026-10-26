import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, Radius, Space } from './theme';

/** Componentes visuais compartilhados (identidade CERISE). */

export function ScreenHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <View style={s.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={14} style={s.back} accessibilityRole="button" accessibilityLabel="Voltar">
          <Text style={s.backText}>‹</Text>
        </Pressable>
      ) : (
        <View style={{ width: 40 }} />
      )}
      <Text style={s.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

type BtnProps = {
  label: string;
  onPress?: () => void;
  color?: string;
  variant?: 'solid' | 'outline' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  small?: boolean;
};

export function Button({ label, onPress, color = Colors.cerise, variant = 'solid', disabled, loading, style, small }: BtnProps) {
  const solid = variant === 'solid';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        solid && { backgroundColor: color },
        variant === 'outline' && { borderWidth: 1.5, borderColor: color },
        (disabled || loading) && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={solid ? Colors.white : color} />
      ) : (
        <Text style={[s.btnText, small && { fontSize: 14 }, { color: solid ? Colors.white : color }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function ProgressBar({ value, color = Colors.cerise, indeterminate }: { value: number; color?: string; indeterminate?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: indeterminate ? '100%' : `${pct}%`, backgroundColor: color, opacity: indeterminate ? 0.35 : 1 }]} />
    </View>
  );
}

export function Chip({ label, active, onPress, color = Colors.cerise }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: color, borderColor: color }]} accessibilityRole="button" accessibilityState={{ selected: !!active }}>
      <Text style={[s.chipText, active && { color: Colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Banner({ tone = 'warn', title, text, action }: { tone?: 'warn' | 'ok' | 'error' | 'info'; title: string; text?: string; action?: React.ReactNode }) {
  const color = tone === 'ok' ? Colors.green : tone === 'error' ? Colors.cerise : tone === 'info' ? Colors.cyan : Colors.orange;
  return (
    <View style={[s.banner, { borderColor: color }]}>
      <View style={[s.bannerDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.bannerTitle}>{title}</Text>
        {text ? <Text style={s.bannerText}>{text}</Text> : null}
        {action}
      </View>
    </View>
  );
}

export const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Space.sm, marginTop: Space.xs },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.inkSoft, alignItems: 'center', justifyContent: 'center' },
  backText: { color: Colors.white, fontSize: 30, fontWeight: '700', marginTop: -4 },
  title: { flex: 1, textAlign: 'center', color: Colors.white, fontSize: 18, fontWeight: '800', marginHorizontal: Space.sm },
  btn: { borderRadius: Radius.pill, paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 9, paddingHorizontal: 16 },
  btnText: { fontSize: 16, fontWeight: '800' },
  card: { backgroundColor: Colors.inkSoft, borderRadius: Radius.lg, padding: Space.md },
  track: { height: 8, borderRadius: 4, backgroundColor: '#3A2A44', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: '#4A3656' },
  chipText: { color: '#CDB9C8', fontWeight: '700' },
  banner: { flexDirection: 'row', gap: Space.sm, borderWidth: 1.5, borderRadius: Radius.md, padding: Space.md, backgroundColor: 'rgba(255,255,255,0.03)' },
  bannerDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  bannerTitle: { color: Colors.white, fontWeight: '800' },
  bannerText: { color: '#CDB9C8', marginTop: 2, fontSize: 13 },
});

/** Texto secundario legivel sobre fundo escuro (o "muted" do tema e escuro demais aqui). */
export const SOFT = '#CDB9C8';
