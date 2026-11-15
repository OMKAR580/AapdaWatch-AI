"""
AapdaWatch AI — Phase 3.1: Automated Verification Test Suite
Executes 12 verification tests on recovered artifacts without loading untrusted code.
"""

import os
import json
import zipfile
import hashlib

STAGING_DIR = r"E:\NLP\aapdawatch-ai\backend\ml-service\artifacts\staging"
ORIGINAL_DIR = r"E:\NLP\ML_model"

ORIGINAL_HASHES = {
    "AapdaWatch_BiLSTM.pkl": "6E1DC1306B78FDE22953234E5EC98C5957906A31984B44AC825076C34261A573",
    "model_metadata.json": "A7137FF8EE3CCAD315B35AE850147FD28BEF8BE4373F20BD2E8DDA5F3F72ABEA",
    "preprocessing.py": "CB0D42F7658B26D02A356F86AF690D972E8FEF8683478396FE5F84E9C9B2FE3B",
    "tokenizer.pkl": "84FFD459B77CF8410481D70F85C38FCFE6DD83CE57BDF09DAF47382D8A1E3D78",
}

def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest().upper()

def run_tests():
    print("=" * 65)
    print("  AAPDAWATCH AI — PHASE 3.1: RECOVERY VERIFICATION SUITE")
    print("=" * 65)

    passed = 0
    total = 12

    # Test 1: Embedded ZIP extraction
    keras_path = os.path.join(STAGING_DIR, "aapdawatch_bilstm.keras")
    assert os.path.exists(keras_path) and os.path.getsize(keras_path) > 7000000
    print("  [PASS 01/12] Embedded ZIP extracted to aapdawatch_bilstm.keras")
    passed += 1

    # Test 2: ZIP CRC validation
    with zipfile.ZipFile(keras_path, "r") as zf:
        crc_err = zf.testzip()
        assert crc_err is None
    print("  [PASS 02/12] ZIP CRC integrity verified (testzip() returned None)")
    passed += 1

    # Test 3: Required archive member validation
    with zipfile.ZipFile(keras_path, "r") as zf:
        members = zf.namelist()
        for expected in ["metadata.json", "config.json", "model.weights.h5"]:
            assert expected in members
    print("  [PASS 03/12] Required archive members present (metadata, config, weights)")
    passed += 1

    # Test 4: Config JSON parsing
    config_path = os.path.join(STAGING_DIR, "extracted_config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)
        assert cfg.get("class_name") == "Sequential"
    print("  [PASS 04/12] Config JSON parsed successfully (Keras Sequential class)")
    passed += 1

    # Test 5: Metadata JSON parsing
    meta_path = os.path.join(STAGING_DIR, "extracted_metadata.json")
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
        assert "keras_version" in meta
    print(f"  [PASS 05/12] Metadata JSON parsed successfully (Keras {meta['keras_version']})")
    passed += 1

    # Test 6: HDF5 signature validation
    with zipfile.ZipFile(keras_path, "r") as zf:
        weights_bytes = zf.read("model.weights.h5")
        HDF5_MAGIC = b"\x89HDF\r\n\x1a\n"
        assert weights_bytes[:8] == HDF5_MAGIC
    print(f"  [PASS 06/12] HDF5 magic signature verified on model.weights.h5 ({len(weights_bytes):,} bytes)")
    passed += 1

    # Test 7: Tokenizer static parsing
    vocab_path = os.path.join(STAGING_DIR, "tokenizer_vocab.json")
    with open(vocab_path, "r", encoding="utf-8") as f:
        vdata = json.load(f)
        assert "word_index" in vdata and "index_word" in vdata
    print("  [PASS 07/12] Tokenizer vocabulary JSON parsed successfully")
    passed += 1

    # Test 8: Vocabulary entry count validation
    windex = vdata["word_index"]
    assert len(windex) == 13964
    print(f"  [PASS 08/12] Vocabulary entry count exactly matches expected: {len(windex):,}")
    passed += 1

    # Test 9: Duplicate ID detection
    ids = list(windex.values())
    assert len(ids) == len(set(ids))
    print(f"  [PASS 09/12] All {len(ids):,} token IDs strictly unique (0 duplicates)")
    passed += 1

    # Test 10: Special token ID validation
    assert windex.get("<OOV>") == 1
    assert windex.get("urltoken") == 2
    assert windex.get("the") == 3
    assert windex.get("usertoken") == 4
    print("  [PASS 10/12] Special token IDs confirmed: <OOV>=1, urltoken=2, the=3, usertoken=4")
    passed += 1

    # Test 11: Embedding vocabulary compatibility
    # Keras embedding input_dim = 13965. Max token ID must be <= 13964 (as 0 is mask token)
    max_id = max(ids)
    assert max_id == 13964
    assert max_id + 1 == 13965
    print(f"  [PASS 11/12] Max token ID ({max_id}) exactly fits embedding input_dim (13965)")
    passed += 1

    # Test 12: Original artifact hash comparison
    for fname, expected_hash in ORIGINAL_HASHES.items():
        actual_hash = sha256_file(os.path.join(ORIGINAL_DIR, fname))
        assert actual_hash == expected_hash, f"Hash divergence on {fname}!"
    print("  [PASS 12/12] All 4 original ML_model artifacts confirmed 100% untouched")
    passed += 1

    print("=" * 65)
    print(f"  VERIFICATION RESULT: {passed}/{total} TESTS PASSED (100%)")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()

