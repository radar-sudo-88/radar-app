import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { POLL_MS, RADIUS_NM } from '../config';
import { Aircraft, Station } from '../types';
import { fetchAircraft, RateLimited } from './api';

export type FeedStatus = 'connecting' | 'live' | 'limited' | 'offline';

// Polls the radar feed while the app is foregrounded; backs off on errors / 429.
export function useRadar(station: Station | null) {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [status, setStatus] = useState<FeedStatus>('connecting');
  const [updatedAt, setUpdatedAt] = useState(0);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const stationKey = station ? `${station.lat},${station.lon}` : '';
  const first = useRef(true);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!station || !active) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = POLL_MS;
    if (first.current) first.current = false; else setStatus('connecting');

    const tick = async () => {
      try {
        const list = await fetchAircraft(station.lat, station.lon, RADIUS_NM);
        if (stop) return;
        setAircraft(list);
        setStatus('live');
        setUpdatedAt(Date.now());
        delay = POLL_MS;
      } catch (e) {
        if (stop) return;
        setStatus(e instanceof RateLimited ? 'limited' : 'offline');
        delay = Math.min(delay * 2, 30000);
      }
      if (!stop) timer = setTimeout(tick, delay);
    };
    tick();
    return () => { stop = true; if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationKey, active]);

  return { aircraft, status, updatedAt };
}
