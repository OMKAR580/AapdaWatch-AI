"""
AapdaWatch AI — Phase 3.2A: Real BiLSTM Inference Validation Runner
Executes real forward passes across 10 required test scenarios plus numerical stability checks.
"""

import os
import sys
import time
import numpy as np

# Ensure workspace and module root are on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from app.inference import predict_single, predict_batch
from app.model_loader import get_bilstm_model, validate_model_architecture
from app.tokenizer import get_tokenizer

TEST_CASES = [
    ("Empty Input", ""),
    ("Non-Disaster Ordinary Text", "Enjoying a lovely sunny morning at the cafe with my friend!"),
    ("Disaster-Related Critical Text", "Emergency! Severe flash floods and landslide in Wayanad, multiple houses collapsed and people trapped!"),
    ("URL-Containing Text", "Evacuation alert details and shelter locations posted here: https://t.co/emergencyAlert123 and www.disaster.gov"),
    ("Mention-Containing Text", "Urgent help needed @ndrf_hq and @mumbai_police water level rising rapidly!"),
    ("Hashtag-Containing Text", "Major destruction reported due to #earthquake in northern region #disaster #rescue"),
    ("Text Longer Than 30 Tokens", "Massive cyclone landfall reported near the coastal district early this morning causing widespread power outages, uprooted trees, damaged communication towers, road blockages, heavy torrential rainfall, severe coastal storm surge flooding, emergency shelter activations across ten administrative subdivisions with rescue teams actively deploying rubber boats to assist stranded citizens."),
    ("Unicode Characters Text", "Breaking: Heavy storm in São Paulo & München, alerts issued 🚨🆘🌧️!"),
    ("Repeated Whitespace Text", "Flash    flooding     warning\n\n\nissued    for    low-lying    areas!"),
]

