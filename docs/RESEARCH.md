# Research notes — Nkommo

*Compiled November 2026. Narrative review, not a systematic one. All figures below are sourced; the implications and
decisions are ours.*

---

## 1. Problem definition

**Statement:** Mental health is stigmatised in Ghana; many people suffer silently; there is a need for a private,
accessible tool that can detect emotional distress early.

That sentence contains three separable claims, and the design changes depending on which one you take seriously:

1. **Prevalence is high.** A nationwide PHQ-9 survey of 5,202 respondents found 32.2% screening positive for probable
   depression (women 34.0%, men lower; inverse educational gradient) [1]. National estimates using ICD-10 criteria put
   point prevalence nearer 10–12% of adults [2], while student populations reach 39% in Greater Accra and 58–69% in
   northern senior high schools [2]. Prevalence is instrument- and population-dependent; the range, not a single number,
   is the honest finding.
2. **Care is scarce.** Ghana has ~39 psychiatrists (0.13 per 100,000) and 244 psychologists (0.78 per 100,000) against an
   estimated 2.3 million people needing care; services concentrate in the south, and treatment gaps exceed 85% in some
   areas, with only 42% of primary care workers feeling prepared for mental health cases [3][4].
3. **Disclosure is costly.** Stigma, spiritual attribution and fear of family reputational damage suppress help-seeking.
   This is the claim that most shapes a software product: a tool that requires public identification will be used by the
   people who need it least.

**Design consequence:** privacy is not a feature bolted on for compliance. It is the intervention. On-device analysis,
no account, alias-first onboarding, and a plain-language shared-phone threat model.

---

## 2. Measurement: what screeners can and cannot tell you

| Instrument | Structure | Thresholds | Evidence |
| --- | --- | --- | --- |
| PHQ-9 | 9 items × 0–3 = 0–27, mapped to DSM depression criteria | ≥10: ~88% sensitivity and specificity | Kroenke et al., 2001 [7] |
| PHQ-9 item 9 | Single item on death/self-harm thoughts | Any score ≥1 warrants follow-up regardless of total | validated against structured risk assessment: sensitivity ≈92%, specificity ≈81% [9] |
| GAD-7 | 7 items × 0–3 = 0–21 | 5 / 10 / 15 = mild / moderate / severe | Spitzer et al., 2006 [8] |

**Decisions taken:**

- Use both instruments verbatim (they are public domain), with plain-language helpers written for a first-time reader.
- Gate item 9 in code: `safetyFlag = item9 >= 1`, tested.
- Never present a score as diagnosis. Show the band, the advice and the *next human step*.
- Report trends only as change, not as prognosis.

**What this does not solve:** screeners detect *symptoms*, not *causes*; performance falls in low-prevalence populations
(positive predictive value is prevalence-dependent); and a screener cannot assess risk on its own.

---

## 3. Text analysis: why a hybrid, explainable baseline

### 3.1 VADER (lexicon + rules)

Hutto & Gilbert (2014) report F1 0.96 on tweets with a ~7,500-token valence lexicon plus five rule families:
capitalisation, punctuation, degree modifiers, contrastive conjunctions and trigram negation [5]. Its documented limits —
sarcasm taken literally, three-token negation window, English-only, domain vocabulary gaps — are exactly the failure modes
a mental health journal would care about.

### 3.2 Transformers

GoEmotions (58k Reddit comments, 27 emotions + neutral) reports BERT mean F1 0.46 fine-grained, 0.64 on Ekman groups and
0.69 on sentiment; performance is highest where lexical markers are overt (gratitude 0.86) and lowest on implicit
emotions (grief 0.00, relief 0.15) [6]. The corpus is English Reddit, annotated largely by Indian English speakers, with
heavy class imbalance. A Ghanaian deployment cannot inherit its validity.

### 3.3 The decision

Ship the auditable baseline; specify the transformer as the production path once Ghanaian labels exist. Concretely:

- Rules are explainable to the writer, which matters more than two points of F1 in a product that asks for trust.
- Rules run offline, on cheap devices, with no data leaving the browser.
- The baseline becomes the thing a transformer must beat, on a Ghanaian test set, before replacing it.

### 3.4 Ghanaian English and Pidgin

Standard lexicons read "I don tire for this life" as neutral, `wahala` as unknown, and "my head dey pain me" as nothing.
The build therefore carries a hand-written seed layer (~90 Ghanaian tokens and phrases), including somatic idioms that are
common first presentations of distress. It is explicitly provisional: no native-speaker annotation panel yet, and the app
flags Twi/Ga/Ewe/Hausa input as limited coverage rather than guessing.

### 3.5 Risk language

Risk detection is separated from sentiment on purpose. A person can write "I laughed with my friends today but I still
want to die" — the sentiment is mixed, the risk is unambiguous. Three tiers:

| Tier | Examples of trigger language | Product behaviour |
| --- | --- | --- |
| urgent | stated intent, plan, means at hand, recent act, farewell/preparatory language | crisis card opens immediately, above the entry, with helplines |
| elevated | ideation without plan, burdensomeness, "no reason to live", exhaustion with living | crisis card, softer framing, safety plan offered |
| watch | passive hopelessness, entrapment, "cannot go on" | risk badge, pattern-level attention |

