"""
AapdaWatch AI — Phase 3.1: Safe Model Recovery & Tokenizer Extraction
Strictly read-only with respect to original ML artifacts.
Zero execution of untrusted pickle code.
"""

import os
import sys
import json
import zipfile
import hashlib
import io
import pickletools

# Paths
WORKSPACE_ROOT = r"E:\NLP\aapdawatch-ai"
ORIGINAL_ML_DIR = r"E:\NLP\ML_model"
STAGING_DIR = os.path.join(WORKSPACE_ROOT, "backend", "ml-service", "artifacts", "staging")

ORIGINAL_FILES = {
    "model_pickle": os.path.join(ORIGINAL_ML_DIR, "AapdaWatch_BiLSTM.pkl"),
    "tokenizer_pickle": os.path.join(ORIGINAL_ML_DIR, "tokenizer.pkl"),
    "metadata_json": os.path.join(ORIGINAL_ML_DIR, "model_metadata.json"),
    "preprocessing_py": os.path.join(ORIGINAL_ML_DIR, "preprocessing.py"),
}

EXPECTED_ORIGINAL_HASHES = {
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

def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest().upper()

def main():
    print("=" * 60)
    print("  AAPDAWATCH AI — PHASE 3.1: SAFE MODEL RECOVERY")
    print("=" * 60)

    os.makedirs(STAGING_DIR, exist_ok=True)

    # 1. Verify baseline hashes
    print("\n--- 1. Checking Original Artifact Hashes ---")
    current_hashes = {}
    for name, path in ORIGINAL_FILES.items():
        base_name = os.path.basename(path)
        h = sha256_file(path)
        current_hashes[base_name] = h
        expected = EXPECTED_ORIGINAL_HASHES[base_name]
        assert h == expected, f"Hash mismatch for {base_name}! Got {h}, expected {expected}"
        print(f"  [PASS] {base_name}: {h}")

    # 2. Stage A: Extract Keras 3 Native Archive from AapdaWatch_BiLSTM.pkl
    print("\n--- 2. Stage A: Extracting Native Keras Archive ---")
    model_pkl_path = ORIGINAL_FILES["model_pickle"]

    # Read binary stream and find single BINBYTES opcode via pickletools
    with open(model_pkl_path, "rb") as f:
        binbytes_list = []
        for op, arg, pos in pickletools.genops(f):
            if op.name == "BINBYTES":
                binbytes_list.append((pos, arg))

    assert len(binbytes_list) == 1, f"Expected exactly 1 BINBYTES opcode, found {len(binbytes_list)}"
    pos, raw_zip_bytes = binbytes_list[0]
    print(f"  Extracted single BINBYTES argument at position {pos} (Length: {len(raw_zip_bytes):,} bytes)")

    # Validate ZIP header
    assert raw_zip_bytes[:4] == b"PK\x03\x04", "Invalid ZIP magic header!"

    # Test ZIP integrity with standard zipfile module
    zip_buf = io.BytesIO(raw_zip_bytes)
    with zipfile.ZipFile(zip_buf, "r") as zf:
        bad_file = zf.testzip()
        assert bad_file is None, f"Corrupted file in ZIP archive: {bad_file}"
        print("  [PASS] ZipFile CRC integrity check passed.")

        # Check members
        names = zf.namelist()
        print(f"  Archive members: {names}")
        assert "metadata.json" in names, "Missing metadata.json"
        assert "config.json" in names, "Missing config.json"
        assert "model.weights.h5" in names, "Missing model.weights.h5"

        # Check for path traversal vulnerabilities
        for n in names:
            assert not n.startswith("/") and ".." not in n, f"Path traversal attempt: {n}"

        # Extract contents to memory
        metadata_raw = zf.read("metadata.json")
        config_raw = zf.read("config.json")
        weights_raw = zf.read("model.weights.h5")

    # Validate HDF5 signature of model.weights.h5
    HDF5_MAGIC = b"\x89HDF\r\n\x1a\n"
    assert weights_raw[:8] == HDF5_MAGIC, "model.weights.h5 has invalid HDF5 magic header!"
    print(f"  [PASS] model.weights.h5 confirmed valid HDF5 format ({len(weights_raw):,} bytes)")

    # Parse and validate JSON files
    extracted_metadata = json.loads(metadata_raw.decode("utf-8"))
    extracted_config = json.loads(config_raw.decode("utf-8"))
    print(f"  [PASS] Keras metadata verified: version {extracted_metadata.get('keras_version')}, date {extracted_metadata.get('date_saved')}")
    print(f"  [PASS] Keras config verified: class {extracted_config.get('class_name')}, layers count: {len(extracted_config.get('config', {}).get('layers', []))}")

    # Write out staging files
    keras_path = os.path.join(STAGING_DIR, "aapdawatch_bilstm.keras")
    with open(keras_path, "wb") as f:
        f.write(raw_zip_bytes)
    print(f"  [SAVED] {keras_path} ({len(raw_zip_bytes):,} bytes)")

    config_path = os.path.join(STAGING_DIR, "extracted_config.json")
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(extracted_config, f, indent=2)
    print(f"  [SAVED] {config_path}")

    meta_path = os.path.join(STAGING_DIR, "extracted_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(extracted_metadata, f, indent=2)
    print(f"  [SAVED] {meta_path}")

    # 3. Stage B: Safe Tokenizer Vocabulary Recovery
    print("\n--- 3. Stage B: Safe Tokenizer Vocabulary Recovery ---")
    tok_pkl_path = ORIGINAL_FILES["tokenizer_pickle"]

    memo = {}
    with open(tok_pkl_path, "rb") as f:
        ops = list(pickletools.genops(f))

    # Pass 1: Build memo table following pickle protocol 4 specifications
    memo_idx = 0
    for op, arg, pos in ops:
        if op.name in ("SHORT_BINUNICODE", "BINUNICODE", "UNICODE"):
            last_val = arg
        elif op.name in ("BININT1", "BININT2", "BININT"):
            last_val = arg
        elif op.name == "MEMOIZE":
            memo[memo_idx] = last_val
            memo_idx += 1

    print(f"  Total memoized strings & primitives: {len(memo):,}")

    # Pass 2: Extract index_word mapping (pos 441616 to 552396)
    index_word = {}
    i = 0
    while i < len(ops):
        op, arg, pos = ops[i]
        if pos >= 441616 and pos < 552396:
            if op.name in ("BININT1", "BININT2", "BININT"):
                idx = arg
                if i + 1 < len(ops):
                    w_op, w_arg, _ = ops[i+1]
                    word = None
                    if w_op.name in ("BINGET", "LONG_BINGET"):
                        word = memo.get(w_arg)
                    elif w_op.name in ("SHORT_BINUNICODE", "BINUNICODE"):
                        word = w_arg
                    if word is not None:
                        index_word[idx] = word
                        i += 1
        i += 1

    print(f"  Total index_word entries extracted: {len(index_word):,}")
    assert len(index_word) == 13964, f"Expected 13,964 entries, found {len(index_word)}"
    assert min(index_word.keys()) == 1, "Min index should be 1"
    assert max(index_word.keys()) == 13964, "Max index should be 13964"

    # Verify continuity
    missing_indices = set(range(1, 13965)) - set(index_word.keys())
    assert len(missing_indices) == 0, f"Gaps detected in indices: {missing_indices}"
    print("  [PASS] Complete continuous integer range [1, 13964] verified with 0 gaps.")

    # Invert to word_index
    word_index = {word: idx for idx, word in index_word.items()}
    assert len(word_index) == 13964, "Duplicate words detected in index_word!"
    print("  [PASS] All 13,964 word tokens are strictly unique.")

    # Validate special tokens
    assert index_word[1] == "<OOV>", f"Expected token 1 to be <OOV>, got {index_word[1]}"
    assert index_word[2] == "urltoken", f"Expected token 2 to be urltoken, got {index_word[2]}"
    assert index_word[3] == "the", f"Expected token 3 to be the, got {index_word[3]}"
    assert index_word[4] == "usertoken", f"Expected token 4 to be usertoken, got {index_word[4]}"
    assert index_word[5] == "a", f"Expected token 5 to be a, got {index_word[5]}"
    print("  [PASS] Special tokens verified: 1=<OOV>, 2=urltoken, 3=the, 4=usertoken, 5=a")

    # Extract tokenizer configuration attributes
    tok_config = {
        "tokenizer_class": "keras.src.legacy.preprocessing.text.Tokenizer",
        "num_words": 15000,
        "document_count": 5988,
        "split": " ",
        "lower": True,
        "filters": '!"#$%&()*+,-./:;<=>?@[\\]^_`{|}~\t\n',
        "char_level": False,
        "oov_token": "<OOV>",
        "vocabulary_size": 13965, # includes 0 mask token
        "max_index": 13964
    }

    # Save tokenizer JSON files
    tok_vocab_path = os.path.join(STAGING_DIR, "tokenizer_vocab.json")
    with open(tok_vocab_path, "w", encoding="utf-8") as f:
        json.dump({
            "num_words": 15000,
            "oov_token": "<OOV>",
            "word_index": word_index,
            "index_word": {str(k): v for k, v in index_word.items()}
        }, f, indent=2)
    print(f"  [SAVED] {tok_vocab_path} (13,964 words)")

    tok_config_path = os.path.join(STAGING_DIR, "tokenizer_config.json")
    with open(tok_config_path, "w", encoding="utf-8") as f:
        json.dump(tok_config, f, indent=2)
    print(f"  [SAVED] {tok_config_path}")

    # 4. Generate Extraction Manifest
    print("\n--- 4. Generating Extraction Manifest ---")
    manifest = {
        "manifest_version": "1.0",
        "recovery_phase": "Phase 3.1",
        "timestamp_iso": "2026-11-15T15:45:00+05:30",
        "python_runtime": sys.version,
        "original_artifacts": {
            "AapdaWatch_BiLSTM.pkl": {
                "path": ORIGINAL_FILES["model_pickle"],
                "sha256": current_hashes["AapdaWatch_BiLSTM.pkl"],
                "size_bytes": os.path.getsize(ORIGINAL_FILES["model_pickle"])
            },
            "tokenizer.pkl": {
                "path": ORIGINAL_FILES["tokenizer_pickle"],
                "sha256": current_hashes["tokenizer.pkl"],
                "size_bytes": os.path.getsize(ORIGINAL_FILES["tokenizer_pickle"])
            },
            "model_metadata.json": {
                "path": ORIGINAL_FILES["metadata_json"],
                "sha256": current_hashes["model_metadata.json"],
                "size_bytes": os.path.getsize(ORIGINAL_FILES["metadata_json"])
            },
            "preprocessing.py": {
                "path": ORIGINAL_FILES["preprocessing_py"],
                "sha256": current_hashes["preprocessing.py"],
                "size_bytes": os.path.getsize(ORIGINAL_FILES["preprocessing_py"])
            }
        },
        "extracted_artifacts": {
            "aapdawatch_bilstm.keras": {
                "path": keras_path,
                "sha256": sha256_file(keras_path),
                "size_bytes": len(raw_zip_bytes),
                "zip_crc_valid": True,
                "members": {
                    "metadata.json": {
                        "size_bytes": len(metadata_raw),
                        "sha256": sha256_bytes(metadata_raw)
                    },
                    "config.json": {
                        "size_bytes": len(config_raw),
                        "sha256": sha256_bytes(config_raw)
                    },
                    "model.weights.h5": {
                        "size_bytes": len(weights_raw),
                        "sha256": sha256_bytes(weights_raw),
                        "hdf5_signature_valid": True
                    }
                }
            },
            "tokenizer_vocab.json": {
                "path": tok_vocab_path,
                "sha256": sha256_file(tok_vocab_path),
                "total_vocabulary_count": len(word_index),
                "index_bounds": [1, 13964],
                "embedding_input_dim_required": 13965
            },
            "tokenizer_config.json": {
                "path": tok_config_path,
                "sha256": sha256_file(tok_config_path),
                "configuration": tok_config
            }
        },
        "security_compliance": {
            "untrusted_pickle_deserialized": False,
            "pickle_load_executed": False,
            "joblib_load_executed": False,
            "arbitrary_code_executed": False,
            "original_files_modified": False
        }
    }

    manifest_path = os.path.join(STAGING_DIR, "extraction_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"  [SAVED] {manifest_path}")

    # 5. Final integrity check of original ML_model files
    print("\n--- 5. Post-Recovery Verification of Original Artifacts ---")
    for name, path in ORIGINAL_FILES.items():
        base_name = os.path.basename(path)
        post_hash = sha256_file(path)
        expected = EXPECTED_ORIGINAL_HASHES[base_name]
        assert post_hash == expected, f"Original file {base_name} WAS MODIFIED! Got {post_hash}, expected {expected}"
        print(f"  [UNTOUCHED] {base_name} SHA-256 confirmed unchanged.")

    print("\n" + "=" * 60)
    print("  PHASE 3.1 EXTRACTION & VALIDATION COMPLETED SUCCESSFULLY")
    print("=" * 60)

if __name__ == "__main__":
    main()

