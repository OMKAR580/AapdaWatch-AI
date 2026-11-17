"""
AapdaWatch NLP v1.0 — Standalone Disaster Classification Inference Module

Loads the fine-tuned DistilBERT model weights and tokenizer from the local
package directory, applies exact training-time text normalization, and generates
binary disaster predictions using the calibrated decision threshold (tau = 0.43).

Execution Target: CPU (Default, fully portable, no GPU required).
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

# Package root resolution (relative to this file)
PACKAGE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_DIR = PACKAGE_DIR / "model"
DEFAULT_TOKENIZER_DIR = PACKAGE_DIR / "model" / "tokenizer"
DEFAULT_CONFIG_DIR = PACKAGE_DIR / "config"

DEFAULT_THRESHOLD = 0.43
MAX_INPUT_LENGTH = 1000
MAX_SEQ_LENGTH = 64
MODEL_VERSION = "model_d_distilbert_v1.0"

class DisasterClassifier:
    """
    Self-contained classifier for AapdaWatch NLP v1.0.
    """

    def __init__(
        self,
        model_dir: Optional[str] = None,
        tokenizer_dir: Optional[str] = None,
        threshold: float = DEFAULT_THRESHOLD,
        device: str = "cpu"
    ):
        self.model_dir = Path(model_dir) if model_dir else DEFAULT_MODEL_DIR
        self.tokenizer_dir = Path(tokenizer_dir) if tokenizer_dir else DEFAULT_TOKENIZER_DIR
        self.threshold = float(threshold)
        self.device = torch.device(device)
        self.max_input_length = MAX_INPUT_LENGTH
        self.max_seq_length = MAX_SEQ_LENGTH
        self.model_version = MODEL_VERSION

        # Load label mappings
        label_map_file = DEFAULT_CONFIG_DIR / "label_mapping.json"
        if label_map_file.exists():
            with open(label_map_file, "r", encoding="utf-8") as f:
                self.label_mapping = json.load(f)
        else:
            self.label_mapping = {
                "id2label": {"0": "Non-Disaster", "1": "Disaster"},
                "label2id": {"Non-Disaster": 0, "Disaster": 1}
            }

        self.tokenizer = None
        self.model = None
        self._load_artifacts()

    def _load_artifacts(self) -> None:
        """Loads tokenizer and PyTorch model weights from local directories."""
        if not self.model_dir.exists():
            raise FileNotFoundError(f"Model directory not found: {self.model_dir}")
        if not self.tokenizer_dir.exists():
            raise FileNotFoundError(f"Tokenizer directory not found: {self.tokenizer_dir}")

        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            str(self.tokenizer_dir),
            local_files_only=True
        )

        # Load PyTorch model weights
        self.model = DistilBertForSequenceClassification.from_pretrained(
            str(self.model_dir),
            local_files_only=True
        )
        self.model.to(self.device)
        self.model.eval()

    @staticmethod
    def normalize_text(text: str) -> str:
        """
        Exact text normalization pipeline used during training.
        Must match training preprocessing identically.
        """
        if not isinstance(text, str):
            return ""
        # 1. Unescape HTML entities (&amp; -> &, &lt; -> <)
        text = html.unescape(text)
        # 2. Unicode NFKC normalization
        text = unicodedata.normalize("NFKC", text)
        # 3. Lowercasing
        text = text.lower()
        # 4. URL placeholder
        text = re.sub(r"https?://\S+|www\.\S+", " urltoken ", text)
        # 5. User mention placeholder
        text = re.sub(r"@\w+", " usertoken ", text)
        # 6. Strip hashtag symbol, retain alphanumeric word
        text = re.sub(r"#([a-zA-Z0-9_]+)", r"\1", text)
        # 7. Collapse whitespace
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def _validate_input(self, text: Any) -> str:
        """Validates input text against empty, whitespace, and size limits."""
        if text is None:
            raise ValueError("Input text cannot be None.")
        if not isinstance(text, str):
            raise TypeError(f"Input text must be a string, got {type(text).__name__}.")
        if not text.strip():
            raise ValueError("Input text cannot be empty or contain only whitespace characters.")
        if len(text) > self.max_input_length:
            raise ValueError(
                f"Input text length ({len(text)} characters) exceeds maximum supported limit "
                f"of {self.max_input_length} characters."
            )
        return text

    def predict(self, text: str) -> Dict[str, Any]:
        """
        Generates binary disaster prediction for a single text record.

        Args:
            text: Raw input string.

        Returns:
            Dict containing predicted_label, predicted_class, probability, threshold,
            model_version, and inference_time_ms.
        """
        valid_text = self._validate_input(text)
        start_time = time.perf_counter()

        clean_text = self.normalize_text(valid_text)

        inputs = self.tokenizer(
            clean_text,
            truncation=True,
            padding="max_length",
            max_length=self.max_seq_length,
            return_tensors="pt"
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)
            prob_disaster = float(probs[0, 1].cpu().item())

        is_disaster = prob_disaster >= self.threshold
        predicted_class = 1 if is_disaster else 0
        predicted_label = self.label_mapping["id2label"].get(str(predicted_class), "Disaster" if is_disaster else "Non-Disaster")

        latency_ms = (time.perf_counter() - start_time) * 1000.0

        return {
            "text": text,
            "predicted_label": predicted_label,
            "predicted_class": predicted_class,
            "probability": round(prob_disaster, 4),
            "threshold": self.threshold,
            "model_version": self.model_version,
            "inference_time_ms": round(latency_ms, 2)
        }

    def predict_batch(self, texts: List[str]) -> List[Dict[str, Any]]:
        """Generates predictions for a batch of text records (max 64 items)."""
        if not texts:
            raise ValueError("Input batch cannot be empty.")
        if len(texts) > 64:
            raise ValueError(f"Batch size {len(texts)} exceeds maximum supported limit of 64.")

        validated_texts = [self._validate_input(t) for t in texts]
        start_time = time.perf_counter()

        clean_texts = [self.normalize_text(t) for t in validated_texts]

        inputs = self.tokenizer(
            clean_texts,
            truncation=True,
            padding="max_length",
            max_length=self.max_seq_length,
            return_tensors="pt"
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)
            probs_disaster = probs[:, 1].cpu().numpy().tolist()

        total_latency_ms = (time.perf_counter() - start_time) * 1000.0
        per_sample_latency = round(total_latency_ms / len(texts), 2)

        results = []
        for text, prob in zip(texts, probs_disaster):
            is_disaster = prob >= self.threshold
            predicted_class = 1 if is_disaster else 0
            predicted_label = self.label_mapping["id2label"].get(str(predicted_class), "Disaster" if is_disaster else "Non-Disaster")
            results.append({
                "text": text,
                "predicted_label": predicted_label,
                "predicted_class": predicted_class,
                "probability": round(prob, 4),
                "threshold": self.threshold,
                "model_version": self.model_version,
                "inference_time_ms": per_sample_latency
            })

        return results

# Default singleton instance for module-level convenience
_default_classifier = None

def get_classifier() -> DisasterClassifier:
    global _default_classifier
    if _default_classifier is None:
        _default_classifier = DisasterClassifier()
    return _default_classifier

def predict(text: str) -> Dict[str, Any]:
    """Module-level convenience prediction function."""
    return get_classifier().predict(text)

def predict_batch(texts: List[str]) -> List[Dict[str, Any]]:
    """Module-level convenience batch prediction function."""
    return get_classifier().predict_batch(texts)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        query_text = " ".join(sys.argv[1:])
    else:
        query_text = "Massive earthquake reported in northern region, buildings collapsed."

    print("=" * 65)
    print("AAPDAWATCH NLP v1.0 — STANDALONE INFERENCE CLI")
    print("=" * 65)
    classifier = get_classifier()
    result = classifier.predict(query_text)
    print(f"Input:       {result['text']}")
    print(f"Prediction:  {result['predicted_label']} (Class {result['predicted_class']})")
    print(f"Probability: {result['probability']:.4f} (Threshold: {result['threshold']})")
    print(f"Model Ver:   {result['model_version']}")
    print(f"Latency:     {result['inference_time_ms']} ms")
    print("=" * 65)
