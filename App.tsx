import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { DetailSheet } from './src/components/DetailSheet';
import { ListModal } from './src/components/ListModal';
import { PlaneMarker } from './src/components/PlaneMarker';
import { PostcodeScreen } from './src/components/PostcodeScreen';
import { SettingsModal } from './src/components/SettingsModal';
import { Tag } from './src/components/ui';
import { RADIUS_NM } from './src/config';
import { rareLabel } from './src/lib/military';
import { applyFilters, buildRows, Row } from './src/lib/rows';
import { DEFAULT_SETTINGS, loadSettings, loadStation, saveSettings, saveStation } from './src/lib/storage';
import { describeSquawk, isEmergencySquawk } from './src/lib/squawk';
import { useRadar } from './src/lib/useRadar';
import { fmtAlt, fmtDist, fmtSpeed } from './src/lib/units';
import { DARK_MAP_STYLE } from './src/mapStyle';
import { ALERT, ALT_BANDS, AMBER, THEMES } from './src/theme';
import { Settings, Station } from './src/types';

const NM_M = 1852;

interface Banner { key: string; text: string; color: string; hex: string }

function Radar() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [station, setStation] = useState<Station | null | undefined>(undefined); // undefined = still loading
  const [editingLocation, setEditingLocation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showList, setShowList] = useState(false);
  const [selectedHex, setSelectedHex] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const snapshot = useRef<Row | null>(null);
  const map = useRef<MapView>(null);
  const alerted = useRef(new Set<string>());
  const theme = THEMES[settings.theme];

  useEffect(() => {
    (async () => {
      setSettings(await loadSettings());
      setStation(await loadStation());
    })();
  }, []);

  const { aircraft, status, updatedAt } = useRadar(station ?? null);

  const allRows = useMemo(() => (station ? buildRows(aircraft, station.lat, station.lon) : []), [aircraft, station]);
  const rows = useMemo(() => applyFilters(allRows, settings), [allRows, settings]);
  const milCount = useMemo(() => allRows.filter((r) => r.mil).length, [allRows]);

  const selected = selectedHex ? rows.find((r) => r.hex === selectedHex) ?? allRows.find((r) => r.hex === selectedHex) : undefined;
  if (selected) snapshot.current = selected;
  const sheetRow = selectedHex ? selected ?? (snapshot.current?.hex === selectedHex ? snapshot.current : null) : null;
  const nearest = rows[0];

  // Alerts: emergency squawks, nearby military and rare aircraft - once per aircraft per kind.
  useEffect(() => {
    const buzz = (t: Haptics.NotificationFeedbackType) => { Haptics.notificationAsync(t).catch(() => {}); };
    for (const r of allRows) {
      const name = (r.flight || '').trim() || r.r || r.hex.toUpperCase();
      let b: Banner | null = null;
      let kind: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success;
      if (isEmergencySquawk(r.squawk) || r.squawk === '7777') {
        b = { key: `${r.hex}:sq${r.squawk}`, hex: r.hex, color: ALERT, text: `${describeSquawk(r.squawk)?.short}: ${name}` };
        kind = Haptics.NotificationFeedbackType.Error;
      } else if (r.mil && r.distNM < 15) {
        b = { key: `${r.hex}:mil`, hex: r.hex, color: AMBER, text: `Military ${r.t || 'aircraft'} ${name} · ${fmtDist(r.distNM, settings.dist)}` };
        kind = Haptics.NotificationFeedbackType.Warning;
      } else if (settings.rareAlerts && rareLabel(r)) {
        b = { key: `${r.hex}:rare`, hex: r.hex, color: theme.accent, text: `Rare: ${rareLabel(r)} · ${name}` };
      }
      if (b && !alerted.current.has(b.key)) {
        alerted.current.add(b.key);
        setBanner(b);
        buzz(kind);
        break; // one banner per poll
      }
    }
  }, [allRows, settings.rareAlerts, settings.dist, theme.accent]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 9000);
    return () => clearTimeout(t);
  }, [banner]);

  const updateSettings = useCallback((s: Settings) => { setSettings(s); saveSettings(s); }, []);

  const pick = useCallback((hex: string) => {
    setSelectedHex(hex);
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const recenter = useCallback((st: Station) => {
    map.current?.animateToRegion({ latitude: st.lat, longitude: st.lon, latitudeDelta: 1.35, longitudeDelta: 1.35 }, 500);
  }, []);

  const confirmStation = (s: Station) => {
    setStation(s);
    saveStation(s);
    setEditingLocation(false);
    setSelectedHex(null);
    alerted.current.clear();
    setTimeout(() => recenter(s), 100);
  };

  if (station === undefined) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  if (station === null || editingLocation) {
    return <PostcodeScreen theme={theme} current={station} onDone={confirmStation} onCancel={station ? () => setEditingLocation(false) : undefined} />;
  }

  const statusText =
    status === 'live' ? `LIVE · ${rows.length} aircraft${milCount ? ` · ${milCount} MIL` : ''}`
    : status === 'limited' ? 'RATE LIMITED · retrying'
    : status === 'offline' ? (updatedAt ? 'OFFLINE · showing last data' : 'OFFLINE · retrying')
    : 'CONNECTING…';
  const statusColor = status === 'live' ? theme.accent : status === 'connecting' ? theme.dim : ALERT;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style="light" />
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: station.lat, longitude: station.lon, latitudeDelta: 1.35, longitudeDelta: 1.35 }}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        userInterfaceStyle="dark"
        customMapStyle={Platform.OS === 'android' ? DARK_MAP_STYLE : undefined}
        showsCompass={false}
        showsPointsOfInterests={false}
        pitchEnabled={false}
        onPress={() => setSelectedHex(null)}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <Circle key={f} center={{ latitude: station.lat, longitude: station.lon }} radius={RADIUS_NM * NM_M * f} strokeColor={`${theme.accent}${f === 1 ? '88' : '33'}`} strokeWidth={1} />
        ))}
        <Marker coordinate={{ latitude: station.lat, longitude: station.lon }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <View style={[s.station, { borderColor: theme.accent, backgroundColor: theme.bg }]} />
        </Marker>
        {rows.map((r) => (
          <PlaneMarker
            key={r.hex}
            hex={r.hex}
            lat={r.lat as number}
            lon={r.lon as number}
            heading={r.track ?? 0}
            color={isEmergencySquawk(r.squawk) || r.squawk === '7777' ? ALERT : r.mil ? AMBER : r.color}
            selected={r.hex === selectedHex}
            onPress={pick}
          />
        ))}
      </MapView>

      <View pointerEvents="box-none" style={[s.top, { paddingTop: insets.top + 8 }]}>
        <View style={[s.pill, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ color: statusColor, fontWeight: '700', fontSize: 12, letterSpacing: 0.6 }}>● {statusText}</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <RoundBtn glyph="☰" onPress={() => setShowList(true)} theme={theme} label="Aircraft list" />
          <RoundBtn glyph="📍" onPress={() => setEditingLocation(true)} theme={theme} label="Change location" />
          <RoundBtn glyph="⚙️" onPress={() => setShowSettings(true)} theme={theme} label="Settings" />
        </View>
      </View>

      {banner && (
        <Pressable
          onPress={() => { pick(banner.hex); setBanner(null); }}
          style={[s.banner, { top: insets.top + 58, backgroundColor: theme.card, borderColor: banner.color }]}
        >
          <Text style={{ color: banner.color, fontWeight: '800', fontSize: 13 }}>{banner.text}</Text>
        </Pressable>
      )}

      <View pointerEvents="box-none" style={[s.bottom, { paddingBottom: insets.bottom + 8 }]}>
        {sheetRow ? (
          <DetailSheet
            row={sheetRow}
            lost={!selected}
            settings={settings}
            theme={theme}
            onClose={() => setSelectedHex(null)}
            maxHeight={height * 0.6}
          />
        ) : (
          <Pressable
            onPress={() => nearest && pick(nearest.hex)}
            style={[s.nearest, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={{ color: theme.dim, fontSize: 10, letterSpacing: 1.2, fontWeight: '700' }}>NEAREST AIRCRAFT</Text>
            {nearest ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={{ color: nearest.color, fontSize: 22, fontWeight: '800', marginRight: 8 }}>
                    {(nearest.flight || '').trim() || nearest.r || nearest.hex.toUpperCase()}
                  </Text>
                  {nearest.mil && <Tag text="MIL" color={AMBER} />}
                </View>
                <Text style={{ color: theme.text, fontSize: 13, marginTop: 2 }}>
                  {nearest.t || '--'} · {fmtDist(nearest.distNM, settings.dist)} · {fmtAlt(nearest.alt_baro, settings.alt)} · {fmtSpeed(nearest.gs, settings.speed)}
                </Text>
              </>
            ) : (
              <Text style={{ color: theme.dim, fontSize: 14, marginTop: 4 }}>
                {status === 'live' ? 'Nothing in range right now.' : 'Scanning sector…'}
              </Text>
            )}
            <View style={s.legend}>
              {ALT_BANDS.map((b) => (
                <View key={b.label} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: b.color, marginRight: 4 }} />
                  <Text style={{ color: theme.dim, fontSize: 10 }}>{b.label}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        )}
      </View>

      <ListModal visible={showList} rows={rows} settings={settings} theme={theme} onPick={(h) => { setShowList(false); pick(h); }} onClose={() => setShowList(false)} />
      <SettingsModal visible={showSettings} settings={settings} theme={theme} onChange={updateSettings} onClose={() => setShowSettings(false)} />
    </View>
  );
}

function RoundBtn({ glyph, onPress, theme, label }: { glyph: string; onPress: () => void; theme: (typeof THEMES)['green']; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={[s.round, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={{ fontSize: 16, color: theme.text }}>{glyph}</Text>
    </Pressable>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Radar />
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  round: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  banner: { position: 'absolute', left: 12, right: 12, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },
  nearest: { borderWidth: 1, borderRadius: 16, padding: 14 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  station: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});
