import { altitudeColor } from '../theme';
import { Aircraft, Settings } from '../types';
import { bearingDeg, distanceNM } from './geo';
import { isMilitary } from './military';

export interface Row extends Aircraft {
  distNM: number;
  bearing: number;
  mil: boolean;
  color: string;
}

export function buildRows(list: Aircraft[], lat: number, lon: number): Row[] {
  return list
    .map((a) => ({
      ...a,
      distNM: distanceNM(lat, lon, a.lat as number, a.lon as number),
      bearing: bearingDeg(lat, lon, a.lat as number, a.lon as number),
      mil: isMilitary(a),
      color: altitudeColor(a.alt_baro),
    }))
    .sort((x, y) => x.distNM - y.distNM);
}

const tokens = (s: string) => s.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);

// Same filter semantics as the web app: emergencies always show, MIL-only hides the rest.
export function applyFilters(rows: Row[], s: Settings): Row[] {
  const ops = tokens(s.filterOperator);
  const types = tokens(s.filterType);
  const sqs = tokens(s.filterSquawk);
  return rows.filter((r) => {
    const emergency = r.squawk === '7500' || r.squawk === '7600' || r.squawk === '7700' || r.squawk === '7777';
    if (emergency) return true;
    if (s.milOnly && !r.mil) return false;
    if (ops.length && !ops.some((o) => (r.flight || '').toUpperCase().startsWith(o))) return false;
    if (types.length && !types.some((t) => (r.t || '').toUpperCase().includes(t))) return false;
    if (sqs.length && !sqs.some((q) => (r.squawk || '').startsWith(q))) return false;
    return true;
  });
}
