# AapdaWatch NLP v1.0 — Standalone Disaster Classification Package

**Package Version:** `1.0.0`  
**Model Name:** `aapdawatch_distilbert_disaster_classifier`  
**Base Architecture:** `distilbert/distilbert-base-uncased` (66.95M parameters)  
**Calibrated Threshold:** $\tau = 0.43$  
**Hardware Target:** Standard CPU (No GPU or CUDA drivers required)  
**Release Date:** 2026-11-16  

---

## 1. Overview & Capabilities

AapdaWatch NLP v1.0 is a self-contained, portable natural language processing package designed to identify disaster-related text (crises, floods, earthquakes, structural emergencies, wildfires) from citizen messages, social media streams, and SMS emergency reports.

- **Offline Validation Accuracy:** **85.10%** at threshold $\tau = 0.43$ (Historical benchmark on 1,497 validation records).
- **Offline Validation F1-Score:** **81.24%** at threshold $\tau = 0.43$ (Precision: 87.66%, Recall: 75.71%).
- **Offline Validation ROC-AUC:** **0.8990**.
- **CPU Inference Latency:** **~26 ms** per text record on modern multi-core CPU.
- **Portability:** Entirely self-contained. Contains weights, tokenizer, config, normalization, and inference code. Operates with zero network access and no external cloud API dependencies.

> [!NOTE]
> All reported performance metrics are derived from **offline historical validation datasets** (`validation_split.csv`) and synthetic challenge benchmarks (`hard_eval_set.csv`). They do not represent unverified field-tested live operational guarantees.

---

## 2. Directory Structure

```text
AapdaWatch_NLP_v1.0/
├── model/
│   ├── model.safetensors          # Fine-tuned PyTorch DistilBERT weights (255.42 MB)
│   ├── config.json                # Model architecture & hyperparameter configuration
│   └── tokenizer/
│       ├── tokenizer.json         # Vocabulary and tokenizer state
│       └── tokenizer_config.json  # Tokenizer special tokens mapping
├── inference/
│   ├── __init__.py                # Package exports
│   └── predict.py                 # Self-contained DisasterClassifier & normalization
├── config/
│   ├── label_mapping.json         # Class index mapping (0: Non-Disaster, 1: Disaster)
│   ├── threshold_config.json      # Calibrated threshold (0.43) and metric records
│   └── metadata.json              # Checkpoint details, epoch history, parameter counts
├── requirements.txt               # Minimal CPU inference dependencies
├── MODEL_CARD.md                  # Comprehensive model card & evaluation tables
├── PACKAGE_MANIFEST.md            # Checksums and file size manifests
└── README.md                      # This technical documentation
```

---

## 3. Installation & Setup

### 3.1 Prerequisites
- Python 3.11 or 3.12 (Tested on Python 3.12.14).
- Standard x86_64 CPU (Intel / AMD / ARM).
- ~1 GB available disk space (weights: 255.42 MB, PyTorch CPU package: ~200 MB).

### 3.2 Installation Commands
```bash
# 1. Create and activate a clean virtual environment
python -m venv venv
source venv/bin/activate       # On Windows: .\venv\Scripts\activate

# 2. Install minimal CPU inference dependencies
pip install -r requirements.txt
```

---

## 4. Usage Instructions

### 4.1 Quick CLI Prediction
You can test the package directly from your command line:
```bash
python inference/predict.py "Flash flood warning issued, water levels rising rapidly."
```

**Expected Output:**
```text
=================================================================
AAPDAWATCH NLP v1.0 — STANDALONE INFERENCE CLI
=================================================================
Input:       Flash flood warning issued, water levels rising rapidly.
Prediction:  Disaster (Class 1)
Probability: 0.9542 (Threshold: 0.43)
Model Ver:   model_d_distilbert_v1.0
Latency:     24.18 ms
=================================================================
```

### 4.2 Python Code Integration

```python
from inference.predict import DisasterClassifier, predict, predict_batch

# Option A: Module-level convenience function (uses pre-warmed singleton)
result = predict("Major earthquake magnitude 6.2 reported in southern province.")
print(result)
# Output:
# {
#     "text": "Major earthquake magnitude 6.2 reported in southern province.",
#     "predicted_label": "Disaster",
#     "predicted_class": 1,
#     "probability": 0.9863,
#     "threshold": 0.43,
#     "model_version": "model_d_distilbert_v1.0",
#     "inference_time_ms": 25.40
# }

# Option B: Object-oriented instantiation (custom threshold or device)
classifier = DisasterClassifier(threshold=0.43, device="cpu")
result = classifier.predict("Enjoying homemade pancakes with my family!")
print(f"Prediction: {result['predicted_label']} (Probability: {result['probability']})")
# Output: Prediction: Non-Disaster (Probability: 0.1160)

# Option C: Batched prediction (up to 64 records)
batch_results = predict_batch([
    "Wildfire spreading across hills, homes burning.",
    "Sunny day at the park playing soccer."
])
for r in batch_results:
    print(f"{r['predicted_label']}: {r['text'][:40]}... (P = {r['probability']})")
```

---

## 5. Input Constraints & Validation

| Parameter | Constraint | Behavior on Violation |
| :--- | :--- | :--- |
| **Input Type** | `str` | Raises `TypeError` |
| **Minimum Length** | 1 non-whitespace character | Raises `ValueError` ("Input text cannot be empty...") |
| **Maximum Length** | 1,000 characters | Raises `ValueError` ("Input text length exceeds limit...") |
| **Batch Size** | 1 to 64 strings | Raises `ValueError` ("Batch size exceeds maximum...") |

---

## 6. Known Failure Modes & Operational Limitations

> [!CAUTION]
> **EXPLICIT NEGATION FALSE-ALARM SUSCEPTIBILITY (13.3% CHALLENGE ACCURACY)**  
> On our 100-sample challenge set, DistilBERT detected 100% of true disasters and 86.7% of metaphors, but correctly identified only **13.3%** of explicit negations.

### Failure Behavior Example
- **Input Text:** `"Controlled burn conducted by forestry rangers in national park, absolutely no threat to residents and no injuries."`
- **Model Output:** `predicted_class: 1` (`"Disaster"`), `probability: 0.9645` [FALSE POSITIVE]
- **Underlying Cause:** Self-attention layers prioritize high-salience disaster vocabulary (*burn*, *threat*, *residents*, *injuries*) over negative particles (*no*, *not*, *zero*).
- **Operational Rule:** Do NOT use this model as an autonomous trigger for life-critical dispatch or sirens. All high-confidence alerts should pass through human verification.
