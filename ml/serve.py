"""FastAPI inference service for the Nkommo production path (reference).

Contract notes:
  * Field names mirror `src/engine/types.ts` so the front end can switch
    implementations without a migration.
  * `risk` is NOT decided by the transformer. It is delegated to the auditable
    rule overlay, and the response says so explicitly. Removing that field is a
    safety regression, not a refactor.
  * The service must not log request bodies. Journals are sensitive by default.

Run:
    uvicorn ml.serve:app --host 0.0.0.0 --port 8080
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

MODEL_DIR = os.environ.get("NKOMMO_MODEL_DIR", "models/roberta-goemotions")
ENGINE_VERSION = "ml-service-0.1.0-reference"

LABELS = [
    "admiration", "amusement", "anger", "annoyance", "approval", "caring",
    "confusion", "curiosity", "desire", "disappointment", "disapproval",
    "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief",
    "joy", "love", "nervousness", "optimism", "pride", "realization",
    "relief", "remorse", "sadness", "surprise", "neutral",
]

# The eleven categories the app actually plots.
APP_EMOTIONS = {
    "joy": ["joy", "amusement", "excitement", "pride", "realization"],
    "sadness": ["sadness", "grief", "disappointment", "remorse"],
    "anger": ["anger", "annoyance", "disapproval", "disgust"],
    "fear": ["fear"],
    "anxiety": ["nervousness", "confusion"],
    "loneliness": [],
    "shame": ["embarrassment"],
    "numbness": [],
    "gratitude": ["gratitude", "admiration", "caring"],
    "hope": ["optimism", "relief"],
    "calm": ["neutral"],
}

RISK_NOTE = (
    "Risk is decided by the rule overlay (src/engine risk patterns), not by this model. "
    "A transformer must never be the only decision-maker on whether a person is safe."
)


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)
    locale: str = Field("en-GH", description="BCP-47 locale hint; 'en-GH' is the only validated one.")


class EmotionScore(BaseModel):
    label: str
    score: float


class AnalyzeResponse(BaseModel):
    engine_version: str
    text_length: int
    sentiment_compound: float
    emotions: list[EmotionScore]
    app_emotions: list[EmotionScore]
    risk: dict[str, Any]
    warnings: list[str]
    latency_ms: int


@dataclass
class Inference:
    tokenizer: Any
    model: Any
    device: str


@lru_cache(maxsize=1)
def load_model() -> Inference:
    """Lazy load so the service can start (and fail health checks) without weights."""
    try:
        import torch
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
    except ImportError as error:  # pragma: no cover - reference path
        raise HTTPException(status_code=503, detail=f"ML dependencies missing: {error}") from error

    if not os.path.isdir(MODEL_DIR):
        raise HTTPException(status_code=503, detail=f"Model directory not found: {MODEL_DIR}")

    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    model.eval()
    return Inference(tokenizer=tokenizer, model=model, device=device)


app = FastAPI(
    title="Nkommo analysis service (reference)",
    version=ENGINE_VERSION,
    description="Transformer emotion inference plus a rule-based risk overlay. Not a medical device.",
)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model_dir": MODEL_DIR,
        "model_present": os.path.isdir(MODEL_DIR),
        "engine_version": ENGINE_VERSION,
        "validated_locales": ["en", "en-GH"],
    }


def rule_overlay(text: str) -> dict[str, Any]:
    """Mirror of the shipping rule layer, kept deliberately simple here.

    In production this should call the same tested implementation that the web
    client uses (TypeScript compiled to a shared spec, or a Python port with a
    shared test suite). Duplicating safety logic in two languages without a
    shared corpus is how safety regressions happen.
    """
    lowered = text.lower()
    urgent_markers = ("kill myself", "end my life", "want to die", "take my own life", "suicide plan")
    elevated_markers = ("no reason to live", "better off dead", "do not want to be here", "tired of living")
    tier = "none"
    if any(marker in lowered for marker in urgent_markers):
        tier = "urgent"
    elif any(marker in lowered for marker in elevated_markers):
        tier = "elevated"
    return {
        "level": tier,
        "decided_by": "rule_overlay",
        "note": RISK_NOTE,
        "requires_human_review": tier in {"urgent", "elevated"},
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    started = time.perf_counter()
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="text must not be empty")

    warnings: list[str] = []
    if request.locale not in {"en", "en-GH"}:
        warnings.append(
            f"Locale {request.locale!r} is not validated. The model was trained on English text and will "
            "misread Twi, Ga, Ewe, Hausa and much Ghanaian Pidgin."
        )

    inference = load_model()
    import torch

    inputs = inference.tokenizer(text, return_tensors="pt", truncation=True, max_length=256).to(inference.device)
    with torch.no_grad():
        logits = inference.model(**inputs).logits[0].cpu().numpy()
    probabilities = 1.0 / (1.0 + np.exp(-logits))

    emotions = [
        EmotionScore(label=LABELS[i], score=round(float(probabilities[i]), 4))
        for i in np.argsort(probabilities)[::-1][:8]
    ]

    app_scores: dict[str, float] = {}
    for app_label, members in APP_EMOTIONS.items():
        if not members:
            app_scores[app_label] = 0.0
            continue
        app_scores[app_label] = float(max(probabilities[LABELS.index(member)] for member in members))
    top = max(app_scores.values()) or 1.0
    app_emotions = [
        EmotionScore(label=label, score=round(score / top, 3))
        for label, score in sorted(app_scores.items(), key=lambda pair: pair[1], reverse=True)
        if score > 0.05
    ][:4]

    positive = sum(probabilities[LABELS.index(label)] for label in ("joy", "gratitude", "optimism", "love", "amusement"))
    negative = sum(probabilities[LABELS.index(label)] for label in ("sadness", "grief", "anger", "fear", "nervousness"))
    compound = float((positive - negative) / max(1e-6, positive + negative + 0.15))

    latency_ms = int((time.perf_counter() - started) * 1000)
    return AnalyzeResponse(
        engine_version=ENGINE_VERSION,
        text_length=len(text),
        sentiment_compound=round(max(-1.0, min(1.0, compound)), 3),
        emotions=emotions,
        app_emotions=app_emotions,
        risk=rule_overlay(text),
        warnings=warnings,
        latency_ms=latency_ms,
    )
