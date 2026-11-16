"""Fine-tune a RoBERTa-family encoder for emotion classification.

Reference implementation for the Nkommo production path. It is intentionally
verbose about its own limitations:

  * GoEmotions is English Reddit, annotated largely by Indian English speakers.
    It does not represent Ghanaian English, Pidgin, Twi, Ga, Ewe or Hausa.
  * A model that improves macro-F1 while losing recall on sadness / grief /
    nervousness / fear is a regression for this product. Those classes are
    reported separately and gated in `safety_gate`.
  * No clinical text should be used without ethics approval and consent.

Usage:
    python train_emotion.py --model roberta-base --output models/roberta-goemotions \
        --epochs 3 --batch-size 16 --lr 2e-5

Optional consented clinical data (JSONL with {"text": ..., "labels": ["sadness"]}):
    --clinical-jsonl data/ghana_consented.jsonl --clinical-weight 0.35
"""

from __future__ import annotations

import argparse
import json
import os
import random
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import numpy as np

# Heavy imports live inside main() so `--help` and linting work without torch.


LABELS = [
    "admiration", "amusement", "anger", "annoyance", "approval", "caring",
    "confusion", "curiosity", "desire", "disappointment", "disapproval",
    "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief",
    "joy", "love", "nervousness", "optimism", "pride", "realization",
    "relief", "remorse", "sadness", "surprise", "neutral",
]

SAFETY_CLASSES = ["sadness", "grief", "nervousness", "fear"]


@dataclass
class TrainConfig:
    model: str = "roberta-base"
    output: str = "models/roberta-goemotions"
    epochs: int = 3
    batch_size: int = 16
    lr: float = 2e-5
    max_length: int = 128
    seed: int = 42
    clinical_jsonl: str | None = None
    clinical_weight: float = 0.35
    dev_size: float = 0.15


def set_seed(seed: int) -> None:
    import torch

    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


def load_goemotions() -> tuple[list[dict[str, Any]], list[str]]:
    """Load GoEmotions and convert to the multi-label shape the trainer expects."""
    from datasets import load_dataset

    dataset = load_dataset("go_emotions", "simplified")
    rows = []
    for split in ("train", "validation", "test"):
        for item in dataset[split]:
            labels = item["labels"]
            if isinstance(labels, int):
                labels = [labels]
            names = [LABELS[i] for i in labels if 0 <= i < len(LABELS)]
            if names:
                rows.append({"text": item["text"], "labels": names, "source": "goemotions"})
    return rows, ["train", "validation", "test"]


def load_clinical(path: str) -> list[dict[str, Any]]:
    rows = []
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            item = json.loads(line)
            rows.append(
                {
                    "text": item["text"],
                    "labels": item.get("labels", []),
                    "source": "clinical",
                }
            )
    return rows


def to_multihot(names: list[str]) -> list[float]:
    vector = [0.0] * len(LABELS)
    for name in names:
        if name in LABELS:
            vector[LABELS.index(name)] = 1.0
    return vector


def tokenize_all(tokenizer, rows, max_length):
    from datasets import Dataset

    def encode(batch):
        return tokenizer(batch["text"], truncation=True, max_length=max_length, padding="max_length")

    dataset = Dataset.from_list(rows)
    dataset = dataset.map(encode, batched=True)
    dataset = dataset.map(lambda batch: {"labels": [to_multihot(names) for names in batch["label_names"]]}, batched=True)
    dataset.set_format(type="torch", columns=["input_ids", "attention_mask", "labels"])
    return dataset


def compute_metrics(eval_pred) -> dict[str, float]:
    from sklearn.metrics import f1_score, precision_recall_fscore_support

    logits, labels = eval_pred
    probs = 1.0 / (1.0 + np.exp(-logits))
    predictions = (probs >= 0.5).astype(int)
    labels = labels.astype(int)

    metrics: dict[str, float] = {}
    precision, recall, f1, support = precision_recall_fscore_support(
        labels, predictions, average=None, zero_division=0
    )
    for index, label in enumerate(LABELS):
        metrics[f"{label}/f1"] = float(f1[index])
        metrics[f"{label}/recall"] = float(recall[index])
        metrics[f"{label}/precision"] = float(precision[index])
        metrics[f"{label}/support"] = float(support[index])

    metrics["macro_f1"] = float(f1_score(labels, predictions, average="macro", zero_division=0))
    metrics["micro_f1"] = float(f1_score(labels, predictions, average="micro", zero_division=0))
    for label in SAFETY_CLASSES:
        metrics[f"safety/{label}_recall"] = metrics[f"{label}/recall"]
    metrics["safety/min_pain_recall"] = min(metrics[f"safety/{label}_recall"] for label in SAFETY_CLASSES)
    return metrics


