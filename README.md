# Aero Sentry (React Native / Expo)

Native iPhone/Android client for the live ADS-B radar. It talks to the same self-hosted backend as the web app
(`cors-proxy/server.js` in radar-sudo-88/radar): `/v2/point/...` for the feed and `/api/aircraft-info` for the Gemini aircraft profile
(the Gemini key stays on the server). Default backend is `https://aero-sentry.co.uk`; override with
`EXPO_PUBLIC_API_BASE`.

## Features
- Live map with range rings, altitude-coloured, track-rotated aircraft (Apple Maps / Google Maps)
- Military detection (same rules as the web app), UK squawk decoder, emergency / military / rare-aircraft banners + haptics
- Detail sheet: route (adsbdb), stats, AI profile (Gemini)
- Filters (operator, type, squawk, military-only), units, themes, UK postcode location

## Run
```sh
npm install
npx expo start        # dev server (map works in Expo Go)
```

## iOS build without a Mac
`codemagic.yaml` builds an unsigned IPA on Codemagic and, if a `GITHUB_TOKEN` variable group named
`github` exists, attaches it to a GitHub Release for sideloading with Sideloadly.

## Android
Same codebase. No API keys: Android renders free CARTO dark tiles (OpenStreetMap data) via `UrlTile`, iOS uses Apple Maps.
The `aero-sentry-android` Codemagic workflow builds an installable APK (debug-keystore signed) and attaches it to a
GitHub Release when `GITHUB_TOKEN` is set in the `github` variable group.
