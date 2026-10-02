import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEFAULT_SETTINGS } from '../lib/storage';
import { Theme, THEMES } from '../theme';
import { Settings, ThemeName } from '../types';
import { Seg } from './ui';

interface Props {
  visible: boolean;
  settings: Settings;
  theme: Theme;
  onChange: (s: Settings) => void;
  onClose: () => void;
}

export function SettingsModal({ visible, settings, theme, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v });
  const label = { color: theme.text, fontSize: 14 } as const;
  const input = [s.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: 16 }}>
        <View style={s.head}>
          <Text style={[s.title, { color: theme.accent }]}>Settings</Text>
          <Pressable onPress={onClose} hitSlop={12}><Text style={{ color: theme.accent, fontSize: 16, fontWeight: '600' }}>Done</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
          <Group title="Units" theme={theme}>
            <Row text="Speed" labelStyle={label}>
              <Seg theme={theme} value={settings.speed} onChange={(v) => set('speed', v)} options={[{ value: 'kts', label: 'kts' }, { value: 'mph', label: 'mph' }, { value: 'kmh', label: 'km/h' }]} />
            </Row>
            <Row text="Altitude" labelStyle={label}>
              <Seg theme={theme} value={settings.alt} onChange={(v) => set('alt', v)} options={[{ value: 'ft', label: 'ft' }, { value: 'm', label: 'm' }]} />
            </Row>
            <Row text="Distance" labelStyle={label}>
              <Seg theme={theme} value={settings.dist} onChange={(v) => set('dist', v)} options={[{ value: 'nm', label: 'NM' }, { value: 'mi', label: 'mi' }, { value: 'km', label: 'km' }]} />
            </Row>
          </Group>

          <Group title="Theme" theme={theme}>
            <Seg<ThemeName>
              theme={theme}
              value={settings.theme}
              onChange={(v) => set('theme', v)}
              options={(Object.keys(THEMES) as ThemeName[]).map((k) => ({ value: k, label: THEMES[k].label }))}
            />
          </Group>

          <Group title="Features" theme={theme}>
            <Toggle title="Rare-aircraft alerts" sub="Haptics and a banner for A380s, Belugas, warbirds and display teams" value={settings.rareAlerts} onChange={(v) => set('rareAlerts', v)} theme={theme} />
            <Toggle title="Military only" sub="Show only military aircraft (emergencies still appear)" value={settings.milOnly} onChange={(v) => set('milOnly', v)} theme={theme} />
          </Group>

          <Group title="Filters (comma-separate for several)" theme={theme}>
            <Text style={[label, { marginBottom: 4 }]}>Operator</Text>
            <TextInput style={input} value={settings.filterOperator} onChangeText={(v) => set('filterOperator', v)} placeholder="e.g. RYR, BAW, EZY" placeholderTextColor={theme.dim} autoCapitalize="characters" autoCorrect={false} />
            <Text style={[label, { marginBottom: 4, marginTop: 10 }]}>Type</Text>
            <TextInput style={input} value={settings.filterType} onChangeText={(v) => set('filterType', v)} placeholder="e.g. A320, B738, C130" placeholderTextColor={theme.dim} autoCapitalize="characters" autoCorrect={false} />
            <Text style={[label, { marginBottom: 4, marginTop: 10 }]}>Squawk</Text>
            <TextInput style={input} value={settings.filterSquawk} onChangeText={(v) => set('filterSquawk', v)} placeholder="e.g. 7000, 72" placeholderTextColor={theme.dim} keyboardType="number-pad" />
            <Pressable onPress={() => onChange({ ...settings, filterOperator: '', filterType: '', filterSquawk: '' })} style={[s.btn, { borderColor: theme.border }]}>
              <Text style={{ color: theme.text, fontWeight: '600' }}>Clear filters</Text>
            </Pressable>
          </Group>

          <Pressable onPress={() => onChange({ ...DEFAULT_SETTINGS })} style={[s.btn, { borderColor: theme.border }]}>
            <Text style={{ color: theme.text, fontWeight: '600' }}>Reset all settings</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Group({ title, theme, children }: { title: string; theme: Theme; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={[s.group, { color: theme.dim }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Row({ text, labelStyle, children }: { text: string; labelStyle: object; children: React.ReactNode }) {
  return (
    <View style={s.row}>
      <Text style={labelStyle}>{text}</Text>
      {children}
    </View>
  );
}

function Toggle({ title, sub, value, onChange, theme }: { title: string; sub: string; value: boolean; onChange: (v: boolean) => void; theme: Theme }) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: theme.dim, fontSize: 12, marginTop: 2 }}>{sub}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.accent, false: theme.border }} />
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '800' },
  group: { fontSize: 11, letterSpacing: 1.4, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15 },
  btn: { borderWidth: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginTop: 14 },
});
