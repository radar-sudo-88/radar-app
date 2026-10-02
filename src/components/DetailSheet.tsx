import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Row } from '../lib/rows';
import { fetchProfile, fetchRoute, ProfileResult } from '../lib/api';
import { describeSquawk } from '../lib/squawk';
import { fmtAlt, fmtDist, fmtRate, fmtSpeed } from '../lib/units';
import { AMBER, ALERT, Theme } from '../theme';
import { RouteInfo, Settings } from '../types';
import { Stat, Tag } from './ui';

// Per-session caches so re-selecting an aircraft doesn't re-hit Gemini / adsbdb.
const profileCache = new Map<string, ProfileResult>();
const routeCache = new Map<string, RouteInfo | null>();

interface Props {
  row: Row;
  lost: boolean;
  settings: Settings;
  theme: Theme;
  onClose: () => void;
  maxHeight: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  airliner: 'Airliner', regional_airliner: 'Regional airliner', cargo: 'Cargo', business_jet: 'Business jet',
  general_aviation: 'General aviation', helicopter: 'Helicopter', military_fighter: 'Military fighter',
  military_transport: 'Military transport', military_tanker: 'Military tanker', military_surveillance: 'Military surveillance',
  military_trainer: 'Military trainer', military_helicopter: 'Military helicopter', military_other: 'Military',
  glider_or_balloon: 'Glider / balloon', unmanned: 'Unmanned', other: 'Other',
};

export function DetailSheet({ row, lost, settings, theme, onClose, maxHeight }: Props) {
  const { hex } = row;
  const flight = (row.flight || '').trim();
  const [route, setRoute] = useState<RouteInfo | null | undefined>(routeCache.get(flight));
  const [profile, setProfile] = useState<ProfileResult | 'loading' | undefined>(profileCache.get(hex));

  useEffect(() => {
    let live = true;
    setRoute(routeCache.get(flight));
    if (flight && !routeCache.has(flight)) {
      fetchRoute(flight).then((r) => { routeCache.set(flight, r); if (live) setRoute(r); });
    }
    return () => { live = false; };
  }, [flight]);

  const loadProfile = (force = false) => {
    if (!force && profileCache.has(hex)) { setProfile(profileCache.get(hex)); return; }
    setProfile('loading');
    fetchProfile(row).then((r) => {
      if (r.status === 'ok') profileCache.set(hex, r); else profileCache.delete(hex);
      setProfile(r);
    });
  };
  useEffect(() => {
    setProfile(profileCache.get(hex));
    loadProfile(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex]);

  const sq = describeSquawk(row.squawk);
  const sqColor = sq?.kind === 'alert' ? ALERT : sq?.kind === 'notable' ? AMBER : theme.dim;
  const title = flight || row.r || hex.toUpperCase();

  return (
    <View style={[s.sheet, { backgroundColor: theme.card, borderColor: theme.border, maxHeight }]}>
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: row.color }]} numberOfLines={1}>{title}</Text>
          <Text style={{ color: theme.dim, fontSize: 12 }} numberOfLines={1}>
            {[row.desc || row.t, row.r].filter(Boolean).join(' · ') || 'Unknown type'}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {row.mil && <Tag text="MIL" color={AMBER} />}
            {sq && sq.kind !== 'info' && <Tag text={sq.short} color={sqColor} />}
            {lost && <Tag text="LOST CONTACT" color={theme.dim} />}
          </View>
        </View>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close details">
          <Text style={{ color: theme.dim, fontSize: 22 }}>✕</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
        {flight ? (
          <View style={[s.box, { borderColor: theme.border }]}>
            {route ? (
              <>
                <RouteRow label="From" code={route.fromCode} name={route.fromName} theme={theme} />
                <RouteRow label="To" code={route.toCode} name={route.toName} theme={theme} />
              </>
            ) : (
              <Text style={{ color: theme.dim, fontSize: 12 }}>{route === undefined ? 'Looking up route…' : 'No route on file for this callsign.'}</Text>
            )}
          </View>
        ) : null}

        <View style={s.grid}>
          <Stat label="Altitude" value={fmtAlt(row.alt_baro, settings.alt)} theme={theme} color={row.color} />
          <Stat label="Speed" value={fmtSpeed(row.gs, settings.speed)} theme={theme} />
          <Stat label="Heading" value={row.track !== undefined ? `${Math.round(row.track)}°` : '--'} theme={theme} />
          <Stat label="Vert rate" value={fmtRate(row.baro_rate, settings.alt)} theme={theme} />
          <Stat label="Distance" value={fmtDist(row.distNM, settings.dist)} theme={theme} />
          <Stat label="Bearing" value={`${Math.round(row.bearing)}°`} theme={theme} />
          <Stat label="Squawk" value={row.squawk || '--'} theme={theme} color={sq?.kind === 'alert' ? ALERT : undefined} />
          <Stat label="Type" value={row.t || '--'} theme={theme} />
          <Stat label="ICAO" value={hex.toUpperCase()} theme={theme} />
        </View>
        {sq?.long ? <Text style={{ color: theme.dim, fontSize: 12, marginBottom: 6 }}>Squawk {row.squawk}: {sq.long}</Text> : null}

        <View style={[s.box, { borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={[s.sec, { color: theme.accent }]}>AIRCRAFT PROFILE</Text>
            <Tag text="AI" color={theme.accent} />
          </View>
          <Profile profile={profile} theme={theme} settings={settings} onRetry={() => loadProfile(true)} />
        </View>
      </ScrollView>
    </View>
  );
}

function RouteRow({ label, code, name, theme }: { label: string; code: string; name: string; theme: Theme }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 2 }}>
      <Text style={[s.sec, { color: theme.dim, width: 44 }]}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 13, flex: 1 }} numberOfLines={1}>{code ? `${code} · ` : ''}{name || '--'}</Text>
    </View>
  );
}

