import { Aircraft } from '../types';

const CIVIL_EXCLUSIONS = ['MM16', 'B407', 'R22', 'R44', 'AS35', 'EC35', 'EC45', 'H125', 'H135', 'B206', 'C172', 'PA28', 'SR20', 'SR22', 'C152', 'DA40', 'DA42', 'AS50'];
const MIL_TYPES = ['F16', 'F15', 'F18', 'F35', 'F22', 'EF20', 'EUFI', 'TYPH', 'TOR', 'HAWK', 'A10', 'C130', 'C17', 'A400', 'K35R', 'E3TF', 'V22', 'CH47', 'AH64', 'UH60', 'NH90', 'P8', 'RC135', 'KC135'];
const MIL_PREFIXES = ['RRR', 'ASCOT', 'SHF', 'VORTEX', 'RCH', 'DUKE', 'BOOM', 'REACH', 'CNV', 'GUN', 'VIPER'];

// Ported 1:1 from isMilitary() in the web app's app.js.
export function isMilitary(ac: Aircraft): boolean {
  const type = (ac.t || '').toUpperCase();
  const flight = (ac.flight || '').toUpperCase();
  const reg = (ac.r || '').toUpperCase();
  const cat = (ac.category || '').toUpperCase();

  if (/^[BC][0-7]$/.test(cat)) return false;
  if (reg.startsWith('G-')) return false;
  if (CIVIL_EXCLUSIONS.some((ex) => type.includes(ex))) return false;
  if (MIL_TYPES.some((s) => (s === 'C17' ? type === 'C17' || type === 'C-17' : type.includes(s)))) return true;
  if (MIL_PREFIXES.some((p) => flight.startsWith(p))) return true;

  const dbFlags = ac.dbFlags ?? ac.db_flags ?? 0;
  if (dbFlags & 1) {
    if (reg.startsWith('G-') || reg.startsWith('N')) return false;
    return true;
  }
  return cat === 'A7' || cat === 'A6';
}

export const RARE_TYPES: Record<string, string> = {
  A388: 'Airbus A380', A3ST: 'Airbus Beluga', A337: 'Airbus Beluga XL', A124: 'Antonov An-124 Ruslan',
  AN22: 'Antonov An-22', BLCF: 'Boeing 747 Dreamlifter', B741: 'Boeing 747-100', B742: 'Boeing 747-200',
  B743: 'Boeing 747-300', VC10: 'Vickers VC10', SPIT: 'Supermarine Spitfire', HURI: 'Hawker Hurricane',
  LANC: 'Avro Lancaster', B17: 'B-17 Flying Fortress', B25: 'B-25 Mitchell', P51: 'P-51 Mustang', DC3: 'Douglas DC-3 Dakota',
};
export const RARE_SQUAWKS: Record<string, string> = { '7003': 'Red Arrows', '7007': 'Open Skies observation aircraft' };

export function rareLabel(ac: Aircraft): string | null {
  const t = (ac.t || '').toUpperCase();
  if (RARE_TYPES[t]) return RARE_TYPES[t];
  if (ac.squawk && RARE_SQUAWKS[ac.squawk]) return RARE_SQUAWKS[ac.squawk];
  return null;
}
