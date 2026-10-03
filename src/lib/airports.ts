import { distanceNM } from './geo';

export interface Airport { code: string; name: string; lat: number; lon: number; mil: boolean }

// Same table as airportDatabase in the web app's app.js.
const MILITARY_AIRPORT_RE = /\bRAF\b|Air Base|Air Force Base|\bAFB\b/i;
const RAW: [string, string, number, number][] = [
  ['EGLL', 'London Heathrow, UK', 51.4700, -0.4543],
  ['EGKK', 'London Gatwick, UK', 51.1481, -0.1903],
  ['EGGW', 'London Luton, UK', 51.8747, -0.3683],
  ['EGSS', 'London Stansted, UK', 51.8860, 0.2389],
  ['EGCC', 'Manchester Airport, UK', 53.3537, -2.2750],
  ['EGBB', 'Birmingham Airport, UK', 52.4539, -1.7480],
  ['EGNX', 'East Midlands Airport, UK', 52.8311, -1.3281],
  ['EGPH', 'Edinburgh Airport, UK', 55.9500, -3.3725],
  ['EGPF', 'Glasgow Airport, UK', 55.8642, -4.4328],
  ['EGNT', 'Newcastle Airport, UK', 55.0375, -1.6917],
  ['EGVN', 'RAF Brize Norton, UK', 51.7500, -1.5836],
  ['EGUN', 'RAF Mildenhall, UK', 52.3617, 0.4864],
  ['EGVA', 'RAF Fairford, UK', 51.6822, -1.7900],
  ['EGXC', 'RAF Coningsby, UK', 53.0929, -0.1650],
  ['EGUL', 'RAF Lakenheath, UK', 52.4093, 0.5610],
  ['ETAR', 'Ramstein Air Base, Germany', 49.4369, 7.6003],
  ['EHAM', 'Amsterdam Schiphol, Netherlands', 52.3086, 4.7639],
  ['LFPG', 'Paris Charles de Gaulle, France', 49.0097, 2.5479],
  ['EDDF', 'Frankfurt Airport, Germany', 50.0379, 8.5622],
  ['EIDW', 'Dublin Airport, Ireland', 53.4213, -6.2701],
  ['LEMD', 'Madrid Barajas, Spain', 40.4983, -3.5676],
  ['LIRF', 'Rome Fiumicino, Italy', 41.8003, 12.2389],
  ['KJFK', 'New York JFK, USA', 40.6413, -73.7781],
  ['KLAX', 'Los Angeles International, USA', 33.9416, -118.4085],
  ['OMDB', 'Dubai International, UAE', 25.2532, 55.3657],
];

export const AIRPORTS: Airport[] = RAW.map(([code, name, lat, lon]) => ({ code, name, lat, lon, mil: MILITARY_AIRPORT_RE.test(name) }));

export function airportsNear(lat: number, lon: number, radiusNM: number): Airport[] {
  return AIRPORTS.filter((a) => distanceNM(lat, lon, a.lat, a.lon) <= radiusNM);
}

export function airportByCode(code: string | undefined): Airport | undefined {
  const c = (code || '').toUpperCase();
  return AIRPORTS.find((a) => a.code === c);
}
