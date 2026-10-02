// UK squawk decoder, ported from the web app (UK AIP ENR 1.6).
export type SquawkKind = 'alert' | 'notable' | 'info';
export interface SquawkInfo { short: string; long: string; kind: SquawkKind }

const ALERTS: Record<string, SquawkInfo> = {
  '7500': { short: 'HIJACK', long: 'Hijacking or unlawful interference', kind: 'alert' },
  '7600': { short: 'RADIO FAILURE', long: 'Radio failure', kind: 'alert' },
  '7700': { short: 'EMERGENCY', long: 'General emergency', kind: 'alert' },
  '7777': { short: 'QRA / INTERCEPT', long: 'Quick Reaction Alert fighter intercept', kind: 'alert' },
};

const UK: Record<string, SquawkInfo> = {
  '7000': { short: 'VFR', long: 'VFR conspicuity code - no air traffic service requested', kind: 'info' },
  '7001': { short: 'MIL LOW-LEVEL', long: 'Military fixed-wing low-level conspicuity or climb-out', kind: 'notable' },
  '7002': { short: 'DANGER AREA', long: 'Working in or near a danger area', kind: 'info' },
  '7003': { short: 'RED ARROWS', long: 'Red Arrows transit or display', kind: 'notable' },
  '7004': { short: 'AEROBATICS', long: 'Aerobatics or a flying display in progress', kind: 'notable' },
  '7005': { short: 'HIGH-ENERGY', long: 'High-energy manoeuvres', kind: 'notable' },
  '7006': { short: 'TRA OPS', long: 'Autonomous operations inside a temporary reserved area', kind: 'notable' },
  '7007': { short: 'OPEN SKIES', long: 'Open Skies treaty observation aircraft', kind: 'notable' },
  '7010': { short: 'CIRCUIT', long: 'Flying in the aerodrome circuit (traffic pattern)', kind: 'info' },
  '7400': { short: 'DRONE LINK LOST', long: 'Unmanned aircraft has lost its control link', kind: 'notable' },
};

export function describeSquawk(code: string | undefined): SquawkInfo | null {
  if (!code) return null;
  return ALERTS[code] ?? UK[code] ?? null;
}

export const isAlertSquawk = (code: string | undefined) => !!code && code in ALERTS;
export const isEmergencySquawk = (code: string | undefined) => code === '7500' || code === '7600' || code === '7700';
