# Nkommo Mobile (Android & iOS — Expo / React Native)

Native mobile companion for **Nkommo** (*talk to me*), built with **Expo (React Native)** and directly sharing the deterministic TypeScript analysis, clinical screening, trend detection, and Ghana clinic-ranking modules from `../src/`.

## Shared Architecture (`@shared/*` → `../src/*`)

Both the website and the mobile app run the exact same core logic with zero code duplication:

| Shared Module | What it powers on mobile |
| --- | --- |
| `@shared/engine/analyze` | Offline VADER-style valence, Ghanaian English/Pidgin lexicon, 11 emotions, 3-tier safety pass, phrase-level explainability |
| `@shared/engine/checkins` | Public-domain **PHQ-9** & **GAD-7** screeners with independent item-9 safety gating |
| `@shared/engine/trends` | 14/30-day mood & distress series, streaks, weekly deltas, and evidence-backed pattern detection |
| `@shared/data/prompts` | Dynamic morning/evening reflection questions composed from recent entries (no suggestion chips) |
| `@shared/data/facilities` + `@shared/lib/geo` | Offline distance ranking across 17 psychiatric service points in all 16 regions of Ghana |
| `@shared/data/resources` | Toll-free 24/7 Ghana helplines (`0800 678 678`, `112`), 5-4-3-2-1 grounding, coping tips, and friend scripts |
| `@shared/lib/cloudModel` | Additive `mergeById` sync so JSON backups exported from the website import seamlessly onto the phone |

## Native Mobile Capabilities

- **On-device persistence (`AsyncStorage`)**: Starts completely empty (zero seed data). Exports and imports the exact same JSON backup shape as the web app.
- **Encrypted token storage (`expo-secure-store`)**: Optional Hugging Face tokens live in iOS Keychain / Android Keystore (never plaintext storage), and crisis entries are strictly blocked from leaving the phone.
- **Offline GPS clinic ranking (`expo-location`)**: Detects the user's region in Ghana on-device to rank the closest psychiatric units, with manual region selection fallback.
- **True scheduled daily reminders (`expo-notifications`)**: Schedules local OS daily notifications at `morningTime` and `eveningTime` on Android & iOS — works even when the app is closed, with neutral question copy only (never journal text).
- **Voice journalling (`expo-audio`)**: Native microphone capture + OS keyboard offline dictation support + optional `EXPO_PUBLIC_TRANSCRIBE_URL`.
- **1-tap crisis dialling & native share sheet**: Instant `tel:` dialling for `112` and `0800 678 678`, tactile haptics (`expo-haptics`) during 4-4-6 breathing, and native phone share sheet for Trusted Circle drafts and JSON backups.

## Run on Your Phone Immediately (Expo Go)

1. Install dependencies:
   ```bash
   cd mobile
   npm install
   ```
2. Start the Expo dev server:
   ```bash
   npm start
   ```
3. Install **Expo Go** on your Android (Google Play) or iPhone (App Store) and scan the QR code in the terminal.

### Other Commands

```bash
npm run android      # Launch on Android device / emulator
npm run ios          # Launch on iOS simulator (macOS)
npm run web          # Run interactive mobile preview in browser
npm run typecheck    # Strict TypeScript check across mobile + shared engine
npm run export:web   # Production Metro web bundle check
```

## Build Installable Android APK / App Store Releases (EAS Build)

`eas.json` is preconfigured with three profiles:

- **Direct-install Android `.apk`** (for testing or sideloading directly onto phones without Play Store):
  ```bash
  npx eas-cli build --platform android --profile preview
  ```
- **Production Play Store (`.aab`) / App Store (`.ipa`)**:
  ```bash
  npx eas-cli build --platform all --profile production
  ```
