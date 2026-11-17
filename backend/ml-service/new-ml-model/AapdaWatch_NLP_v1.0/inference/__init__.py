"""
AapdaWatch NLP v1.0 — Standalone Inference Package
"""

from .predict import DisasterClassifier, predict, predict_batch

__all__ = ["DisasterClassifier", "predict", "predict_batch"]
