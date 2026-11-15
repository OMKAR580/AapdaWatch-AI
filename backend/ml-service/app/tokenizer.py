"""
AapdaWatch AI — JSON-Backed Keras-Compatible Tokenizer & Sequence Padder
Implements exact Keras tokenization semantics from recovered JSON artifacts without unpickling.
"""

import os
import json
import numpy as np
from typing import List, Dict, Tuple, Optional

DEFAULT_VOCAB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "artifacts", "staging", "tokenizer_vocab.json"
)
DEFAULT_CONFIG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "artifacts", "staging", "tokenizer_config.json"
)

class KerasCompatibleTokenizer:
    def __init__(self, vocab_path: str = DEFAULT_VOCAB_PATH, config_path: str = DEFAULT_CONFIG_PATH):
        if not os.path.exists(vocab_path):
            raise FileNotFoundError(f"Tokenizer vocab JSON not found at {vocab_path}")
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Tokenizer config JSON not found at {config_path}")

        with open(vocab_path, "r", encoding="utf-8") as f:
            vdata = json.load(f)
            self.word_index: Dict[str, int] = vdata.get("word_index", {})
            self.index_word: Dict[int, str] = {int(k): v for k, v in vdata.get("index_word", {}).items()}

        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
            self.num_words: int = cfg.get("num_words", 15000)
            self.filters: str = cfg.get("filters", '!"#$%&()*+,-./:;<=>?@[\\]^_`{|}~\t\n')
            self.lower: bool = cfg.get("lower", True)
            self.split: str = cfg.get("split", " ")
            self.char_level: bool = cfg.get("char_level", False)
            self.oov_token: str = cfg.get("oov_token", "<OOV>")
            self.document_count: int = cfg.get("document_count", 5988)

        self.oov_token_id: int = self.word_index.get(self.oov_token, 1)

        # Precompute character translation table for fast punctuation filtering
        # In Keras, each character in filters is replaced by space, or stripped
        self._filter_trans = str.maketrans({c: " " for c in self.filters})

    def text_to_word_sequence(self, text: str) -> List[str]:
        if not isinstance(text, str):
            return []
        if self.lower:
            text = text.lower()
        # Filter characters
        text = text.translate(self._filter_trans)
        # Split on whitespace/delimiter
        return [w for w in text.split(self.split) if w]

    def texts_to_sequences(self, texts: List[str]) -> List[List[int]]:
        sequences: List[List[int]] = []
        for text in texts:
            words = self.text_to_word_sequence(text)
            seq: List[int] = []
            for w in words:
                token_id = self.word_index.get(w)
                if token_id is not None:
                    if self.num_words is not None and token_id >= self.num_words:
                        if self.oov_token_id:
                            seq.append(self.oov_token_id)
                    else:
                        seq.append(token_id)
                elif self.oov_token_id:
                    seq.append(self.oov_token_id)
            sequences.append(seq)
        return sequences

    def pad_sequences(
        self,
        sequences: List[List[int]],
        maxlen: int = 30,
        padding: str = "post",
        truncating: str = "post",
        value: int = 0
    ) -> np.ndarray:
        """
        Pads sequences to maxlen with value (0 for Keras mask token).
        Supports both 'pre' and 'post' padding and truncating.
        """
        num_samples = len(sequences)
        padded = np.full((num_samples, maxlen), value, dtype=np.int32)

        for idx, s in enumerate(sequences):
            if not len(s):
                continue
            # Truncating
            if len(s) > maxlen:
                if truncating == "pre":
                    trunc = s[-maxlen:]
                else:
                    trunc = s[:maxlen]
            else:
                trunc = s

            # Padding
            if padding == "post":
                padded[idx, :len(trunc)] = trunc
            else:
                padded[idx, -len(trunc):] = trunc

        return padded

_TOKENIZER_INSTANCE = None

def get_tokenizer(vocab_path: str = DEFAULT_VOCAB_PATH, config_path: str = DEFAULT_CONFIG_PATH) -> KerasCompatibleTokenizer:
    global _TOKENIZER_INSTANCE
    if _TOKENIZER_INSTANCE is None:
        _TOKENIZER_INSTANCE = KerasCompatibleTokenizer(vocab_path, config_path)
    return _TOKENIZER_INSTANCE
