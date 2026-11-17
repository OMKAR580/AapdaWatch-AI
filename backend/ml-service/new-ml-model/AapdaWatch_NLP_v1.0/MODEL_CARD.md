# Model Card — AapdaWatch AI DistilBERT Disaster Text Classifier

**Model Name:** `aapdawatch_distilbert_disaster_classifier`  
**Model Version:** `1.0.0`  
**Model Checkpoint:** `experiments/model_d/best_distilbert/` (Epoch 2 Checkpoint)  
**Base Architecture:** `distilbert/distilbert-base-uncased`  
**Framework:** PyTorch 2.15+ / Hugging Face Transformers 5.23+  
**Release Date:** 2026-11-16  
**Maintainer:** AapdaWatch AI ML Engineering Team  

---

## 1. Model Summary & Architecture

The AapdaWatch AI disaster text classification model is a fine-tuned Transformer engineered to identify real-world emergency reports, crises, and disasters from high-velocity citizen streams (social media, SMS feeds, emergency dispatches).

- **Base Model:** `distilbert/distilbert-base-uncased` (Sanh et al., 2019).
- **Transformer Depth:** 6 transformer encoder layers.
- **Hidden Dimension:** 768 with 12 multi-head self-attention heads.
- **Classification Head:** Linear classifier (`768 -> 2`) with dropout ($p=0.20$).
- **Total Parameters:** 66,955,010.
- **Trainable Parameters:** 66,955,010 (full fine-tuning).
- **Input Sequence Length:** 64 tokens (covers 99.92% of observed emergency text without truncation).
- **Vocabulary:** WordPiece tokenizer (30,522 tokens).

---

## 2. Training Data & Preprocessing

### 2.1 Training Partition (`train_split.csv`)
- **Total Records:** 5,988 records.
- **Class Distribution:**
  - Non-Disaster (`0`): 3,438 records (57.41%).
  - Disaster (`1`): 2,550 records (42.59%).
- **Split Strategy:** Stratified 80/20 train/validation split preserving natural label ratios.
- **Data Hygiene:** Quarantine of duplicate text surges and conflicting multi-label entries.

### 2.2 Text Normalization Pipeline
To prevent distribution shift, all incoming inference text must strictly pass through `normalize_text`:
1. `html.unescape(text)` — decodes HTML entities (`&amp;` $\to$ `&`).
2. `unicodedata.normalize("NFKC", text)` — standardizes Unicode compatibility forms.
3. Lowercasing — matches DistilBERT uncased vocabulary.
4. URL Tokenization — replaces URLs (`http://...`, `www...`) with ` urltoken `.
5. Mention Tokenization — replaces Twitter/social user tags (`@username`) with ` usertoken `.
6. Hashtag Preservation — removes `#` symbol while preserving the alphanumeric token (e.g., `#wildfire` $\to$ `wildfire`).
7. Whitespace Collapsing — strips leading/trailing spaces and collapses internal whitespace.

---

## 3. Evaluation & Empirical Performance

All metrics were calculated independently from saved probabilities on `validation_split.csv` ($N=1,497$, 859 Non-Disaster, 638 Disaster).

### 3.1 Validation Performance vs. Previous Baselines

| Metric | Model A (TF-IDF + LR) | Model B (Bi-LSTM v2) | Model C (GloVe Bi-LSTM) | Model D: DistilBERT (Default $\tau=0.50$) | Model D: DistilBERT (Tuned $\tau=0.43$) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Accuracy** | 81.43% | 81.10% | 81.03% | 84.24% | **85.10%** |
| **Precision** | 84.62% | 83.81% | 78.46% | 88.36% | **87.66%** |
| **Recall** | 68.97% | 68.97% | 76.49% | 72.57% | **75.71%** |
| **F1-Score** | 75.99% | 75.67% | 77.46% | 79.69% | **81.24%** |
| **ROC-AUC** | 0.8657 | 0.8507 | 0.8653 | 0.8990 | **0.8990** |
| **PR-AUC** | 0.8669 | 0.8590 | 0.8640 | 0.9041 | **0.9041** |

### 3.2 Confusion Matrix at Tuned Threshold ($\tau = 0.43$)
$$\begin{pmatrix} \text{TN}=791 & \text{FP}=68 \\ \text{FN}=155 & \text{TP}=483 \end{pmatrix}$$
- **False Positive Rate:** 7.92% (68 / 859).
- **False Negative Rate:** 24.29% (155 / 638).