def safety_gate(metrics: dict[str, float], threshold: float = 0.60) -> tuple[bool, str]:
    """A model may not ship if it loses sensitivity on pain-related classes."""
    worst = metrics.get("safety/min_pain_recall", 0.0)
    if worst < threshold:
        return False, f"min pain-class recall {worst:.3f} < {threshold:.2f} — do not ship this checkpoint"
    return True, "pain-class recall above gate"


def main() -> None:
    parser = argparse.ArgumentParser(description="Fine-tune an emotion classifier for Nkommo (reference).")
    for field, value in asdict(TrainConfig()).items():
        if isinstance(value, bool):
            parser.add_argument(f"--{field.replace('_', '-')}", action="store_true", default=value)
        else:
            parser.add_argument(f"--{field.replace('_', '-')}", type=type(value) if value is not None else str, default=value)
    args = parser.parse_args()
    config = TrainConfig(**vars(args))

    import torch
    from transformers import (
        AutoModelForSequenceClassification,
        AutoTokenizer,
        Trainer,
        TrainingArguments,
    )

    set_seed(config.seed)
    rows, _ = load_goemotions()

    if config.clinical_jsonl:
        clinical = load_clinical(config.clinical_jsonl)
        # Weight clinical rows by duplication ratio rather than by a fragile
        # per-example loss override; it keeps the training loop auditable.
        repeat = max(1, int(round(config.clinical_weight / max(1e-6, 1 - config.clinical_weight))))
        rows.extend(clinical * repeat)
        print(f"Added {len(clinical)} clinical rows x{repeat} (consented data only).")

    random.shuffle(rows)
    split = int(len(rows) * (1 - config.dev_size))
    train_rows, dev_rows = rows[:split], rows[split:]

    tokenizer = AutoTokenizer.from_pretrained(config.model)
    model = AutoModelForSequenceClassification.from_pretrained(
        config.model,
        num_labels=len(LABELS),
        problem_type="multi_label_classification",
        id2label={i: label for i, label in enumerate(LABELS)},
        label2id={label: i for i, label in enumerate(LABELS)},
    )

    train_dataset = tokenize_all(tokenizer, train_rows, config.max_length)
    dev_dataset = tokenize_all(tokenizer, dev_rows, config.max_length)

    output = Path(config.output)
    output.mkdir(parents=True, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=str(output),
        num_train_epochs=config.epochs,
        per_device_train_batch_size=config.batch_size,
        per_device_eval_batch_size=config.batch_size,
        learning_rate=config.lr,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="macro_f1",
        logging_steps=100,
        seed=config.seed,
        report_to=[],
        fp16=torch.cuda.is_available(),
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=dev_dataset,
        compute_metrics=compute_metrics,
    )
    trainer.train()
    metrics = trainer.evaluate()

    passed, reason = safety_gate(metrics)
    report = {
        "config": asdict(config),
        "labels": LABELS,
        "metrics": metrics,
        "ships": passed,
        "gate": reason,
        "notes": [
            "Trained on GoEmotions (English Reddit). Not valid for Ghanaian English, Pidgin, Twi, Ga, Ewe or Hausa.",
            "Evaluate on a held-out Ghanaian corpus before any deployment decision.",
            "The rule-based risk overlay must remain in front of this model.",
        ],
    }
    (output / "metrics.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    trainer.save_model(str(output))
    tokenizer.save_pretrained(str(output))

    print(json.dumps({"safety_gate": passed, "reason": reason, "macro_f1": metrics.get("eval_macro_f1")}, indent=2))
    if not passed:
        raise SystemExit("Safety gate failed; checkpoint kept for analysis but must not be deployed.")


if __name__ == "__main__":
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    main()