function Profile({ profile, theme, settings, onRetry }: { profile: ProfileResult | 'loading' | undefined; theme: Theme; settings: Settings; onRetry: () => void }) {
  const dim = { color: theme.dim, fontSize: 12 } as const;
  if (!profile || profile === 'loading') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ActivityIndicator color={theme.accent} size="small" />
        <Text style={[dim, { marginLeft: 8 }]}>Asking Gemini…</Text>
      </View>
    );
  }
  if (profile.status !== 'ok') {
    return (
      <View>
        <Text style={dim}>{profile.message}</Text>
        {profile.status === 'error' && (
          <Pressable onPress={onRetry} style={[s.retry, { borderColor: theme.accent }]}>
            <Text style={{ color: theme.accent, fontWeight: '600', fontSize: 12 }}>Try again</Text>
          </Pressable>
        )}
      </View>
    );
  }
  const info = profile.info;
  if (!info || typeof info !== 'object') return <Text style={dim}>No reliable details found for this aircraft.</Text>;

  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const conf = info.confidence && ['high', 'medium', 'low'].includes(info.confidence) ? info.confidence : 'low';
  const confColor = conf === 'high' ? '#00ff66' : conf === 'medium' ? AMBER : ALERT;
  const facts = Array.isArray(info.notable_facts) ? info.notable_facts.map(str).filter(Boolean).slice(0, 3) as string[] : [];
  const cat = info.category ? CATEGORY_LABELS[info.category] : null;

  return (
    <View>
      {str(info.aircraft_name) && <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>{str(info.aircraft_name)}</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cat && <Tag text={cat.toUpperCase()} color={theme.dim} />}
        {str(info.manufacturer) && <Tag text={str(info.manufacturer)!.toUpperCase()} color={theme.dim} />}
      </View>
      {str(info.operator) && <RouteRow label="Operator" code="" name={str(info.operator)!} theme={theme} />}
      {str(info.summary) && <Text style={{ color: theme.text, fontSize: 13, lineHeight: 18, marginTop: 6 }}>{str(info.summary)}</Text>}
      <View style={s.grid}>
        {str(info.engines) && <Stat label="Engines" value={str(info.engines)!} theme={theme} />}
        {str(info.typical_capacity) && <Stat label="Capacity" value={str(info.typical_capacity)!} theme={theme} />}
        {num(info.cruise_speed_kts) !== null && <Stat label="Cruise" value={fmtSpeed(num(info.cruise_speed_kts)!, settings.speed)} theme={theme} />}
        {num(info.range_nm) !== null && <Stat label="Range" value={fmtDist(num(info.range_nm)!, settings.dist, 0)} theme={theme} />}
        {num(info.service_ceiling_ft) !== null && <Stat label="Ceiling" value={fmtAlt(num(info.service_ceiling_ft)!, settings.alt)} theme={theme} />}
        {num(info.introduced_year) !== null && <Stat label="Introduced" value={String(num(info.introduced_year))} theme={theme} />}
      </View>
      {facts.map((f, i) => (
        <Text key={i} style={{ color: theme.text, fontSize: 13, lineHeight: 18, marginTop: 2 }}>• {f}</Text>
      ))}
      <Text style={[dim, { marginTop: 8 }]}>
        <Text style={{ color: confColor, fontWeight: '700' }}>{conf} confidence</Text> · AI-generated by Gemini, so double-check anything important.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { borderWidth: 1, borderRadius: 16, padding: 14 },
  head: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
  box: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 4 },
  sec: { fontSize: 10, letterSpacing: 1.2, fontWeight: '700', textTransform: 'uppercase' },
  retry: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8 },
});
