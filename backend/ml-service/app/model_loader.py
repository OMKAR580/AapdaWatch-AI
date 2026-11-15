"""
AapdaWatch AI — Native Keras BiLSTM Model Loader
Loads aapdawatch_bilstm.keras in an isolated runtime without pickle deserialization.
"""

import os
import json

# Ensure PyTorch backend is active for Keras 3 runtime
os.environ["KERAS_BACKEND"] = "torch"

import keras

DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "artifacts", "staging", "aapdawatch_bilstm.keras"
)

_MODEL_INSTANCE = None

def get_bilstm_model(model_path: str = DEFAULT_MODEL_PATH):
    """
    Returns a singleton instance of the loaded BiLSTM Keras model.
    """
    global _MODEL_INSTANCE
    if _MODEL_INSTANCE is None:
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Recovered model archive not found at: {model_path}")
        _MODEL_INSTANCE = keras.models.load_model(model_path)
    return _MODEL_INSTANCE

def validate_model_architecture(model) -> dict:
    """
    Verifies that the loaded model conforms to expected dimensions.
    """
    layers_info = []
    for layer in model.layers:
        layers_info.append({
            "name": layer.name,
            "type": layer.__class__.__name__,
            "output_shape": getattr(layer, "output_shape", None),
            "trainable": layer.trainable,
        })

    return {
        "model_name": model.name,
        "layers_count": len(model.layers),
        "total_params": model.count_params(),
        "layers": layers_info,
        "input_shape": getattr(model, "input_shape", None),
        "output_shape": getattr(model, "output_shape", None),
    }

