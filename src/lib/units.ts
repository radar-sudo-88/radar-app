import { Settings } from '../types';

export function fmtSpeed(kts: number | undefined, unit: Settings['speed']): string {
  if (kts === undefined || !Number.isFinite(kts)) return '--';
  if (unit === 'mph') return `${Math.round(kts * 1.15078)} mph`;
  if (unit === 'kmh') return `${Math.round(kts * 1.852)} km/h`;
  return `${Math.round(kts)} kts`;
}

export function fmtAlt(ft: number | 'ground' | undefined, unit: Settings['alt']): string {
  if (ft === 'ground') return 'Ground';
  if (ft === undefined || !Number.isFinite(Number(ft))) return '--';
  const n = Number(ft);
  return unit === 'm' ? `${Math.round(n * 0.3048).toLocaleString()} m` : `${Math.round(n).toLocaleString()} ft`;
}

export function fmtDist(nm: number | undefined, unit: Settings['dist'], digits = 1): string {
  if (nm === undefined || !Number.isFinite(nm)) return '--';
  if (unit === 'mi') return `${(nm * 1.15078).toFixed(digits)} mi`;
  if (unit === 'km') return `${(nm * 1.852).toFixed(digits)} km`;
  return `${nm.toFixed(digits)} NM`;
}

export function fmtRate(fpm: number | undefined, unit: Settings['alt']): string {
  if (fpm === undefined || !Number.isFinite(fpm)) return '--';
  if (Math.abs(fpm) < 100) return 'Level';
  const v = unit === 'm' ? Math.round(fpm * 0.3048) : Math.round(fpm);
  return `${fpm > 0 ? '▲' : '▼'} ${Math.abs(v).toLocaleString()} ${unit === 'm' ? 'm' : 'ft'}/min`;
}
