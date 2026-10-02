import type { StyleSpecification } from '@maplibre/maplibre-react-native';

// Free basemap: standard OpenStreetMap tiles, no API key. (CARTO's dark tiles now demand a key.)
// The raster paint below darkens them to suit the radar theme.
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 18,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#030704' } },
    {
      id: 'basemap',
      type: 'raster',
      source: 'basemap',
      paint: {
        'raster-brightness-max': 0.36,
        'raster-saturation': -0.7,
        'raster-contrast': 0.25,
      },
    },
  ],
};

export const START_ZOOM = 8.4; // 35 NM radar circle roughly fills the screen width

// Optional: set EXPO_PUBLIC_MAPTILER_KEY (free MapTiler key, no card) for a proper dark vector map.
const KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY;
export const MAP_STYLE: StyleSpecification | string = KEY
  ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${KEY}`
  : OSM_STYLE;
