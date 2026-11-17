"""
AapdaWatch NLP v1.0 — Standalone Package Verification Test Suite
Tests all 10 required standalone functionality checks using ONLY files
inside delivery/AapdaWatch_NLP_v1.0/.
"""

import os
import sys
from pathlib import Path

# Restrict sys.path strictly to this package directory
PACKAGE_ROOT = str(Path(__file__).resolve().parent)
sys.path = [PACKAGE_ROOT] + [p for p in sys.path if "aapdawatch" not in p.lower() or "delivery" in p.lower()]

from inference.predict import DisasterClassifier, predict, predict_batch

def run_tests():
    print("=" * 70)
    print("AAPDAWATCH NLP v1.0 — STANDALONE PACKAGE INDEPENDENT TEST SUITE")
    print(f"Package Root: {PACKAGE_ROOT}")
    print("=" * 70)

    results = {}

    # Check 1 & 2: Model & Tokenizer loading
    print("\n[Check 1 & 2] Testing Model and Tokenizer Loading...")
    try:
        classifier = DisasterClassifier()
        assert classifier.model is not None, "Model failed to load"
        assert classifier.tokenizer is not None, "Tokenizer failed to load"
        print("  --> PASS: Model and tokenizer loaded successfully from local package.")
        results["check_1_model_loading"] = "PASS"
        results["check_2_tokenizer_loading"] = "PASS"
    except Exception as e:
        print(f"  --> FAIL: {e}")
        results["check_1_model_loading"] = "FAIL"
        results["check_2_tokenizer_loading"] = "FAIL"

    # Check 3: Disaster example classification
    print("\n[Check 3] Testing Disaster Example Classification...")
    try:
        disaster_text = "Massive wildfire rapidly spreading through residential hills, multiple homes burning."
        res_disaster = classifier.predict(disaster_text)
        assert res_disaster["predicted_class"] == 1, f"Expected Class 1, got {res_disaster['predicted_class']}"
        assert res_disaster["predicted_label"] == "Disaster", f"Expected 'Disaster', got {res_disaster['predicted_label']}"
        assert res_disaster["probability"] >= classifier.threshold, f"Probability {res_disaster['probability']} < threshold {classifier.threshold}"
        print(f"  --> PASS: Correctly classified as Disaster (P = {res_disaster['probability']}, Class = {res_disaster['predicted_class']})")
        results["check_3_disaster_classification"] = "PASS"
    except Exception as e:
        print(f"  --> FAIL: {e}")
        results["check_3_disaster_classification"] = "FAIL"

    # Check 4: Non-disaster example classification
    print("\n[Check 4] Testing Non-Disaster Example Classification...")
    try:
        casual_text = "Enjoying a lovely Sunday brunch with family in the backyard, delicious pancakes."
        res_casual = classifier.predict(casual_text)
        assert res_casual["predicted_class"] == 0, f"Expected Class 0, got {res_casual['predicted_class']}"
        assert res_casual["predicted_label"] == "Non-Disaster", f"Expected 'Non-Disaster', got {res_casual['predicted_label']}"
        assert res_casual["probability"] < classifier.threshold, f"Probability {res_casual['probability']} >= threshold {classifier.threshold}"
        print(f"  --> PASS: Correctly classified as Non-Disaster (P = {res_casual['probability']}, Class = {res_casual['predicted_class']})")
        results["check_4_non_disaster_classification"] = "PASS"
    except Exception as e:
        print(f"  --> FAIL: {e}")
        results["check_4_non_disaster_classification"] = "FAIL"

    # Check 5: Empty input rejection
    print("\n[Check 5] Testing Empty Input Rejection...")
    try:
        rejected = False
        try:
            classifier.predict("")
        except ValueError as e:
            rejected = True
            print(f"  --> Correctly caught ValueError: {e}")
        assert rejected, "Empty input was not rejected with ValueError"
        print("  --> PASS: Empty string rejected.")
        results["check_5_empty_input_rejection"] = "PASS"
    except Exception as e:
        print(f"  --> FAIL: {e}")
        results["check_5_empty_input_rejection"] = "FAIL"

    # Check 6: Whitespace-only input rejection
    print("\n[Check 6] Testing Whitespace-Only Input Rejection...")
    try:
        rejected = False
        try:
            classifier.predict("    \t\n   ")
        except ValueError as e:
            rejected = True
            print(f"  --> Correctly caught ValueError: {e}")
        assert rejected, "Whitespace-only input was not rejected with ValueError"
        print("  --> PASS: Whitespace-only string rejected.")
        results["check_6_whitespace_input_rejection"] = "PASS"
    except Exception as e:
        print(f"  --> FAIL: {e}")
        results["check_6_whitespace_input_rejection"] = "FAIL"

    # Check 7: Text exceeding supported input limit rejection
    print("\n[Check 7] Testing Text Exceeding Input Limit (> 1000 chars) Rejection...")
    try:
        oversized_text = "Severe emergency flood alert water rising. " * 30  # 43 chars * 30 = 1290 chars
        rejected = False
        try:
            classifier.predict(oversized_text)
        except ValueError as e:
            rejected = True
            print(f"  --> Correctly caught ValueError: {e}")
        assert rejected, "Oversized input was not rejected with ValueError"
        print("  --> PASS: Oversized text (>1000 characters) rejected.")
        results["check_7_oversized_input_rejection"] = "PASS"
    except Exception as e:
        print(f"  --> FAIL: {e}")
        results["check_7_oversized_input_rejection"] = "FAIL"

    # Check 8: Probability remains between 0 and 1
    print("\n[Check 8] Testing Probability Range Bounds [0.0, 1.0]...")
    try:
        samples = [
            "Emergency chemical spill near industrial dock.",
            "Sunny day walking the dog in the park.",
            "Tornado sirens sounding across metropolitan area.",
            "Reading a good book at the library."
        ]
        all_bounded = True
        for s in samples:
            out = classifier.predict(s)
            p = out["probability"]
            if not (0.0 <= p <= 1.0):
                all_bounded = False
                print(f"  --> Out of bounds: P = {p}")
        assert all_bounded, "Probability out of bounds [0, 1]"
        print("  --> PASS: All probabilities strictly bounded in [0.0, 1.0].")
        results["check_8_probability_bounds"] = "PASS"
    except Exception as e:
        print(f"  --> FAIL: {e}")
        results["check_8_probability_bounds"] = "FAIL"

    # Check 9: Threshold is exactly 0.43
    print("\n[Check 9] Testing Calibrated Threshold (tau == 0.43)...")
    try:
        assert classifier.threshold == 0.43, f"Expected threshold 0.43, got {classifier.threshold}"
        # Check against threshold_config.json
        with open(Path(PACKAGE_ROOT) / "config" / "threshold_config.json", "r", encoding="utf-8") as f:
            cfg = __import__("json").load(f)
        assert cfg["selected_threshold"] == 0.43, f"threshold_config.json selected_threshold is {cfg['selected_threshold']}"
        print(f"  --> PASS: Calibrated threshold is exactly {classifier.threshold}.")
        results["check_9_threshold_exactness"] = "PASS"
    except Exception as e:
        print(f"  --> FAIL: {e}")
        results["check_9_threshold_exactness"] = "FAIL"

    # Check 10: Repeated predictions are consistent (Determinism)
    print("\n[Check 10] Testing Repeated Prediction Consistency...")
    try:
        query = "Flash flood warning for coastal highway, vehicles trapped."
        first_run = classifier.predict(query)
        deterministic = True
        for i in range(5):
            repeated_run = classifier.predict(query)
            if repeated_run["probability"] != first_run["probability"] or repeated_run["predicted_class"] != first_run["predicted_class"]:
                deterministic = False
                print(f"  --> Inconsistency at iteration {i}: {repeated_run['probability']} vs {first_run['probability']}")
        assert deterministic, "Non-deterministic output detected across runs"
        print(f"  --> PASS: 5 repeated evaluations identical (P = {first_run['probability']}, Class = {first_run['predicted_class']}).")
        results["check_10_consistency"] = "PASS"
    except Exception as e:
        print(f"  --> FAIL: {e}")
        results["check_10_consistency"] = "FAIL"

    print("\n" + "=" * 70)
    print("STANDALONE TEST RESULTS SUMMARY:")
    all_passed = True
    for k, v in results.items():
        print(f"  {k:<40}: {v}")
        if v != "PASS":
            all_passed = False
    print("=" * 70)
    print(f"ALL 10 CHECKS PASSED: {all_passed}")
    return all_passed

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