### 3.3 Synthetic Challenge Benchmark (`hard_eval_set.csv`, N = 100)
Evaluated at $\tau = 0.43$ on a 100-sample synthetic challenge test set:

| Category | Sample Count | Accuracy | Analysis & Findings |
| :--- | :---: | :---: | :--- |
| **Genuine Disaster Reports** | 50 | **100.0%** (50/50) | **Zero False Negatives:** Flawless detection of true emergencies. |
| **Casual Everyday Keywords** | 20 | **80.0%** (16/20) | Successfully filtered 80% of mundane tweets using words like *fire*, *crush*. |
| **Metaphorical / Figurative** | 15 | **86.7%** (13/15) | Contextual attention resolved idioms (*"album dropped like a bomb"*, *"set me ablaze"*). |
| **Negation / False Alarms** | 15 | **13.3%** (2/15) | **Systemic failure:** Struggles to identify negated emergencies (*"no casualties"*, *"false alarm"*). |

---

## 4. Intended Use & Deployment Scope

### 4.1 Primary Intended Applications
- Real-time citizen stream ingestion for municipal and national emergency operations centers (EOC) in an assistive, human-in-the-loop capacity.
- Social media crisis filtering to prioritize dispatch alerts during earthquakes, floods, wildfires, and structural collapses.
- Automated triage to surface high-probability disaster signals to human analysts.

### 4.2 Out-of-Scope & Operational Limitations
- Must **NOT** be used as the sole automated trigger for life-critical dispatch, evacuation orders, or autonomous siren activations without human-in-the-loop verification.
- **Not Field-Tested on Live Disaster Events:** Empirical performance is established exclusively on historical offline benchmarks and synthetic linguistic challenge sets; live operational efficacy under unpredictable network stream noise must be validated by the platform team.
- Not calibrated for languages other than English without multilingual fine-tuning.

---

## 5. Known Limitations & Failure Modes

> [!WARNING]
> **CRITICAL PRODUCTION LIMITATION — NEGATION AND FALSE ALARMS**  
> DistilBERT, like all standard sequence classification models trained on disaster corpora, suffers from a severe blind spot regarding explicit negation.

### 5.1 False-Positive Behavior on Negation
When emergency vocabulary (*casualties*, *structural damage*, *fire*, *alarm*, *collapse*) appears alongside explicit negation particles (*no*, *never*, *zero*, *not*, *false*), the model's self-attention layers prioritize the high-salience disaster keywords and predict high disaster probabilities ($p > 0.85$):
- *"Controlled burn conducted by municipal forestry department, absolutely no threat to residents."* $\to$ **Predicted Disaster ($p = 0.892$)** [FALSE POSITIVE]
- *"Police confirmed false alarm at Central Mall, building cleared and safe."* $\to$ **Predicted Disaster ($p = 0.914$)** [FALSE POSITIVE]
- *"Small tremor felt in town, but no injuries or structural damage reported."* $\to$ **Predicted Disaster ($p = 0.941$)** [FALSE POSITIVE]

### 5.2 Operational Mitigation for Backend Team
1. **Rule-Based Pre/Post-Filter:** Apply a regular expression pre-filter for recognized official clearance syntax (`"false alarm"`, `"all clear"`, `"no casualties reported"`, `"controlled burn"`).
2. **Model E Roadmap:** Future iterations will incorporate contrastive negation fine-tuning with hard-negative mining to resolve this failure mode.

---

## 6. Hardware & Performance Profile

| Execution Target | Batch Size | Inference Latency (Single Sample) | Throughput | Peak VRAM / Memory |
| :--- | :---: | :---: | :---: | :---: |
| **Intel CPU (10 threads)** | 1 | 26.05 ms (Mean) / 31.56 ms (P95) | ~38 req/sec | ~380 MB RAM |
| **Intel CPU (Batched)** | 32 | 320 ms / batch (~10 ms / sample) | ~100 req/sec | ~450 MB RAM |
| **RTX 5050 Laptop GPU (AMP BF16)** | 1 | ~1.8 – 2.5 ms | ~450 req/sec | ~1.2 GB VRAM |
| **RTX 5050 Laptop GPU (Batched)** | 32 | ~15 ms / batch (~0.47 ms / sample) | ~2,100 req/sec | ~1.6 GB VRAM |
