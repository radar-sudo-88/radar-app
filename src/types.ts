export interface Aircraft {
  hex: string;
  flight?: string;
  r?: string;
  t?: string;
  desc?: string;
  ownOp?: string;
  year?: string | number;
  category?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | 'ground';
  gs?: number;
  track?: number;
  baro_rate?: number;
  squawk?: string;
  dbFlags?: number;
  db_flags?: number;
}

export type ThemeName = 'green' | 'ice' | 'violet' | 'mono';

export interface Settings {
  speed: 'kts' | 'mph' | 'kmh';
  alt: 'ft' | 'm';
  dist: 'nm' | 'mi' | 'km';
  theme: ThemeName;
  rareAlerts: boolean;
  milOnly: boolean;
  filterOperator: string;
  filterType: string;
  filterSquawk: string;
}

export interface Station {
  postcode: string;
  lat: number;
  lon: number;
}

export interface AircraftInfo {
  aircraft_name?: string;
  manufacturer?: string;
  operator?: string;
  category?: string;
  summary?: string;
  engines?: string;
  typical_capacity?: string;
  cruise_speed_kts?: number;
  range_nm?: number;
  service_ceiling_ft?: number;
  introduced_year?: number;
  notable_facts?: string[];
  confidence?: 'high' | 'medium' | 'low';
}

export interface RouteInfo {
  fromCode: string;
  toCode: string;
  fromName: string;
  toName: string;
}
