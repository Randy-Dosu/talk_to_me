# Delivery plan — nine stages

Each stage has an objective, the tools it needs, the artefacts it produces, and an exit criterion that can be checked by
someone else. Stages 0–7 are implemented in this repository. Stage 8 is a clinical research gate and cannot be completed
by a build team alone. Stage 9 is the production ML and delivery path.

**Status legend:** ✅ done · 🟡 partial / artefact only · ⛔ not started by design

---

## Tools inventory

| Layer | Tools actually used | Where |
| --- | --- | --- |
| App | React 19, TypeScript 5.9, Vite 8, React Router 7, Tailwind CSS 4, Recharts, lucide-react, date-fns, clsx | `package.json` |
| Type & UI | Fraunces + Inter variable fonts (self-hosted via @fontsource) | `src/index.css` |
| Engine | Pure TypeScript, no dependencies; deterministic rules | `src/engine` |
| Clinical | PHQ-9 (Kroenke 2001), GAD-7 (Spitzer 2006) — public domain | `src/engine/checkins.ts` |
| Testing | Vitest 5, Testing Library, jsdom, custom eval harness | `src/**/*.test.*`, `src/engine/eval` |
| Voice | Web Speech API with capability detection and typed fallback | `src/lib/useSpeech.ts` |
| Storage | `localStorage` + JSON export/wipe; no backend | `src/data/store.tsx` |
| ML reference | Python 3.11, PyTorch, Hugging Face Transformers/Datasets, scikit-learn | `ml/` |
| Serving reference | FastAPI, Uvicorn, Pydantic | `ml/serve.py` |
| Data sources | GoEmotions (58k, 27 emotions), Mental Health Reddit corpora, PHQ-9 response distributions, Ghanaian seed lexicon | `docs/RESEARCH.md` |
| Research | WHO Ghana situational report, PLOS Mental Health 2026, Scientific Reports 2025, VADER/GoEmotions papers | `src/data/citations.ts` |
| Safety content | Mental Health Authority helpline, 112, Accra Psychiatric Hospital, MindFreedom Ghana | `src/data/resources.ts` |

---

## Stage 0 — Research and problem framing ✅

**Objective:** replace the brief's assumptions with sourced evidence, and decide which claim drives the design.

**Work:** narrative review of Ghana prevalence, workforce, treatment gap and stigma; measurement properties of PHQ-9/GAD-7
and item 9; failure modes of VADER and transformer emotion models; dataset suitability.

**Artefacts:** `docs/RESEARCH.md`, `src/data/citations.ts`, in-app research page.

**Exit criterion:** every quantitative claim in the product has a citation and a caveat. Met.

---

## Stage 1 — Safety architecture and clinical instruments ✅

**Objective:** make the dangerous path the most carefully built one.

**Work:** three-tier risk model; sentence-level suppression with disclosure; third-person attribution; item-9 gating;
crisis content copy reviewed for tone (no lecturing, no blocking); helpline list; “no safety signal ≠ safe” language.

**Tools:** clinical literature, PHQ-9/GAD-7 item text, Ghanaian support organisations.

**Artefacts:** `src/engine/analyze.ts` (risk pass), `src/components/CrisisCard.tsx`, `src/data/resources.ts`,
`docs/SAFETY.md`.

**Exit criterion:** every urgent pattern is covered by a unit test; the crisis card appears before an entry is saved;
helplines render in under one tap from every page. Met (tests in `src/engine/engine.test.ts`).

---

## Stage 2 — Data, lexicon and annotation design 🟡

**Objective:** specify what the model learns from, and what it must not pretend to learn.

**Work:** taxonomy collapse from GoEmotions' 27 emotions to 11 that matter for mood tracking; Ghanaian English/Pidgin
seed lexicon (~90 entries); eight clinical marker groups; 82-case labelled corpus with dev/test/blind split; annotation
guideline sketch.

**Tools:** GoEmotions taxonomy, VADER lexicon conventions, Ghanaian idiom research.

**Not done:** native-speaker annotation panel, inter-rater reliability, Twi/Ga/Ewe/Hausa corpora, clinical adjudication.

**Exit criterion (this stage):** taxonomy and lexicon documented, corpus ≥80 cases with a held-out split. Met.

**Exit criterion (production):** 1,000+ entries, two annotators per item, α ≥ 0.7, clinician adjudication. Not met.

---

## Stage 3 — Analysis engine and explainability ✅

**Objective:** a reading that is fast, offline, deterministic and arguable.

