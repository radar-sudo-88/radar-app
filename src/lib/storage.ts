import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, Station } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  speed: 'kts', alt: 'ft', dist: 'nm', theme: 'green',
  rareAlerts: true, milOnly: false, showAirports: true, showWeather: true, shareLocation: true,
  filterOperator: '', filterType: '', filterSquawk: '',
  filterAltMin: '', filterAltMax: '', filterSpeedMin: '', filterSpeedMax: '',
};

const SETTINGS_KEY = 'radar.settings.v1';
const STATION_KEY = 'radar.station.v1';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}
export async function saveSettings(s: Settings) {
  try { await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* best effort */ }
}
export async function loadStation(): Promise<Station | null> {
  try {
    const raw = await AsyncStorage.getItem(STATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export async function saveStation(s: Station) {
  try { await AsyncStorage.setItem(STATION_KEY, JSON.stringify(s)); } catch { /* best effort */ }
}
