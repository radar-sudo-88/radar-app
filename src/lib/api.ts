import { API_BASE } from '../config';
import { Aircraft, AircraftInfo, DailyEntry, DailySummary, RouteInfo, Station } from '../types';

async function fetchTimeout(url: string, init: RequestInit = {}, ms = 12000): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

export class RateLimited extends Error {}

export async function fetchAircraft(lat: number, lon: number, radiusNM: number): Promise<Aircraft[]> {
  const res = await fetchTimeout(`${API_BASE}/v2/point/${lat}/${lon}/${radiusNM}`, { headers: { Accept: 'application/json' } });
  if (res.status === 429) throw new RateLimited();
  if (!res.ok) throw new Error(`feed ${res.status}`);
  const data = await res.json();
  const list: Aircraft[] = data.ac || data.aircraft || [];
  // Drop the feed's synthetic ground-station placeholder (hex all zeros / type TWR).
  return list.filter((a) => !/^0+$/.test(a.hex || '') && (a.t || '').toUpperCase() !== 'TWR' && Number.isFinite(a.lat) && Number.isFinite(a.lon));
}

export function normalizePostcode(raw: string): string | null {
  const compact = raw.replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (compact.length < 5 || compact.length > 7) return null;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export async function geocodePostcode(raw: string): Promise<Station | { error: string }> {
  const postcode = normalizePostcode(raw);
  if (!postcode) return { error: "That doesn't look like a UK postcode." };
  try {
    const res = await fetchTimeout(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { error: "Couldn't find that postcode." };
    const r = (await res.json())?.result;
    if (!r || !Number.isFinite(r.latitude) || !Number.isFinite(r.longitude)) return { error: "Couldn't find that postcode." };
    return { postcode, lat: r.latitude, lon: r.longitude };
  } catch {
    return { error: "Couldn't reach the postcode service." };
  }
}

export async function fetchRoute(callsign: string): Promise<RouteInfo | null> {
  try {
    const res = await fetchTimeout(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign.trim())}`, { headers: { Accept: 'application/json' } }, 8000);
    if (!res.ok) return null;
    const route = (await res.json())?.response?.flightroute;
    if (!route?.origin || !route?.destination) return null;
    const name = (p: any) => (p.name ? `${p.name}${p.municipality ? `, ${p.municipality}` : ''}` : '');
    return {
      fromCode: route.origin.iata_code || route.origin.icao_code || '',
      toCode: route.destination.iata_code || route.destination.icao_code || '',
      fromName: name(route.origin),
      toName: name(route.destination),
      toLat: Number.isFinite(Number(route.destination.latitude)) ? Number(route.destination.latitude) : undefined,
      toLon: Number.isFinite(Number(route.destination.longitude)) ? Number(route.destination.longitude) : undefined,
    };
  } catch {
    return null;
  }
}

export type ProfileResult =
  | { status: 'ok'; info: AircraftInfo | null }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

const PROFILE_ERRORS: Record<string, string> = {
  rate_limited: 'Too many lookups just now - wait a minute and try again.',
  ai_busy: 'Gemini is busy right now. Try again shortly.',
  ai_timeout: 'Gemini took too long to answer.',
};

// Same POST /api/aircraft-info contract as the web app; the Gemini key stays on the server.
export async function fetchProfile(ac: Aircraft): Promise<ProfileResult> {
  if (!/^[0-9A-Fa-f]{6}$/.test(ac.hex || '')) return { status: 'unavailable', message: 'No profile for simulated or non-ICAO contacts.' };
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const payload: Record<string, unknown> = { hex: s(ac.hex) };
  (['flight', 'r', 't', 'desc', 'ownOp', 'category'] as const).forEach((k) => {
    const v = s(ac[k]);
    if (v) payload[k] = v;
  });
  if (ac.year !== undefined && ac.year !== null && ac.year !== '') payload.year = ac.year;
  if (!payload.flight && !payload.r && !payload.t && !payload.desc) {
    return { status: 'unavailable', message: "This aircraft isn't broadcasting a type, registration or callsign." };
  }
  try {
    const res = await fetchTimeout(`${API_BASE}/api/aircraft-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    }, 90000);
    let data: any = null;
    try { data = await res.json(); } catch { /* non-JSON error page */ }
    if (res.ok && data?.ok === true) return { status: 'ok', info: data.info || null };
    if (data?.error === 'insufficient_data') return { status: 'unavailable', message: "Not enough broadcast data to look this aircraft up." };
    return { status: 'error', message: PROFILE_ERRORS[data?.error] || "Couldn't get an aircraft profile right now." };
  } catch (e: any) {
    return { status: 'error', message: e?.name === 'AbortError' ? 'Gemini took too long to answer.' : "Couldn't reach the radar server." };
  }
}

