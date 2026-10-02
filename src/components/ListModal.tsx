import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Row } from '../lib/rows';
import { fmtAlt, fmtDist, fmtSpeed } from '../lib/units';
import { describeSquawk } from '../lib/squawk';
import { AMBER, ALERT, Theme } from '../theme';
import { Settings } from '../types';
import { Tag } from './ui';

interface Props {
  visible: boolean;
  rows: Row[];
  settings: Settings;
  theme: Theme;
  onPick: (hex: string) => void;
  onClose: () => void;
}

export function ListModal({ visible, rows, settings, theme, onPick, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: 16 }}>
        <View style={s.head}>
          <Text style={[s.title, { color: theme.accent }]}>{settings.milOnly ? 'Military' : 'All'} aircraft · {rows.length}</Text>
          <Pressable onPress={onClose} hitSlop={12}><Text style={{ color: theme.accent, fontSize: 16, fontWeight: '600' }}>Done</Text></Pressable>
        </View>
        <FlatList
          data={rows}
          keyExtractor={(r) => r.hex}
          contentContainerStyle={{ padding: 12 }}
          ListEmptyComponent={<Text style={{ color: theme.dim, textAlign: 'center', marginTop: 40 }}>Scanning sector…</Text>}
          renderItem={({ item: r }) => {
            const sq = describeSquawk(r.squawk);
            return (
              <Pressable onPress={() => onPick(r.hex)} style={[s.item, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <View style={[s.dot, { backgroundColor: r.color }]} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, marginRight: 6, marginTop: 4 }}>{(r.flight || '').trim() || r.r || r.hex.toUpperCase()}</Text>
                    {r.mil && <Tag text="MIL" color={AMBER} />}
                    {sq && sq.kind === 'alert' && <Tag text={sq.short} color={ALERT} />}
                  </View>
                  <Text style={{ color: theme.dim, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                    {r.t || '--'} · {fmtAlt(r.alt_baro, settings.alt)} · {fmtSpeed(r.gs, settings.speed)}
                  </Text>
                </View>
                <Text style={{ color: theme.text, fontVariant: ['tabular-nums'], fontSize: 13 }}>{fmtDist(r.distNM, settings.dist)}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4 },
  title: { fontSize: 20, fontWeight: '800' },
  item: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
});