**Work:** normalisation (contractions, Ghanaian spellings, emoji, elongation); VADER-style valence with negation,
intensifiers, contrast, emphasis; distress index from eight marker groups; 11-emotion distribution; confidence and
language-coverage labels; signal extraction for the “why” panel.

**Artefacts:** `src/engine/{normalize,lexicon,analyze}.ts`, `src/components/AnalysisPanel.tsx`, 18 engine unit tests.

**Exit criterion:** identical input yields identical output at a fixed timestamp; every signal can be traced to a quoted
phrase; no network calls in the engine. Met.

---

## Stage 4 — App shell, store and design system ✅

**Objective:** a product that feels like it was made for Accra, not ported to it.

**Work:** design tokens (paper, forest, clay, gold; Fraunces + Inter; adinkra field, kente strip); local-first store with
versioned schema; one-page signup (alias-friendly, skippable); routing, mobile navigation; privacy
controls (export, erase).

**Artefacts:** `src/index.css`, `src/components/*`, `src/data/store.tsx`.

**Exit criterion:** first-run to first saved entry in under 60 seconds; no account required anywhere. Met.

---

## Stage 5 — Journal, voice, check-ins and trends ✅

**Objective:** capture the signal that single-message tools miss.

**Work:** composer with live preview and auto crisis card; voice capture with capability detection and honest fallbacks;
PHQ-9/GAD-7 flows with completion gating and score explanation; 14/30-day mood chart; emotion distribution; pattern
detection (sustained low mood, direction of travel, rising anxiety, sleep, withdrawal, shame, check-in movement,
journaling gap, consistency, support).

**Artefacts:** `src/pages/{Journal,CheckIn,Trends}.tsx`, `src/engine/trends.ts`, `src/components/{Composer,MoodChart}.tsx`.

**Exit criterion:** a full user journey is covered by interaction tests (write → save → correct band → check in → see
pattern). Met.

---

## Stage 6 — Safety net: plan, helplines, trusted circle 🟡

**Objective:** detection that ends in a human.

**Work:** safety plan (warning signs, coping, people, places, reasons, professional support); grounding and breathing
exercises; help-a-friend scripts with copy-to-clipboard; trusted-contact consent flow; evidence-gated draft generation
(≥3 converging signals), preview-only delivery, 24h cooldown, no journal text.

**Not done:** actual delivery. Requires an encrypted relay, delivery provider, consent records, escalation policy, and a
human on-call rota. The UI states this plainly rather than faking a send.

**Exit criterion (this build):** draft content contains no journal text (tested); nothing leaves the device. Met.

---

## Stage 7 — Transparency, evaluation harness, research ✅

**Objective:** publish the evidence, including the embarrassing parts.

**Work:** CLI harness producing confusion matrices and per-class metrics into `report.json`; model card importing that
report (no hand-typed numbers); blind split with first-run results disclosed; research page; privacy threat model; this
roadmap.

**Artefacts:** `src/engine/eval/*`, `src/pages/{ModelCard,Research,Privacy}.tsx`, `docs/`.

**Exit criterion:** `npm run eval` regenerates every number shown in the app. Met.

---

## Stage 8 — Independent clinical validation ⛔

**Objective:** earn the right to make clinical-adjacent claims.

**Work (external):** ethics approval (Ghana Health Service / institutional review board); clinician panel; two-annotator
labelling with adjudication; prospective cohort testing whether patterns predict PHQ-9 change; safety audit of missed
urgent cases; pre-registration; publication.

**Tools:** REDCap or similar, statistician, clinical co-investigators, community advisory board including people with
lived experience.

**Exit criterion:** a published or pre-registered validation, with a safety audit, on Ghanaian participants. Not started.
**No claims in this repository should be treated as clinical evidence until this stage exists.**

---

## Stage 9 — Production ML, accounts and delivery ⛔

**Objective:** the version that could actually serve people at scale, without betraying Stage 1.

**Work:**

1. **Transformer path.** Fine-tune RoBERTa (or a multilingual model such as XLM-R) on GoEmotions plus consented Ghanaian
   data; keep the rule layer as a safety overlay and as the explainability surface; require the transformer to beat the
   rule baseline on a Ghanaian test set before it ships.
2. **Multilingual coverage.** Twi, Ga, Ewe, Hausa and Pidgin corpora annotated by native speakers — not machine
   translation. Until then, coverage warnings stay.
3. **Accounts, if ever.** End-to-end encrypted sync with keys held on-device; no server-side plaintext inference; explicit
   opt-in; a documented deletion path. Firebase Auth is only acceptable if the above holds.
4. **Alert delivery.** Encrypted relay, consented recipients, human escalation rota, quiet hours, rate limits, revocation
   that actually revokes.
