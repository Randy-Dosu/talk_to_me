# Safety protocol

This is the behaviour the product must hold, and the reasoning behind it. It is written to be read by a developer
changing the risk layer, and by a clinician reviewing it.

---

## 1. Red lines (must never happen)

1. **Never reassure.** The app must never say or imply "you are safe", "you are fine", or "no risk detected" in a way
   that closes a conversation. The wording is "no safety signal", followed by the limits of the reading.
2. **Never block writing.** A crisis card appears alongside the composer, never as a modal that traps the person or
   prevents saving.
3. **Never send anything without an explicit action by the writer.** Alerts are drafts in this build; production requires
   consent from both people and a revocable delivery mechanism.
4. **Never share journal text with a third party**, including a trusted contact, a clinician, or an analytics service.
5. **Never present a score as a diagnosis.** PHQ-9 and GAD-7 are screeners; the copy says so on every result.
6. **Never hide a suppression.** If risk language was explained away, the app says which phrase and why.
7. **Never claim coverage it does not have.** Twi/Ga/Ewe/Hausa input is labelled limited-coverage, not silently scored.

---

## 2. Risk tiers and expected behaviour

| Tier | Meaning | UI behaviour |
| --- | --- | --- |
| `none` | No risk language detected, or all risk language explained by protective/figurative context | Neutral badge; no crisis card; no reassurance copy |
| `watch` | Passive hopelessness, entrapment, "cannot go on"; or risk reported about someone else | Risk badge; pattern attention; help-a-friend guidance for third-party |
| `elevated` | Ideation without plan, perceived burdensomeness, no reason to live, exhaustion with living | Crisis card above the composer with helplines, softer framing, safety plan offer |
| `urgent` | Stated intent, plan, means at hand, recent act, farewell/preparatory language | Crisis card first, helplines as tap targets, safety plan, message template |

**Scoring consequences:** urgent caps mood score at 12 and floors distress at 92; elevated caps mood at 34; watch caps at
48. A positive day cannot cancel a risk match.

---

## 3. Suppression rules (and why they are visible)

A sentence-level match can be cancelled when:

- the writer explicitly disavows intent ("I do not want to die", "I have never been suicidal");
- the phrase is idiom ("to die for", "killing it", "tired I could die");
- the phrase is future or hypothetical ("when I die", "if I die");
- the writer is discussing the topic in general ("suicide prevention training").

Whenever this happens, `risk.suppressed` is true and `risk.suppressedBy` carries a plain-language reason. The analysis
panel shows it.

**Known weakness:** "I do not want to die, I just want the pain to stop" is both protective and high-risk. The engine
treats it as protective (correct for false-positive control, wrong for sensitivity). The test corpus labels it as
distress, and the UI never converts "no signal" into reassurance.

---

## 4. Third-party risk

"My friend wants to die" must not raise the writer's own tier. The subject classifier uses an eight-token window before
the match plus inline person cues. Third-party matches produce `watch` and guidance to help a friend, including the
instruction to call 112 if there is immediate danger and never to promise secrecy.

**Known weakness:** reported speech inside long paragraphs can be misattributed. Keep the window small and test it when
changing the engine.

---

## 5. Content and tone rules

- No moralising, no "just pray", no "think positive".
- No streak guilt, no red badges designed to alarm, no countdown timers.
- Plain language at roughly a first-year-secondary reading level; Pidgin and Twi greetings where natural.
- Faith is treated as a resource, not a rival: "I am praying about it and I am also seeing a health worker. Both."
- Crisis numbers are always tap targets (`tel:` links) and never hidden behind a menu.
- The app states its own limits in the same breath as its capabilities.

---

## 6. Resources carried in the app

| Resource | Number | Hours | Note |
| --- | --- | --- | --- |
| Mental Health Authority helpline | 0800 678 678 | 24/7 | Free, confidential |
| National emergency | 112 | 24/7 | Immediate danger |
| Accra Psychiatric Hospital | 0302 228 688 | 24/7 emergency | Castle Road, Accra |
| MindFreedom Ghana | +233 302 915 484 | Office hours | Peer support and advocacy |
| Mental Health Authority office | +233 27 443 5261 | Office hours | Referrals and complaints |

Sources: mha-ghana.com, accrapsychiatrichospital.org, public emergency-number listings. **Re-verify before any pilot and
ideally fetch from a maintained endpoint rather than hard-coding.**

---

## 7. What a clinician should review first

