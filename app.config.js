// Optional: set GOOGLE_MAPS_API_KEY to use Google Maps on Android instead of the default free OSM tiles.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY || 'unused' } },
  },
});
