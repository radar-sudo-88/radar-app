const R_NM = 3440.065;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceNM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Ring of [lon, lat] points at a given radius (NM) around a centre, for drawing range rings.
export function circleCoords(lat: number, lon: number, radiusNM: number, steps = 96): [number, number][] {
  const out: [number, number][] = [];
  const d = radiusNM / R_NM;
  const la = rad(lat);
  const lo = rad(lon);
  for (let i = 0; i <= steps; i++) {
    const b = (2 * Math.PI * i) / steps;
    const lat2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
    const lon2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(lat2));
    out.push([(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  return out;
}
