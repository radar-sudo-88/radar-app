// Backend = the same self-hosted server the web app uses (cors-proxy/server.js).
// Override at build time with EXPO_PUBLIC_API_BASE.
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://aero-sentry.co.uk';
export const RADIUS_NM = 35;
export const POLL_MS = 4000;
