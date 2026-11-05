# Production ML path (reference only)

**This directory is not wired into the web app.** The demo runs `src/engine`, a deterministic on-device rule engine.
These files show the intended production shape and are deliberately kept separate so nobody mistakes a training script
for a validated model.

## Why the split exists

| | Rule engine (`src/engine`) | Transformer (`ml/`) |
| --- | --- | --- |
| Runs | In the browser, offline | Server or on-device runtime with weights |
| Needs training data | No | Yes, including Ghanaian annotated data |
| Explainability | Phrase-level by construction | Post-hoc (attention/occlusion), weaker |
| Auditability | Read the file | Needs model cards, eval harness, versioning |
| Data leaves device | Never | Yes, unless on-device inference |
| Status here | Shipping in the demo | Reference implementation, unvalidated |

The rule engine is the baseline a transformer must beat **on Ghanaian data**, not on GoEmotions.

## `train_emotion.py`

Fine-tunes a RoBERTa-family encoder for multi-label emotion classification on GoEmotions (27 emotions + neutral),
optionally mixed with a consented clinical corpus at a configurable ratio.

```bash
pip install -r requirements.txt
python train_emotion.py \
  --model roberta-base \
  --output models/roberta-goemotions \
  --epochs 3 --batch-size 16 --lr 2e-5 \
  --clinical-jsonl data/ghana_consented.jsonl \
  --clinical-weight 0.35
```

Outputs `metrics.json` with per-class precision/recall/F1, macro-F1, a confusion matrix and — because this is a mental
health product — a `safety` block reporting recall on the `sadness`, `grief`, `nervousness` and `fear` classes
separately. A model that improves macro-F1 while degrading those classes should not ship.

**Non-negotiable before use:**

1. Ethical approval and consent for any Ghanaian clinical text.
2. Native-speaker annotation for Pidgin/Twi/Ga/Ewe; do not machine-translate the corpus.
3. Evaluation on a held-out Ghanaian set, with a safety audit of missed high-risk cases.
4. The rule-based risk pass stays in front of the model as a safety overlay. Never let a transformer alone decide whether
   a person is safe.

## `serve.py`

FastAPI service exposing `/analyze` with the same field names as the TypeScript engine (`compound`, `emotions`, `risk`,
…) so the front end can switch implementations without a contract change.

```bash
uvicorn ml.serve:app --host 0.0.0.0 --port 8080
```

`risk` is returned with `decided_by: "rule_overlay"` and an explicit `note` that the transformer does not decide safety.
That is intentional: it makes it hard for a future engineer to quietly delete the safety layer.

## Datasets

- **GoEmotions** — 58k English Reddit comments, 27 emotions + neutral (Demszky et al., 2020).
- **Mental Health Reddit corpora** — risk phrasing and help-seeking language; not prevalence data, not Ghanaian.
- **PHQ-9 / GAD-7 response data** — thresholds and bands; screeners, not diagnoses.
- **Ghanaian English/Pidgin corpus** — does not exist publicly at usable quality yet. Building it is Stage 2/8 work in
  `docs/ROADMAP.md`, and it is the actual moat for a product like this.

## Deployment notes

- Prefer on-device inference (distilled/quantised encoder via ONNX Runtime Mobile or TFLite) over sending journals to a
  server. If a server is used, entries must be encrypted in transit and at rest, not logged, and deleted on a schedule.
- Log the model version with every reading so a safety incident can be reconstructed.
- Keep the rule layer's lexicon and pattern versions in the reading payload too (`analysis.version` already does this).
