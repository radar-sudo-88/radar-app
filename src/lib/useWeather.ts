import { useEffect, useState } from 'react';

const REFRESH_MS = 10 * 60 * 1000;

// Latest RainViewer radar frame as an XYZ tile template (free, no key). Refreshed every 10 minutes.
export function useWeatherTiles(enabled: boolean): string | null {
  const [tiles, setTiles] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) { setTiles(null); return; }
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        if (res.ok) {
          const data = await res.json();
          const frames = data?.radar?.past;
          if (frames?.length && !stop) setTiles(`${data.host}${frames[frames.length - 1].path}/256/{z}/{x}/{y}/2/1_1.png`);
        }
      } catch { /* keep the previous frame */ }
      if (!stop) timer = setTimeout(load, REFRESH_MS);
    };
    load();
    return () => { stop = true; if (timer) clearTimeout(timer); };
  }, [enabled]);
  return tiles;
}
