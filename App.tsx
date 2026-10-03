import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Camera, LineLayer, MapView, MarkerView, RasterLayer, RasterSource, ShapeSource } from '@maplibre/maplibre-react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { DailySummaryModal } from './src/components/DailySummaryModal';
import { DetailSheet } from './src/components/DetailSheet';
import { ListModal } from './src/components/ListModal';
import { PlaneMarker } from './src/components/PlaneMarker';
import { PostcodeScreen } from './src/components/PostcodeScreen';
import { SettingsModal } from './src/components/SettingsModal';
import { Tag } from './src/components/ui';
import { RADIUS_NM } from './src/config';
import { parseLink } from './src/lib/deeplink';
import { geocodePostcode } from './src/lib/api';
import { airportsNear } from './src/lib/airports';
import { loadDailyLog, pruneOldDailyLogs, recordEntries, saveDailyLog } from './src/lib/dailyLog';
import { rareLabel } from './src/lib/military';
import { shareAircraft } from './src/lib/share';
import { useWeatherTiles } from './src/lib/useWeather';
import { applyFilters, buildRows, Row } from './src/lib/rows';
import { DEFAULT_SETTINGS, loadSettings, loadStation, saveSettings, saveStation } from './src/lib/storage';
import { describeSquawk, isEmergencySquawk } from './src/lib/squawk';
import { useRadar } from './src/lib/useRadar';
import { fmtAlt, fmtDist, fmtSpeed } from './src/lib/units';
import { circleCoords } from './src/lib/geo';
import { MAP_STYLE, START_ZOOM } from './src/mapStyle';
import { ALERT, ALT_BANDS, AMBER, THEMES } from './src/theme';
import { Settings, Station } from './src/types';

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
  const [showSummary, setShowSummary] = useState(false);
  const [followHex, setFollowHex] = useState<string | null>(null);
  const followLostAt = useRef(0);
  const pendingAc = useRef<{ hex: string; until: number } | null>(null);
  const dailyLog = useRef<Awaited<ReturnType<typeof loadDailyLog>> | null>(null);
  const [selectedHex, setSelectedHex] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const snapshot = useRef<Row | null>(null);
  const camera = useRef<React.ElementRef<typeof Camera>>(null);
  const easeTo = (center: [number, number], duration: number, zoom?: number) =>
    camera.current?.setCamera({ centerCoordinate: center, ...(zoom !== undefined ? { zoomLevel: zoom } : {}), animationDuration: duration, animationMode: 'easeTo' });
  const alerted = useRef(new Set<string>());
  const theme = THEMES[settings.theme];

  useEffect(() => {
    (async () => {
      setSettings(await loadSettings());
      setStation(await loadStation());
      await pruneOldDailyLogs();
      dailyLog.current = await loadDailyLog();
    })();
  }, []);

  const { aircraft, status, updatedAt } = useRadar(station ?? null);
  const weatherTiles = useWeatherTiles(settings.showWeather);
  const airports = useMemo(() => (station && settings.showAirports ? airportsNear(station.lat, station.lon, RADIUS_NM * 3) : []), [station, settings.showAirports]);

  // Daily log of notable (military / alert-squawk) traffic, fed to the AI daily summary.
  useEffect(() => {
    if (!dailyLog.current) return;
    const next = recordEntries(aircraft, dailyLog.current);
    if (next) { dailyLog.current = next; saveDailyLog(next); }
  }, [aircraft]);

  const allRows = useMemo(() => (station ? buildRows(aircraft, station.lat, station.lon) : []), [aircraft, station]);
  const rows = useMemo(() => applyFilters(allRows, settings), [allRows, settings]);
  const milCount = useMemo(() => allRows.filter((r) => r.mil).length, [allRows]);

  const selected = selectedHex ? rows.find((r) => r.hex === selectedHex) ?? allRows.find((r) => r.hex === selectedHex) : undefined;
  if (selected) snapshot.current = selected;
  const sheetRow = selectedHex ? selected ?? (snapshot.current?.hex === selectedHex ? snapshot.current : null) : null;
  const nearest = rows[0];

  // Follow mode: keep the camera on the followed aircraft; give up if the signal is gone for 60s.
  useEffect(() => {
    if (!followHex) return;
    const live = allRows.find((r) => r.hex === followHex);
    if (live) {
      followLostAt.current = 0;
      easeTo([live.lon as number, live.lat as number], 1500);
    } else {
      if (!followLostAt.current) followLostAt.current = Date.now();
      if (Date.now() - followLostAt.current > 60000) stopFollow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, followHex]);

  const ringsGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: station
        ? [0.25, 0.5, 0.75, 1].map((f) => ({
            type: 'Feature' as const,
            properties: { outer: f === 1 },
            geometry: { type: 'LineString' as const, coordinates: circleCoords(station.lat, station.lon, RADIUS_NM * f) },
          }))
        : [],
    }),
    [station],
  );
  const nearestLineGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features:
        station && nearest
          ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [[station.lon, station.lat], [nearest.lon as number, nearest.lat as number]] } }]
          : [],
    }),
    [station, nearest?.lat, nearest?.lon], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // Draw the selected and nearest aircraft last so they sit on top.
  const drawRows = useMemo(
    () => [...rows].sort((a, b) => Number(a.hex === selectedHex || a.hex === nearest?.hex) - Number(b.hex === selectedHex || b.hex === nearest?.hex)),
    [rows, selectedHex, nearest?.hex], // eslint-disable-line react-hooks/exhaustive-deps
  );

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

  const startFollow = (hex: string) => { followLostAt.current = 0; setFollowHex(hex); };
  const stopFollow = () => {
    setFollowHex(null);
    followLostAt.current = 0;
    if (station) easeTo([station.lon, station.lat], 500, START_ZOOM);
  };

  const recenter = useCallback((st: Station) => {
    easeTo([st.lon, st.lat], 500, START_ZOOM);
  }, []);

  const confirmStation = (s: Station) => {
    setStation(s);
    saveStation(s);
    setEditingLocation(false);
    setSelectedHex(null);
    setFollowHex(null);
    alerted.current.clear();
    setTimeout(() => recenter(s), 100);
  };

  // Deep links: web share links (?pc/?ac/?theme/...) and aerosentry:// both land here.
  const applyLink = useCallback(async (url: string) => {
    const link = parseLink(url);
    if (!link) return;
    if (Object.keys(link.settings).length) {
      setSettings((prev) => { const n = { ...prev, ...link.settings }; saveSettings(n); return n; });
    }
    if (link.pc) {
      const r = await geocodePostcode(link.pc);
      if (!('error' in r)) {
        setStation(r); saveStation(r); setFollowHex(null); alerted.current.clear();
        setTimeout(() => recenter(r), 100);
      }
    }
    if (link.ac) {
      pendingAc.current = { hex: link.ac, until: Date.now() + 5 * 60 * 1000 };
      setEditingLocation(false);
    }
  }, [recenter]);

  const linksReady = station !== undefined;
  useEffect(() => {
    if (!linksReady) return;
    Linking.getInitialURL().then((u) => { if (u) applyLink(u); }).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => applyLink(url));
    return () => sub.remove();
  }, [linksReady, applyLink]);

  // Select the linked aircraft once it shows up in the feed; give up after 5 minutes.
  useEffect(() => {
    const p = pendingAc.current;
    if (!p) return;
    const hit = allRows.find((r) => r.hex.toLowerCase() === p.hex);
    if (hit) { pendingAc.current = null; pick(hit.hex); }
    else if (Date.now() > p.until) pendingAc.current = null;
  }, [allRows, pick]);

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
        style={StyleSheet.absoluteFill}
        {...(typeof MAP_STYLE === 'string' ? { styleURL: MAP_STYLE } : { styleJSON: JSON.stringify(MAP_STYLE) })}
        compassEnabled={false}
        logoEnabled={false}
        attributionPosition={{ bottom: insets.bottom + 2, right: 6 }}
        pitchEnabled={false}
        onPress={() => setSelectedHex(null)}
      >
        <Camera ref={camera} defaultSettings={{ centerCoordinate: [station.lon, station.lat], zoomLevel: START_ZOOM }} maxZoomLevel={14} />
        {weatherTiles && (
          <RasterSource id="weather" tileUrlTemplates={[weatherTiles]} tileSize={256} maxZoomLevel={7}>
            <RasterLayer id="weather-layer" style={{ rasterOpacity: 0.4 }} />
          </RasterSource>
        )}
        <ShapeSource id="rings" shape={ringsGeoJSON}>
          <LineLayer
            id="rings-line"
            style={{
              lineColor: theme.accent,
              lineWidth: 1,
              lineOpacity: ['case', ['get', 'outer'], 0.55, 0.22],
            }}
          />
        </ShapeSource>
        <ShapeSource id="nearest-line" shape={nearestLineGeoJSON}>
          <LineLayer id="nearest-line-layer" style={{ lineColor: theme.accent, lineWidth: 2, lineDasharray: [3, 3] }} />
        </ShapeSource>
        <MarkerView id="station" coordinate={[station.lon, station.lat]} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={[s.station, { borderColor: theme.accent, backgroundColor: theme.bg }]} />
        </MarkerView>
        {airports.map((a) => (
          <MarkerView key={a.code} id={`apt-${a.code}`} coordinate={[a.lon, a.lat]} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={{ alignItems: 'center' }} pointerEvents="none">
              <Text style={{ fontSize: 13 }}>{a.mil ? '✈️' : '🛩️'}</Text>
              <Text style={{ color: a.mil ? AMBER : theme.dim, fontSize: 9, fontWeight: '700' }}>{a.code}</Text>
            </View>
          </MarkerView>
        ))}
        {drawRows.map((r) => (
          <PlaneMarker
            key={r.hex}
            hex={r.hex}
            lat={r.lat as number}
            lon={r.lon as number}
            heading={r.track ?? 0}
            label={(r.flight || '').trim() || r.r || r.hex.toUpperCase()}
            nearest={r.hex === nearest?.hex}
            accent={theme.accent}
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
          <RoundBtn glyph="📰" onPress={() => setShowSummary(true)} theme={theme} label="Today's AI summary" />
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

      {followHex && (
        <View style={[s.chip, { top: insets.top + (banner ? 108 : 58), backgroundColor: theme.card, borderColor: followLostAt.current ? ALERT : theme.accent }]}>
          <Text style={{ color: followLostAt.current ? ALERT : theme.accent, fontWeight: '700', fontSize: 12 }}>
            {followLostAt.current ? '🎯 Signal lost, holding position' : `🎯 Following ${(allRows.find((r) => r.hex === followHex)?.flight || '').trim() || followHex.toUpperCase()}`}
          </Text>
          <Pressable onPress={stopFollow} hitSlop={10}><Text style={{ color: theme.text, fontWeight: '700', fontSize: 12, marginLeft: 14 }}>Stop</Text></Pressable>
        </View>
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
            following={followHex === sheetRow.hex}
            onFollow={() => (followHex === sheetRow.hex ? stopFollow() : startFollow(sheetRow.hex))}
            onShare={() => shareAircraft(sheetRow, settings, station)}
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
      <SettingsModal visible={showSettings} settings={settings} theme={theme} onChange={updateSettings} onClose={() => setShowSettings(false)} station={station} />
      <DailySummaryModal visible={showSummary} theme={theme} onClose={() => setShowSummary(false)} />
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
  chip: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },
  nearest: { borderWidth: 1, borderRadius: 16, padding: 14 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  station: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});