5. **Native mobile.** Android-first (device spread in Ghana), on-device ASR, offline-first storage, Play Store data-safety
   disclosure.
6. **Operational.** Crash reporting with PHI scrubbing (or none), security review, DPIA under Act 843, incident response.

**Reference implementation in this repo:** `ml/train_emotion.py` and `ml/serve.py` show the intended model and API shape.
They are not wired into the demo.

**Exit criterion:** independent validation (Stage 8) plus a security review plus an ethics-approved delivery model.

---

## Risk register

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| A missed urgent case causes harm | Medium | Conservative tiering, no false all-clear language, publish misses, external safety audit before pilot |
| False alarms erode trust | Medium | Sentence-level suppression, writer override, evidence display |
| Stigma makes the app dangerous to use | High | On-device, alias-first, shared-phone threat model, export/erase |
| “AI says I'm fine” reassurance | Medium | Explicit limits in product and docs; never a single reassurance screen |
| Lexicon encodes builder bias | High | Provisional label, native-speaker annotation, published seed list |
| Shared phone exposes the journal | High | Threat model page, alias advice, erase, no background notifications |
| Regulatory exposure (Act 843, Act 846) | Medium | No accounts, no server, no third-party sharing in this build; DPIA required before pilot |
| Scope creep into diagnosis | Medium | Model card and README state non-diagnostic status repeatedly |

---

## What we would do with two more weeks

1. Native-speaker annotation workshop for the Pidgin/Twi lexicon (two annotators, adjudication).
2. Annotate 200 more entries with a clinician, expanding the test split and reporting inter-rater agreement.
3. Add a "help a friend" mode that is first-class rather than a section on the safety page.
4. Offline PWA install + Android wrapper with on-device speech, so it works without data.
5. Accessibility pass: screen-reader labels, 4.5:1 contrast audit, low-literacy reading level, Twi UI strings.
6. A tiny, optional, end-to-end encrypted export to a clinician PDF.


---

## Stage 7.5 — Location-aware referral and optional model conversation (built)

| Piece | State |
| --- | --- |
| `src/data/facilities.ts` — 17 service points, 16 regions, coordinates + verified phones only | ✅ |
| `src/lib/geo.ts` — haversine, ranking, region fallback, human-readable distance | ✅ tested |
| `src/lib/useGeoLocation.ts` — permission states: denied, unavailable, timeout, ready | ✅ tested |
| `src/lib/useLiveRegion.ts` — coordinate → region (`regionForPoint`), read on signup and settings | ✅ tested |
| `NearestHelp` in the crisis card and on `/safety` | ✅ |
| `src/lib/hfChat.ts` — chat-completions adapter, local-only gate, reply sanitiser | ✅ tested with a mocked endpoint |
| `/settings` — consent-gated token, model id, test connection, forget token | ✅ |

What production still needs:

1. **Verify the facility list** with the Mental Health Authority and add district-level sites. Current coordinates are
   town-centre approximations.
2. **A validated conversation model.** Any HF chat model is a general-purpose model; none of the mental-health-tuned
   checkpoints has been evaluated on Ghanaian English or Pidgin. Until it is, the on-device reflection stays default.
3. **A server-side proxy for model calls** if this ever ships to users: a token in the browser is a hobby-project
   pattern, not a product one. The proxy must also strip identifiers and enforce the crisis block server-side.
4. **Cost and abuse controls** (per-user quotas) before enabling a paid endpoint for the public.

---

## Stage 7.6 — Morning/evening prompter (built)

| Piece | State |
| --- | --- |
| `src/data/prompts.ts` — one short question per window, three variants each, date-seeded | ✅ tested |
| `src/lib/dayPrompter.ts` — windows, once-per-day dismissal, next-slot maths, clock formatting | ✅ tested |
| `src/lib/useReminders.ts` — opt-in Notification scheduler + permission hook | ✅ tested with jsdom |
| `DayPrompter` card in the chat at the top of each window | ✅ |
| Greeting replaced: no Akwaaba/Maakye/Maaha/Maadwo, one question instead | ✅ tested |
| `/settings` — toggle, both times, notification permission with copy about the tab limit | ✅ tested |

Prompt design rules:

- Questions only. No suggestions, no suggested answers, no advice, no diagnoses.
  The card offers only Write and dismiss; the composer is never filled in.
- One question per window, picked by date.
- Dismissal keyed by date + window; one prompt per window per day.
- The notification body is a question; no journal content leaves the page.

Production still needs: a service worker + push subscription if reminders must survive a closed tab, and
localisation of the question bank into Twi, Ga and Ewe with community review.

