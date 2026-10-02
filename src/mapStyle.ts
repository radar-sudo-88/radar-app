import type { StyleSpecification } from '@maplibre/maplibre-react-native';

// Free dark basemap: CARTO "dark_all" raster tiles built on OpenStreetMap data. No API key or account.
export const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#030704' } },
    { id: 'basemap', type: 'raster', source: 'basemap' },
  ],
};

export const START_ZOOM = 7.7; // roughly the 35 NM radar circle across the screen