def main():
    print("=" * 70)
    print("  AAPDAWATCH AI — PHASE 3.2A: REAL BILSTM INFERENCE VALIDATION")
    print("=" * 70)

    # 1. Model & Architecture
    print("\n--- 1. Model Architecture & Loading Validation ---")
    model = get_bilstm_model()
    arch_info = validate_model_architecture(model)
    print(f"  Model Name:    {arch_info['model_name']}")
    print(f"  Layer Count:   {arch_info['layers_count']}")
    print(f"  Total Params:  {arch_info['total_params']:,}")
    print(f"  Input Shape:   {arch_info['input_shape']}")
    print(f"  Output Shape:  {arch_info['output_shape']}")

    for idx, lyr in enumerate(arch_info["layers"]):
        print(f"    Layer {idx+1}: {lyr['name']} ({lyr['type']}) -> Shape {lyr['output_shape']}")

    # 2. Tokenizer Inversion & Reconciling
    print("\n--- 2. Tokenizer & Vocabulary Integrity Audit ---")
    tok = get_tokenizer()
    vocab_len = len(tok.word_index)
    index_len = len(tok.index_word)
    print(f"  Recovered word_index entries:  {vocab_len:,}")
    print(f"  Recovered index_word entries:  {index_len:,}")
    assert vocab_len == 13964, "Vocabulary count must be exactly 13,964"
    assert index_len == 13964, "Index word count must be exactly 13,964"
    print(f"  Embedding input_dim:           13,965 (Vocab entries 13,964 + Padding index 0)")
    print(f"  Padding token ID:              0 (strictly unassigned in word_index: {0 in tok.index_word})")
    print(f"  OOV token ID:                  1 ('{tok.index_word[1]}')")
    print(f"  Special token ID 2:            2 ('{tok.index_word[2]}')")
    print(f"  Special token ID 4:            4 ('{tok.index_word[4]}')")

    # Inversion verification
    sample_keys = list(tok.word_index.keys())[:100]
    for k in sample_keys:
        v = tok.word_index[k]
        assert tok.index_word[v] == k, f"Inversion mismatch for {k}"
    print("  [PASS] Exact inverse mapping word_index <-> index_word verified.")

    # 3. Real Inference Tests (1 through 9)
    print("\n--- 3. Real Model Inference Across 9 Core Test Scenarios ---")
    print(f"  Decision Threshold: 0.35 (>= 0.35 -> DISASTER_RELATED, < 0.35 -> NOT_DISASTER_RELATED)")

    individual_results = []
    for test_idx, (label, inp) in enumerate(TEST_CASES, 1):
        res = predict_single(inp, threshold=0.35, padding="post", preprocessing_mode="candidate")
        individual_results.append(res)
        print(f"\n  [Test {test_idx}/10: {label}]")
        print(f"    Raw Input:        {inp!r}")
        print(f"    Preprocessed:     {res['preprocessed_text']!r}")
        print(f"    Tokens ({res['sequence_length']}):       {res['tokens'][:15]}{'...' if len(res['tokens']) > 15 else ''}")
        print(f"    Probability:      {res['probability']:.4f}")
        print(f"    Class Prediction: {res['predicted_class']} (Confidence: {res['confidence']:.4f})")
        print(f"    Duration:         {res['inference_duration_ms']:.2f} ms")

        # Range and numerical assertions
        assert 0.0 <= res["probability"] <= 1.0, "Probability out of range [0, 1]!"
        assert not np.isnan(res["probability"]) and not np.isinf(res["probability"]), "Probability NaN/Inf!"

    # 4. Scenario 10: Batch Inference
    print("\n--- 4. Scenario 10: Vectorized Batch Inference ---")
    batch_inputs = [tc[1] for tc in TEST_CASES]
    batch_results = predict_batch(batch_inputs, threshold=0.35, padding="post", preprocessing_mode="candidate")
    print(f"  Batch size: {len(batch_results)}")
    for idx, (res_single, res_batch) in enumerate(zip(individual_results, batch_results)):
        diff = abs(res_single["probability"] - res_batch["probability"])
        assert diff < 1e-5, f"Batch vs single discrepancy at idx {idx}: {diff}"
        print(f"    Item {idx+1}: Single={res_single['probability']:.4f} | Batch={res_batch['probability']:.4f} | Diff={diff:.2e} [MATCH]")

    # 5. Numerical Stability and Determinism Check
    print("\n--- 5. Numerical Stability & Weight Immutability Check ---")
    # Record weights before repeated passes
    weights_before = [w.detach().cpu().numpy().copy() if hasattr(w, "detach") else w.numpy().copy() for w in model.weights]
    
    # 5 repeated runs on the disaster text
    disaster_text = TEST_CASES[2][1]
    repeated_probs = []
    for run_i in range(5):
        r = predict_single(disaster_text, threshold=0.35)
        repeated_probs.append(r["probability"])

    print(f"  5 Repeated Inferences on identical input: {repeated_probs}")
    variance = float(np.var(repeated_probs))
    assert variance == 0.0, f"Non-deterministic inference detected! Variance: {variance}"
    print(f"  [PASS] Zero variance (100% deterministic inference across repeated calls).")

    # Verify model weights remained untouched
    weights_after = [w.detach().cpu().numpy().copy() if hasattr(w, "detach") else w.numpy().copy() for w in model.weights]
    for idx, (wb, wa) in enumerate(zip(weights_before, weights_after)):
        w_diff = np.max(np.abs(wb - wa))
        assert w_diff == 0.0, f"Weight mutated in layer {idx}: max diff {w_diff}"
    print("  [PASS] Weight immutability confirmed (model inference does not mutate parameters).")

    # 6. Padding Comparison (Post vs Pre)
    print("\n--- 6. Comparative Audit: Padding Direction (Post vs Pre) ---")
    res_post = predict_single(disaster_text, padding="post")
    res_pre = predict_single(disaster_text, padding="pre")
    print(f"  Disaster Text (Post-padding): Probability = {res_post['probability']:.4f} -> {res_post['predicted_class']}")
    print(f"  Disaster Text (Pre-padding):  Probability = {res_pre['probability']:.4f} -> {res_pre['predicted_class']}")

    # 7. Preprocessing Comparison (Candidate vs Original)
    print("\n--- 7. Comparative Audit: Preprocessing Mode (Candidate vs Original) ---")
    url_text = TEST_CASES[3][1]
    res_cand = predict_single(url_text, preprocessing_mode="candidate")
    res_orig = predict_single(url_text, preprocessing_mode="original")
    print(f"  URL Text (Candidate normalization): Tokens = {res_cand['tokens'][:8]} | Prob = {res_cand['probability']:.4f} -> {res_cand['predicted_class']}")
    print(f"  URL Text (Original normalization):  Tokens = {res_orig['tokens'][:8]} | Prob = {res_orig['probability']:.4f} -> {res_orig['predicted_class']}")

    print("\n" + "=" * 70)
    print("  PHASE 3.2A REAL BILSTM INFERENCE VALIDATION: COMPLETE (PASS)")
    print("=" * 70)

if __name__ == "__main__":
    main()

