import AsyncStorage from '@react-native-async-storage/async-storage';
import { Aircraft, DailyEntry, DailySummary } from '../types';
import { isMilitary } from './military';
import { isEmergencySquawk } from './squawk';

const LOG_PREFIX = 'radar.dailylog.';
const SUMMARY_PREFIX = 'radar.dailysummary.';
const MAX_ENTRIES = 200;

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function loadDailyLog(): Promise<DailyEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(LOG_PREFIX + todayKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// Drops logs / cached summaries from earlier days so storage doesn't grow forever.
export async function pruneOldDailyLogs() {
  try {
    const today = todayKey();
    const keys = await AsyncStorage.getAllKeys();
    const stale = keys.filter((k) =>
      (k.startsWith(LOG_PREFIX) && k !== LOG_PREFIX + today) || (k.startsWith(SUMMARY_PREFIX) && k !== SUMMARY_PREFIX + today));
    if (stale.length) await AsyncStorage.multiRemove(stale);
  } catch { /* best effort */ }
}

// Mirrors recordDailyLogEntries() in the web app: only military / alert-squawk traffic, once per hex per day.
export function recordEntries(list: Aircraft[], log: DailyEntry[]): DailyEntry[] | null {
  if (!list.length || log.length >= MAX_ENTRIES) return null;
  const seen = new Set(log.map((e) => e.hex));
  const next = [...log];
  for (const ac of list) {
    if (next.length >= MAX_ENTRIES) break;
    const alert = isEmergencySquawk(ac.squawk) || ac.squawk === '7777';
    const mil = isMilitary(ac);
    if ((!alert && !mil) || !ac.hex || seen.has(ac.hex)) continue;
    seen.add(ac.hex);
    next.push({
      hex: ac.hex,
      t: (ac.t || '').trim() || null,
      desc: (ac.desc || '').trim() || null,
      category: mil ? 'military_other' : null,
      operator: (ac.ownOp || '').trim() || null,
      squawk: alert ? String(ac.squawk || '') : null,
      emergency: alert,
    });
  }
  return next.length === log.length ? null : next;
}

export async function saveDailyLog(log: DailyEntry[]) {
  try { await AsyncStorage.setItem(LOG_PREFIX + todayKey(), JSON.stringify(log)); } catch { /* best effort */ }
}

export interface CachedSummary { summary: DailySummary; cached: boolean }

export async function loadCachedSummary(): Promise<CachedSummary | null> {
  try {
    const raw = await AsyncStorage.getItem(SUMMARY_PREFIX + todayKey());
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export async function saveCachedSummary(c: CachedSummary) {
  try { await AsyncStorage.setItem(SUMMARY_PREFIX + todayKey(), JSON.stringify(c)); } catch { /* best effort */ }
}
