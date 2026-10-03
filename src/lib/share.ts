import { Share } from 'react-native';
import { API_BASE } from '../config';
import { Settings, Station } from '../types';
import { Row } from './rows';
import { fmtAlt, fmtDist } from './units';

const DEFAULTS = { speed: 'kts', alt: 'ft', dist: 'nm', theme: 'green' } as const;

// Link into the web app, same query params as buildShareLink() in the web app's app.js.
export function buildShareLink(settings: Settings, station: Station | null, hex?: string): string {
  const q: string[] = [];
  const add = (k: string, v: string) => q.push(`${k}=${encodeURIComponent(v)}`);
  if (settings.shareLocation && station) add('pc', station.postcode);
  if (settings.speed !== DEFAULTS.speed) add('spd', settings.speed);
  if (settings.alt !== DEFAULTS.alt) add('alt', settings.alt);
  if (settings.dist !== DEFAULTS.dist) add('dst', settings.dist);
  if (settings.theme !== DEFAULTS.theme) add('theme', settings.theme);
  if (!settings.rareAlerts) add('rare', '0');
  if (hex && /^[0-9a-f]{6}$/i.test(hex)) add('ac', hex.toLowerCase());
  return `${API_BASE}/${q.length ? `?${q.join('&')}` : ''}`;
}

export function aircraftShareText(row: Row, settings: Settings): string {
  const callsign = (row.flight || '').trim() || row.hex.toUpperCase();
  const bits: string[] = [];
  if ((row.t || '').trim()) bits.push((row.t || '').trim());
  bits.push(`${fmtDist(row.distNM, settings.dist)} away`);
  if (typeof row.alt_baro === 'number') bits.push(`at ${fmtAlt(row.alt_baro, settings.alt)}`);
  return `Spotted ${callsign} (${bits.join(', ')}) on Aero Sentry`;
}

export async function shareAircraft(row: Row, settings: Settings, station: Station | null) {
  const url = buildShareLink(settings, station, row.hex);
  try { await Share.share({ message: `${aircraftShareText(row, settings)} ${url}`, url }); } catch { /* dismissed */ }
}

export async function shareSetup(settings: Settings, station: Station | null) {
  const url = buildShareLink(settings, station);
  try { await Share.share({ message: url, url }); } catch { /* dismissed */ }
}
