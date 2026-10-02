import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Theme } from '../theme';

export function Stat({ label, value, theme, color }: { label: string; value: string; theme: Theme; color?: string }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statLabel, { color: theme.dim }]}>{label}</Text>
      <Text style={[s.statValue, { color: color ?? theme.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function Tag({ text, color }: { text: string; color: string }) {
  return (
    <View style={[s.tag, { borderColor: color }]}>
      <Text style={[s.tagText, { color }]}>{text}</Text>
    </View>
  );
}

export function Seg<T extends string>({ value, options, onChange, theme }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; theme: Theme;
}) {
  return (
    <View style={[s.seg, { borderColor: theme.border }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Text
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[s.segItem, { color: on ? theme.bg : theme.dim, backgroundColor: on ? theme.accent : 'transparent' }]}
          >
            {o.label}
          </Text>
        );
      })}
    </View>
  );
}

export const card = (theme: Theme): ViewStyle => ({ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 14 });
export const mono: TextStyle = { fontVariant: ['tabular-nums'] };

const s = StyleSheet.create({
  stat: { width: '33.33%', paddingVertical: 6, paddingRight: 6 },
  statLabel: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  statValue: { fontSize: 15, fontWeight: '600', marginTop: 2, fontVariant: ['tabular-nums'] },
  tag: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginRight: 6, marginTop: 4 },
  tagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  seg: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  segItem: { paddingHorizontal: 11, paddingVertical: 6, fontSize: 12, fontWeight: '600', overflow: 'hidden' },
});
