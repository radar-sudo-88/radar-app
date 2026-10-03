import { Settings, ThemeName } from '../types';

export interface ParsedLink {
  pc?: string;
  ac?: string;
  settings: Partial<Settings>;
}

function query(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const q = url.split('#')[0].split('?')[1];
  if (!q) return out;
  for (const part of q.split('&')) {
    const [k, v = ''] = part.split('=');
    try { out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch { /* skip malformed */ }
  }
  return out;
}

// Accepts the web app's share links (https://aero-sentry.co.uk/?pc=..&ac=..&theme=..) and the
// custom scheme (aerosentry://?ac=<hex>, aerosentry://aircraft/<hex>) with the same params.
export function parseLink(url: string): ParsedLink | null {
  const isWeb = /^https?:\/\/(www\.)?aero-sentry\.co\.uk(\/|\?|$)/i.test(url);
  const isScheme = /^aerosentry:/i.test(url);
  if (!isWeb && !isScheme) return null;
  const q = query(url);
  const settings: Partial<Settings> = {};
  if (q.spd === 'kts' || q.spd === 'mph' || q.spd === 'kmh') settings.speed = q.spd;
  if (q.alt === 'ft' || q.alt === 'm') settings.alt = q.alt;
  if (q.dst === 'nm' || q.dst === 'mi' || q.dst === 'km') settings.dist = q.dst;
  if (['green', 'ice', 'violet', 'mono'].includes(q.theme)) settings.theme = q.theme as ThemeName;
  if (q.rare === '0' || q.rare === '1') settings.rareAlerts = q.rare === '1';
  const pathHex = url.match(/^aerosentry:\/\/\/?aircraft\/([0-9a-f]{6})/i)?.[1];
  const ac = [q.ac, pathHex].find((v) => v && /^[0-9a-f]{6}$/i.test(v))?.toLowerCase();
  return { pc: q.pc?.trim() || undefined, ac, settings };
}
