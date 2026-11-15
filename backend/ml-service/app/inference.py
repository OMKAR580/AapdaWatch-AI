"""
AapdaWatch AI — BiLSTM Text Classification Inference Engine
End-to-end pipeline: Preprocess -> Tokenize & Pad -> BiLSTM Forward Pass -> Threshold Decision
"""

import time
from typing import List, Dict, Any, Union
import numpy as np

from .preprocessing import candidate_normalize_text, original_normalize_text
from .tokenizer import KerasCompatibleTokenizer
from .model_loader import get_bilstm_model

_TOKENIZER = None

def get_tokenizer():
    global _TOKENIZER
    if _TOKENIZER is None:
        _TOKENIZER = KerasCompatibleTokenizer()
    return _TOKENIZER

def predict_single(
    text: str,
    threshold: float = 0.35,
    padding: str = "post",
    preprocessing_mode: str = "candidate"
) -> Dict[str, Any]:
    """
    Executes real inference on a single text string.
    """
    start_time = time.perf_counter()

    # 1. Preprocess
    if preprocessing_mode == "original":
        preprocessed = original_normalize_text(text)
    else:
        preprocessed = candidate_normalize_text(text)

    # 2. Tokenize & Pad
    tok = get_tokenizer()
    seqs = tok.texts_to_sequences([preprocessed])
    raw_tokens = seqs[0] if seqs else []
    padded_input = tok.pad_sequences(seqs, maxlen=30, padding=padding, truncating="post")

    # 3. Model Forward Pass
    model = get_bilstm_model()
    import torch
    with torch.no_grad():
        raw_pred = model(padded_input, training=False)
        if hasattr(raw_pred, "detach"):
            prob = float(raw_pred[0][0].detach().cpu().numpy())
        else:
            prob = float(raw_pred[0][0])

    duration_ms = (time.perf_counter() - start_time) * 1000.0

    predicted_class = "DISASTER_RELATED" if prob >= threshold else "NOT_DISASTER_RELATED"
    confidence = prob if predicted_class == "DISASTER_RELATED" else round(1.0 - prob, 4)

    return {
        "input_text": text,
        "preprocessed_text": preprocessed,
        "tokens": raw_tokens,
        "padded_shape": list(padded_input.shape),
        "sequence_length": len(raw_tokens),
        "probability": round(prob, 4),
        "threshold": threshold,
        "predicted_class": predicted_class,
        "confidence": round(confidence, 4),
        "inference_duration_ms": round(duration_ms, 2),
        "preprocessing_mode": preprocessing_mode,
        "padding_direction": padding
    }

def predict_batch(
    texts: List[str],
    threshold: float = 0.35,
    padding: str = "post",
    preprocessing_mode: str = "candidate"
) -> List[Dict[str, Any]]:
    """
    Executes vectorized batch inference across multiple texts.
    """
    start_time = time.perf_counter()

    # 1. Preprocess all
    if preprocessing_mode == "original":
        preprocessed_list = [original_normalize_text(t) for t in texts]
    else:
        preprocessed_list = [candidate_normalize_text(t) for t in texts]

    # 2. Tokenize & Pad
    tok = get_tokenizer()
    seqs = tok.texts_to_sequences(preprocessed_list)
    padded_inputs = tok.pad_sequences(seqs, maxlen=30, padding=padding, truncating="post")

    # 3. Vectorized Forward Pass
    model = get_bilstm_model()
    import torch
    with torch.no_grad():
        raw_preds = model(padded_inputs, training=False)
        if hasattr(raw_preds, "detach"):
            probs = [float(p[0].detach().cpu().numpy()) for p in raw_preds]
        else:
            probs = [float(p[0]) for p in raw_preds]

    duration_ms = (time.perf_counter() - start_time) * 1000.0
    per_item_duration = round(duration_ms / max(1, len(texts)), 2)

    results = []
    for idx, text in enumerate(texts):
        prob = probs[idx]
        pred_class = "DISASTER_RELATED" if prob >= threshold else "NOT_DISASTER_RELATED"
        conf = prob if pred_class == "DISASTER_RELATED" else round(1.0 - prob, 4)
        results.append({
            "input_text": text,
            "preprocessed_text": preprocessed_list[idx],
            "tokens": seqs[idx],
            "padded_shape": [1, 30],
            "sequence_length": len(seqs[idx]),
            "probability": round(prob, 4),
            "threshold": threshold,
            "predicted_class": pred_class,
            "confidence": round(conf, 4),
            "inference_duration_ms": per_item_duration,
            "preprocessing_mode": preprocessing_mode,
            "padding_direction": padding
        })

    return results