Suppression is sentence-level and **disclosed**: protective statements ("I do not want to die, I just want the pain to
stop"), idioms ("to die for", "killing it", "when I die…") and general discussion ("suicide awareness training") are
explained to the writer rather than silently zeroed.

Third-party risk ("my friend wants to die") is attributed to the other person: it produces watch-level guidance and
help-a-friend content, not a flag on the writer's record.

---

## 4. Datasets considered

| Dataset | What it is good for | Why it is not enough here |
| --- | --- | --- |
| GoEmotions [6] | Fine-grained emotion taxonomy, negative-class design | English Reddit; annotator demographics not Ghanaian; imbalance |
| Mental Health Reddit corpora | Risk phrasing, triage language | Self-selected online population; no prevalence inference; US help-seeking norms |
| PHQ-9 / GAD-7 response data | Bands, thresholds, item-9 gating | Screens, not diagnoses; performance varies by setting |
| Ghanaian English/Pidgin seed lexicon (this repo) | Local phrasing | Hand-written, small, unvalidated by native-speaker panel |

**Not used, deliberately:** no real journal entries, no scraped Ghanaian social media, no patient records. The sample data
in the app is fictional. A production corpus would require consent, ethics approval and a native-speaker annotation
protocol (see `docs/ROADMAP.md` Stage 2 and 8).

---

## 5. Design decision log

| # | Finding | Decision | Where it lives |
| --- | --- | --- | --- |
| 1 | Disclosure is dangerous | On-device analysis, no account, alias by default | `data/store.tsx`, onboarding |
| 2 | Distress is often somatic/Pidgin | Local lexicon + marker groups + explanatory evidence | `engine/lexicon.ts` |
| 3 | Item 9 is safety-critical | Independent gate, tested, crisis card on any ≥1 | `engine/checkins.ts` |
| 4 | VADER is sarcasm-blind | Disclose limits; route sarcasm to transformer roadmap | `pages/ModelCard.tsx` |
| 5 | Sentiment can mask risk | Separate risk pass; positive day cannot cancel danger | `engine/analyze.ts` |
| 6 | Idioms cause false alarms | Sentence-level suppression, visibly disclosed | `engine/lexicon.ts` |
| 7 | Risk may be about someone else | Subject attribution, third-party watch tier | `engine/analyze.ts` |
| 8 | Models miss things | "No safety signal" ≠ "you are safe"; limits stated in product | `pages/Landing.tsx`, README |
| 9 | Alerting someone is a serious act | Dry-run drafts only, consent toggle, 24h cooldown, no journal text | `pages/Trusted.tsx` |
| 10 | Silent periods are signal | Journaling-gap pattern after a low week | `engine/trends.ts` |
| 11 | Stigma is measurable in text | Shame/stigma marker group surfaced as context, not risk | `engine/trends.ts` |
| 12 | Shared phones are the real threat | Threat model page, export, erase, alias advice | `pages/Privacy.tsx` |

---

## 6. Evaluation

### 6.1 Method

- 82 hand-written cases in English and Ghanaian English/Pidgin, each labelled with a **mood band** (bright / steady /
  unsettled / heavy) and a **risk tier** (none / watch / elevated / urgent).
- 36 cases used during development; 30 written at the same time and held out; 16 written *after* tuning and run once as
  a blind check.
- Harness: `npm run eval` executes the shipping `analyse()` on every case, computes accuracy, macro-F1, per-class
  precision/recall, confusion matrices, band MAE, high-risk recall and lists every missed high-risk case.

### 6.2 Results

| Split | n | Risk accuracy | Risk macro-F1 | Urgent recall | Elevated+urgent recall | Mood accuracy | Mood MAE |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dev (tuned) | 36 | 88.9% | 0.803 | 80% | 100% | 77.8% | 9.7 |
| Test (held out) | 30 | 90.0% | 0.847 | 100% | 100% | 73.3% | 9.2 |
| Blind (first run) | 16 | 68.8% | 0.575 | **33%** | **60%** | 56.3% | 14.9 |
| Blind (after fixes, no longer blind) | 16 | 87.5% | 0.847 | 100% | 100% | 62.5% | 11.4 |

### 6.3 What the blind run exposed

The first genuinely blind run missed two of three urgent cases and one elevated case:

1. **Ongoing self-harm phrasing.** "I have been cutting myself" matched only the `elevated` self-harm pattern; the urgent
   pattern required present tense ("I cut myself"). Fixed by adding an ongoing-self-harm pattern.
2. **Stockpiling plus concealed planning.** "I keep buying pills and saving them. I know what I am planning." contained no
   death word, so it read as `none`. Fixed with `accumulating means` (elevated) and `i know what i am planning` (urgent)
   patterns.
3. **"Sleep and never wake up."** Missed entirely; added as `elevated`.

Those fixes were made *after* seeing blind errors, so the post-fix blind row above is not an unbiased estimate. The
first-run row is the honest one, and it is reproduced in the app's model card. This is the normal error-analysis loop —
publish the failure, fix it, add the case to the dev set — and it is the reason a 90% held-out number should not be read
as 90% in the world.

### 6.4 Known error modes

- **Ambivalent protective statements** ("I don't want to die, I just want the pain to stop") are down-triaged. A
  clinician would explore them.
- **Sarcasm** defeats the rules, as it defeats VADER.
- **Long paragraphs with reported speech** break the eight-token subject-attribution window.
- **Twi/Ga/Ewe/Hausa** are flagged as low coverage; they are not scored reliably.
- **Mood-band boundaries are subjective**; MAE is reported because accuracy alone hides near-misses.
- **Single annotator, in-house authoring.** No inter-rater reliability, no clinician adjudication.

### 6.5 What a real validation would require

1. Two independent annotators per item, adjudication of disagreements, Krippendorff's α reported.
2. A Ghanaian clinical panel (psychiatrists, psychologists, community mental health nurses) reviewing both labels and
   thresholds.
3. Prospective design: does a pattern flag predict PHQ-9 deterioration two weeks later?
4. A safety audit of every urgent case, including silent-screen misses.
5. Pre-registration and an external team holding the test set.

---

## 7. Product research that changed the UI

- **Onboarding is three skippable questions**, because a mental health app that demands a profile reproduces the
  disclosure cost it is trying to remove.
- **The reading is always expandable into phrases.** Trust in a mental health model depends less on accuracy claims than
  on being arguable.
- **The writer can override the band.** The human label is what the trend uses.
- **Crisis resources appear inside the composer**, before saving — not only on a separate page after the fact.
- **The trusted-contact feature is a dry run.** Draft, preview, copy. Sending is a human act until consent, relay
  encryption and escalation policy exist.
- **No streaks-as-guilt.** Streaks exist, but the copy never shames a gap; a gap after a low week is itself surfaced as a
  signal.

---

## 8. Ethics and regulation

- **Ghana Mental Health Act, 2012 (Act 846)** — confidentiality and dignified treatment obligations for people receiving
  mental health care; relevant to any feature that shares information with third parties.
- **Ghana Data Protection Act, 2012 (Act 843)** — even local-only processing is processing; a real deployment needs a
  lawful basis, a DPIA, retention rules and subject-access/deletion paths.
- **Consent for alerts** — a trusted contact must have agreed, and the writer must be able to revoke at any time.
- **No surveillance** — no analytics, no background monitoring, no employer/insurer access. Adding accounts later must be
  visible and reversible.
- **Do not optimise for engagement.** Session length is not a success metric here. The ideal outcome is that the person
  closes the app and talks to someone.

---

## 9. Limitations of this review

Narrative rather than systematic; time-boxed; English-language sources only; no Ghanaian grey literature review beyond
WHO/MHA materials; prevalence figures should not be averaged across instruments; the seed lexicon and the evaluation
corpus were written by the build team. Treat this document as a design rationale with citations, not as clinical evidence.

---

## References

1. Amenah MA, Fenny A, Akazili J, et al. *Estimating the prevalence, socioeconomic determinants, and health seeking
   behavior of individuals with depression in Ghana.* Scientific Reports 15, 22239 (2025).
   https://www.nature.com/articles/s41598-025-06134-2
2. *Prevalence and distribution of depression in Ghana: a nationwide survey using PHQ-9.* PLOS Mental Health (2026).
   https://journals.plos.org/mentalhealth/article?id=10.1371%2Fjournal.pmen.0000498
3. WHO Special Initiative for Mental Health — Ghana situational report (2021).
   https://cdn.who.int/media/docs/default-source/mental-health/special-initiative/who-special-initiative-country-report---ghana---2021.pdf
4. *Community mental health services in Ghana: integration challenges and opportunities.* Discover Public Health (2026).
   https://link.springer.com/article/10.1186/s12982-026-01480-6
5. Hutto CJ, Gilbert EE. *VADER: A parsimonious rule-based model for sentiment analysis of social media text.* ICWSM
   (2014). https://ojs.aaai.org/index.php/ICWSM/article/view/14550
6. Demszky D, et al. *GoEmotions: A dataset of fine-grained emotions.* ACL (2020). https://arxiv.org/abs/2005.00547
7. Kroenke K, Spitzer RL, Williams JBW. *The PHQ-9: validity of a brief depression severity measure.* J Gen Intern Med
   16(9):606–613 (2001).
8. Spitzer RL, Kroenke K, Williams JBW, Löwe B. *A brief measure for assessing generalized anxiety disorder: the GAD-7.*
   Arch Intern Med 166(10):1092–1097 (2006).
9. Studies validating PHQ-9 item 9 against structured suicide-risk assessment (e.g. C-SSRS), reporting sensitivity ≈92%
   and specificity ≈81%. See Simon GE, et al. *Does response on the PHQ-9 depression questionnaire predict subsequent
   suicide attempt or suicide death?* (2013) and related validation literature.
10. Mental Health Authority, Ghana — national helpline. https://www.mha-ghana.com/
11. Accra Psychiatric Hospital — contacts and emergency service. https://accrapsychiatrichospital.org/contacts/
