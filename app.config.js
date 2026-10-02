// Android's map is Google Maps and needs an API key (Maps SDK for Android enabled).
// Set GOOGLE_MAPS_API_KEY in the build environment (Codemagic variable group "android").
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY || '' } },
  },
});