1. The risk pattern list in `src/engine/lexicon.ts` (`RISK_PATTERNS`) — especially severity ordering.
2. The suppression list (`RISK_SUPPRESSIONS`) — every entry can hide a real signal.
3. The tier-to-UI mapping in `src/components/CrisisCard.tsx` and the composer.
4. The item-9 gate in `src/engine/checkins.ts`.
5. The pattern thresholds in `src/engine/trends.ts` — what counts as "sustained" is a clinical judgement, currently set
   at three low days in seven and three converging signals for an alert.
6. The copy on the safety page for accuracy and tone.

---

## 8. Incident protocol (for a real deployment)

1. Any report of harm associated with the app goes to a named clinical lead within 24 hours.
2. Preserve the reading (locally, with consent), the pattern flags and the version numbers.
3. Publish a de-identified safety note within 30 days; add the case to the corpus.
4. If the failure is systematic, disable the affected tier/pattern rather than patching copy.
5. Never respond to an incident by adding reassurance language.

---

## 9. Emergency statement

Nkommo is not an emergency service. It cannot call for help, cannot detect a crisis it is not told about, and does not
run in the background. If you are in danger now, call **112** or **0800 678 678**.


---

## 10. Nearest-service recommendation

The app ranks a **bundled list** of Ghanaian mental-health services (17 sites, 16 regions) against a position the
person chooses to share. It is a ranking aid, not navigation.

| Rule | Why |
| --- | --- |
| Coordinates are approximate town-centre positions | A few hundred metres does not change which hospital is closest, but it is not a route. The UI says this. |
| Straight-line distance only | Travel time in Accra traffic can triple a 6 km trip. The UI says "straight-line, not travel time". |
| Phone numbers appear only where publicly verifiable | The three verified switchboards are Accra Psychiatric, Korle Bu and Komfo Anokye. Everywhere else the card points to **0800 678 678** rather than inventing a number. |
| The region comes from the live coordinate, not a form | The nearest regional centroid labels the region on signup, settings and the safety page. It is a label, not a boundary: border towns can be one region out. |
| Region fallback is first-class | Geolocation is blocked in many embedded browsers. Picking a region must give the same quality of answer, not a dead end. |
| Location is stored locally and never transmitted | There is no geocoding request, no map tile, no analytics event. "Forget" clears it. |
| The card never replaces the helpline | Numbers come first; the clinic is the second step, with "call before you travel". |

**Not done, deliberately:** no turn-by-turn directions, no "open now" claim, no real-time bed availability. Each of those
requires a maintained data source and a service-level commitment the project cannot make yet. See ROADMAP Stage 8.

## 11. Third-party model egress (Hugging Face)

Model replies are **off by default**. When enabled in Settings:

1. `maySendToModel()` must pass: risk tier `none`/`watch`, **no** risk-pattern matches, and no match against a
   self-harm keyword backstop that also covers phrasing the tiering scores as `none` (e.g. "how I would do it").
   Failing any of those, the entry is never sent — the local crisis path handles it.
2. The system prompt forbids diagnosis, medication, instructions and advice; the reply is capped at three sentences.
3. `sanitizeReply()` drops any reply containing a diagnostic claim ("you have depression") and rejects empty output.
4. The token lives in **sessionStorage** only, and "turn off and forget" clears it.
5. Failures (401/429/timeout/no network) fall back to the on-device reflection and **say so** under the message.

The privacy promise changes when this is on, so the consent copy says that in plain words before the toggle can be
enabled. The product default remains: nothing leaves the device.

## 12. Prompts and notifications

The morning and evening prompts are **one short question**, not coaching and not
a menu of suggestions. Nothing is offered for the person to tap and send; the
box is always theirs to fill.

- **One question, three variants per window.** Chosen by the date so the app does
  not read as a script. Every variant is a question of 40 characters or fewer and
  contains no instruction, no reframe and no suggested answer. Tests assert the
  question mark, the length and the absence of advice phrasing.
- **No suggestion chips.** The earlier build offered starter questions as
  tappable chips; they were removed. The card offers only **Write** (focus the
  composer) and dismiss.
- **Once per window.** Dismissal is keyed by local date + window in
  `localStorage` (`nkommo.slotHints.v1`); a slot cannot re-fire the same day.
- **Time windows.** Morning 05:00–12:00, evening 17:00–24:00, local clock. The
  card only appears inside those windows.
- **No data in notifications.** The notification body is the same question.
  Journal text, mood bands and risk tiers never enter a notification.
- **No push service.** There is no service worker, no subscription and no
  account. A notification fires only while the tab is open; when permission is
  blocked or unsupported the in-app card is the fallback, and Settings says so.
