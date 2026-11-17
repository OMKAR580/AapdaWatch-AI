"""
AapdaWatch AI — Fine-Tuned DistilBERT Disaster Classification Engine (v1.0)
High-accuracy transformer-based sequence classification model (85.1% accuracy, 0.899 ROC-AUC).
Replaces the legacy BiLSTM model with state-of-the-art transformer inference.
"""

import os
import sys
import json
import time
import html
import unicodedata
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

import torch
from transformers import AutoTokenizer, DistilBertForSequenceClassification

# Base directory for the new DistilBERT model
BASE_DIR = Path(__file__).resolve().parent.parent
DISTILBERT_DIR = BASE_DIR / "new-ml-model" / "AapdaWatch_NLP_v1.0"
MODEL_DIR = DISTILBERT_DIR / "model"
TOKENIZER_DIR = MODEL_DIR / "tokenizer"
CONFIG_DIR = DISTILBERT_DIR / "config"

DEFAULT_THRESHOLD = 0.43
MODEL_NAME = "AapdaWatch_DistilBERT"
MODEL_VERSION = "model_d_distilbert_v1.0"
MAX_SEQ_LENGTH = 64


class DistilBERTEngine:
    """
    Singleton inference engine for the fine-tuned DistilBERT disaster classifier.
    """

    def __init__(self, model_dir: Optional[Path] = None, tokenizer_dir: Optional[Path] = None):
        self.model_dir = model_dir or MODEL_DIR
        self.tokenizer_dir = tokenizer_dir or TOKENIZER_DIR
        self.threshold = DEFAULT_THRESHOLD
        self.device = torch.device("cpu")
        self.model_name = MODEL_NAME
        self.model_version = MODEL_VERSION
        self.model = None
        self.tokenizer = None
        self.is_loaded = False
        self.label_mapping = {"0": "Non-Disaster", "1": "Disaster"}

        # Attempt to load model and tokenizer
        self._load()

    def _load(self):
        try:
            if not self.model_dir.exists():
                # Fallback to check relative to workspace
                alt_dir = Path("E:/NLP/ML_model/new-ml-model/AapdaWatch_NLP_v1.0/model")
                if alt_dir.exists():
                    self.model_dir = alt_dir
                    self.tokenizer_dir = alt_dir / "tokenizer"

            if self.model_dir.exists() and (self.model_dir / "model.safetensors").exists():
                self.tokenizer = AutoTokenizer.from_pretrained(
                    str(self.tokenizer_dir),
                    local_files_only=True
                )
                self.model = DistilBertForSequenceClassification.from_pretrained(
                    str(self.model_dir),
                    local_files_only=True
                )
                self.model.to(self.device)
                self.model.eval()
                self.is_loaded = True
        except Exception as e:
            print(f"[DistilBERTEngine] Warning: Could not load DistilBERT model: {e}")
            self.is_loaded = False

    @staticmethod
    def normalize_text(text: str) -> str:
        """
        Exact text normalization pipeline used during DistilBERT fine-tuning:
        HTML unescape, Unicode NFKC, lowercasing, URL/User tokenization, whitespace collapse.
        """
        if not isinstance(text, str):
            return ""
        text = html.unescape(text)
        text = unicodedata.normalize("NFKC", text)
        text = text.lower()
        text = re.sub(r"https?://\S+|www\.\S+", " urltoken ", text)
        text = re.sub(r"@\w+", " usertoken ", text)
        text = re.sub(r"#([a-zA-Z0-9_]+)", r"\1", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def predict_single(self, text: str, threshold: Optional[float] = None) -> Dict[str, Any]:
        """
        Runs neural sequence classification inference on a single text string.
        """
        if not self.is_loaded:
            raise RuntimeError("DistilBERT model is not loaded.")

        thresh = threshold if threshold is not None else self.threshold
        start_time = time.perf_counter()

        clean_text = self.normalize_text(text)

        inputs = self.tokenizer(
            clean_text,
            truncation=True,
            padding="max_length",
            max_length=MAX_SEQ_LENGTH,
            return_tensors="pt"
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)
            prob_disaster = float(probs[0, 1].cpu().item())

        is_disaster = prob_disaster >= thresh
        predicted_class = "DISASTER_RELATED" if is_disaster else "NOT_DISASTER_RELATED"
        confidence = prob_disaster if is_disaster else (1.0 - prob_disaster)
        latency_ms = (time.perf_counter() - start_time) * 1000.0

        return {
            "input_text": text,
            "preprocessed_text": clean_text,
            "probability": round(prob_disaster, 4),
            "threshold": thresh,
            "predicted_class": predicted_class,
            "confidence": round(confidence, 4),
            "inference_duration_ms": round(latency_ms, 2),
            "model_name": self.model_name,
            "model_version": self.model_version,
            "sequence_length": len(clean_text.split()),
            "tokens": clean_text.split()[:30]
        }

    def predict_batch(self, texts: List[str], threshold: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Runs batched neural inference across a list of texts (up to 64 items per batch).
        """
        if not self.is_loaded:
            raise RuntimeError("DistilBERT model is not loaded.")

        thresh = threshold if threshold is not None else self.threshold
        clean_texts = [self.normalize_text(t) for t in texts]

        inputs = self.tokenizer(
            clean_texts,
            truncation=True,
            padding="max_length",
            max_length=MAX_SEQ_LENGTH,
            return_tensors="pt"
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)

        results = []
        for i, text in enumerate(texts):
            prob = float(probs[i, 1].cpu().item())
            is_disaster = prob >= thresh
            predicted_class = "DISASTER_RELATED" if is_disaster else "NOT_DISASTER_RELATED"
            confidence = prob if is_disaster else (1.0 - prob)

            results.append({
                "input_text": text,
                "preprocessed_text": clean_texts[i],
                "probability": round(prob, 4),
                "threshold": thresh,
                "predicted_class": predicted_class,
                "confidence": round(confidence, 4),
                "model_name": self.model_name,
                "model_version": self.model_version
            })

        return results


# Global singleton instance
distilbert_engine = DistilBERTEngine()

