# AapdaWatch NLP v1.0 — Package Manifest

**Package Directory:** `delivery/AapdaWatch_NLP_v1.0`  
**Generated Date:** 2026-11-16  
**Hashing Algorithm:** SHA-256  
**Total Binary Footprint:** ~256.4 MB (Weights: 255.42 MB)  

---

## 1. File Inventory & Integrity Checksums

| File Relative Path | Size (Bytes) | SHA-256 Checksum | Purpose / Description |
| :--- | :---: | :--- | :--- |
| `model/model.safetensors` | 267,832,560 | `1c3043ab487fb232f19940beac4b4e7c4d9de841851f4e707595bb089e8fef6a` | Fine-tuned DistilBERT PyTorch model weights (Epoch 2 Checkpoint) |
| `model/config.json` | 582 | `30027deb90cd248deca588b9677a5319708260f88b7e3e6b5da2dbf79441f226` | DistilBERT model architecture & hyperparameter configuration |
| `model/tokenizer/tokenizer.json` | 711,396 | `d241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66` | WordPiece vocabulary and tokenizer state |
| `model/tokenizer/tokenizer_config.json` | 371 | `4f57358419011bb98ac1172a04410ada987c7db5cc93410a7e38decfcac6ec57` | Tokenizer special tokens mapping |
| `inference/predict.py` | 9,519 | `566f61d100c80641c1f789e68b294da9612c71b19119eb9d2e36ea36b8f4f5af` | Self-contained inference engine, normalization, and CLI |
| `inference/__init__.py` | 188 | `08dc6b5a8089998de404234b8cbb21eb75c08e7ddf8ba4cd0ee15a2a17dd9806` | Module export declarations |
| `config/label_mapping.json` | 673 | `997b158170dfb3c58b326404884d643baddbbe1be3e408148f042d53d345cef6` | Binary class mapping (0: Non-Disaster, 1: Disaster) |
| `config/threshold_config.json` | 1,176 | `9ad93bc91028a11b8cb832e0b00910bf904fdb08fb48dc861a842c55d866f77f` | Calibrated decision threshold details (tau = 0.43) |
| `config/metadata.json` | 3,107 | `f48688dd1ce72494790334c51f8521530fa044274658152ff0a11a6728b625bb` | Training history, hyperparameters, and parameter counts |
| `requirements.txt` | 293 | `8cb10a5728299aae24935d26374fdbf8980ed17e08a92cee34b5c8148449513a` | Minimal CPU inference dependency manifest |
| `MODEL_CARD.md` | 7,454 | `fe2b278470838f1472fe4a1d05d4b1cfeb9cd4c46b82807a89e48a6c5f3955b9` | Model specifications, validation tables, intended scope |
| `README.md` | 6,597 | `fb108b0664b9de2ab8087f6e97c93dad485d5eeee859648c12ea0162f1c99d6a` | Developer quickstart, CLI usage, and integration guide |
