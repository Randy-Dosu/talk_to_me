# Backend: Firebase project, Firestore and the optional transcription function

Nkommo works with no backend: the journal, analysis and clinic ranking are all
local. Firebase is an **optional** sync layer, and this document is the setup
guide for it.

## What is in the repo

| File | Purpose |
| --- | --- |
| `firebase.json` | Firestore rules/indexes, hosting from `dist`, emulator ports, functions source |
| `.firebaserc` | Placeholder project alias (`nkommo-demo`) — replace with your project id |
| `firestore.rules` | Each user may read and write only `users/{their-uid}` and its subcollections |
| `firestore.indexes.json` | Empty; no composite indexes are needed |
| `src/lib/firebase.ts` | Lazy SDK bootstrap; reads `VITE_FIREBASE_*`, honours the emulator flag |
| `src/lib/cloudSync.ts` | Sign-in, backup, restore, erase (Firestore calls) |
| `src/lib/cloudModel.ts` | Pure mapping + merge rules (unit tested) |
| `src/lib/useCloud.ts` | React state for the Settings card, debounced auto-backup |
| `functions/index.js` | Reference `transcribe` + `health` HTTPS functions (Speech-to-Text) |
| `.env.example` | Every variable the client reads |

## Setup

1. Create a Firebase project and a Firestore database (production mode).
2. Authentication → Sign-in method → enable **Email/Password**. No email is sent
   by the app; there is no verification step at this stage.
3. Copy `.env.example` to `.env.local` and fill the web app config from
   Project settings → Your apps → Web.
4. Deploy the rules and hosting:

   ```bash
   npm run build
   npx firebase-tools deploy --only firestore:rules,hosting
   ```

5. Optional, for browsers without speech recognition:

   ```bash
   cd functions && npm install
   npx firebase-tools deploy --only functions
   ```

   Enable the Speech-to-Text API first. Then set `VITE_TRANSCRIBE_URL` to the
   deployed function URL and redeploy the site.

## Local emulators

```bash
npx firebase-tools emulators:start --only auth,firestore,functions
VITE_FIREBASE_EMULATOR=1 npm run dev
```

With the flag set, the client connects auth to `127.0.0.1:9099`, Firestore to
`:8080` and the emulator UI to `:4000`. The `.env.local` Firebase values still
need to be present (any syntactically valid values work against the emulator).

## Data model

```
users/{uid}
  version: 1
  updatedAt: ISO string
  settings: { displayName, language, remindersEnabled, morningTime, eveningTime }
  safetyPlan: { warningSigns[], copingSteps[], people[], places[], reasons[], professional }

users/{uid}/entries/{entryId}
  createdAt, text, source ('typed' | 'voice'), analysis, feltMood?

users/{uid}/checkins/{checkinId}
  scale ('PHQ9' | 'GAD7'), answers[], createdAt, scores…
```

Deliberately **not** uploaded: GPS coordinates and the derived region, the
trusted contact's phone number, the Hugging Face token (session-only anyway),
and the AI settings. `settingsForCloud` enforces that in code, and the unit
tests assert it.

## Behaviour

- **Off by default.** Sign-in does not upload anything. The "Back up
  automatically" switch, and the manual **Back up now** button, are the only
  paths that write to Firestore.
- **Restore is additive.** Entries are merged by id with the cloud copy winning
  on a clash; local entries the cloud has never seen are kept. Location,
  trusted contact and AI settings are preserved from the device.
- **Delete cloud copy** removes every entry, check-in and the root document.
  Signing out also switches auto-backup off.
- **Failure is silent-by-design for the journal.** If a backup fails, the
  local store is untouched and the Settings card shows the error.

## Limits and what is not built

- No offline persistence for Firestore (`enableIndexedDbPersistence` is not
  enabled); a failed write is reported, not queued.
- No cross-device conflict resolution beyond last-write-by-id, and no
  tombstones: deleting an entry locally does not delete its cloud document
  until **Delete cloud copy** is used.
- No account recovery, email verification, rate limiting or abuse controls.
  See `docs/ROADMAP.md` for what a production deployment needs.
- The functions are a reference implementation. They were syntax-checked, not
  deployed or executed against Google Cloud from this environment.
- Firestore rules are simple owner checks. They were reviewed by hand and are
  not covered by the emulator rule-test suite yet.