// ---------- Daily AI summary (same POST /api/daily-summary contract as the web app) ----------
export type SummaryResult =
  | { ok: true; summary: DailySummary; cached: boolean }
  | { ok: false; message: string };

const SUMMARY_ERRORS: Record<string, string> = {
  not_configured: "Daily summaries aren't set up on this server yet.",
  rate_limited: 'Too many requests just now - wait a minute and try again.',
  ai_busy: 'Gemini is busy right now. Try again shortly.',
  ai_timeout: 'Gemini took too long to answer.',
  daily_limit: 'The daily AI limit has been reached. Try again tomorrow.',
};

export async function fetchDailySummary(entries: DailyEntry[], force: boolean): Promise<SummaryResult> {
  try {
    const res = await fetchTimeout(`${API_BASE}/api/daily-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ entries, force }),
    }, 90000);
    let data: any = null;
    try { data = await res.json(); } catch { /* non-JSON error page */ }
    if (res.ok && data?.ok === true) return { ok: true, summary: data.summary || {}, cached: data.cached !== false };
    return { ok: false, message: SUMMARY_ERRORS[data?.error] || "Couldn't get a summary right now." };
  } catch (e: any) {
    return { ok: false, message: e?.name === 'AbortError' ? 'Gemini took too long to answer.' : "Couldn't reach the radar server." };
  }
}

// ---------- Aircraft photo (Planespotters) ----------
const photoCache = new Map<string, string | null>();

export async function fetchPhoto(ac: Aircraft): Promise<string | null> {
  const reg = (ac.r || '').trim();
  const type = (ac.t || '').trim();
  const key = reg || type || ac.hex;
  if (photoCache.has(key)) return photoCache.get(key) ?? null;
  const lookup = async (url: string): Promise<string | null> => {
    try {
      const res = await fetchTimeout(url, { headers: { Accept: 'application/json' } }, 8000);
      if (!res.ok) return null;
      return (await res.json())?.photos?.[0]?.thumbnail_large?.src ?? null;
    } catch { return null; }
  };
  let url: string | null = null;
  if (reg) url = await lookup(`https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`);
  if (!url && type) url = await lookup(`https://api.planespotters.net/pub/photos/icaotype/${encodeURIComponent(type)}`);
  photoCache.set(key, url);
  return url;
}

// ---------- Airline logo: ICAO prefix of the callsign (e.g. RYR123 -> RYR) ----------
export function airlineLogoCandidates(flight: string | undefined): string[] {
  const m = (flight || '').trim().toUpperCase().match(/^([A-Z]{3})\d/);
  if (!m) return [];
  const code = m[1];
  const base = 'https://raw.githubusercontent.com/Jxck-S/airline-logos/main';
  return [
    `${base}/custom_logos/${code}.png`,
    `${base}/flightaware_logos/${code}.png`,
    `${base}/radarbox_logos/${code}.png`,
    `https://content.airhex.com/content/logos/airlines_${code}_50_50_s.png?proportions=keep`,
  ];
}
