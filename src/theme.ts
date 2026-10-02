import { ThemeName } from './types';

export interface Theme {
  label: string;
  accent: string;
  bg: string;
  card: string;
  border: string;
  dim: string;
  text: string;
}

export const THEMES: Record<ThemeName, Theme> = {
  green: { label: 'Green', accent: '#00ff66', bg: '#030704', card: 'rgba(5,15,9,0.96)', border: '#0f381f', dim: '#2b7a4b', text: '#c8ffd9' },
  ice: { label: 'Ice', accent: '#4dd0ff', bg: '#030608', card: 'rgba(5,10,16,0.96)', border: '#0f2f42', dim: '#2b6a85', text: '#d4f3ff' },
  violet: { label: 'Violet', accent: '#c792ff', bg: '#06030a', card: 'rgba(12,6,20,0.96)', border: '#2c1a45', dim: '#6a4a8c', text: '#ecdcff' },
  mono: { label: 'Mono', accent: '#e8e8e8', bg: '#050505', card: 'rgba(12,12,12,0.96)', border: '#2a2a2a', dim: '#7a7a7a', text: '#f2f2f2' },
};

export const ALERT = '#ff3333';
export const AMBER = '#ffb000';

const BANDS = [
  { maxFt: 3000, color: '#ff4d94', label: '< 3,000 ft' },
  { maxFt: 10000, color: '#ff9900', label: '3–10k ft' },
  { maxFt: 24000, color: '#ffe600', label: '10–24k ft' },
  { maxFt: 34000, color: '#00ff66', label: '24–34k ft' },
  { maxFt: Infinity, color: '#00bfff', label: '34k+ ft' },
];
export const ALT_BANDS = BANDS;

export function altitudeColor(alt: number | 'ground' | undefined): string {
  if (alt === undefined || alt === 'ground') return '#7a8a94';
  const n = Number(alt);
  if (Number.isNaN(n)) return '#7a8a94';
  return (BANDS.find((b) => n < b.maxFt) ?? BANDS[BANDS.length - 1]).color;
}
