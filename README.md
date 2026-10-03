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

## Builds (GitHub Actions)
Every push to `main` (or a manual run) builds an unsigned iOS IPA (`macos-latest`) and an installable Android APK
(`ubuntu-latest`) and attaches both to a GitHub Release. No secrets or variable groups needed. Sideload the IPA with
Sideloadly; install the APK directly.

## Maps
Both platforms use MapLibre (`@maplibre/maplibre-react-native`) with free OpenStreetMap tiles, darkened in-app.
No API keys, accounts or billing. Needs a dev build (not Expo Go).

## Legacy branch (Android 6+)

This branch targets Expo SDK 51 / React Native 0.74 / MapLibre RN 10 with `minSdkVersion 23`, so it runs on Android 6.0 and up. Same features as `main`; only the stack and the map API differ. iOS is not built from here, use `main`.
