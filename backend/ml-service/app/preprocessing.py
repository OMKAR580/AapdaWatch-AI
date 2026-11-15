"""
AapdaWatch AI — Text Preprocessing Pipelines
Includes both the original exported preprocessing implementation and the
candidate corrected normalization pipeline for empirical comparison.
"""

import re
import html
import unicodedata

def candidate_normalize_text(text: str) -> str:
    """
    Candidate corrected text normalization pipeline.
    Uses single-backslash regex patterns inside raw string literals so that
    URLs, user mentions, hashtags, and whitespace are properly parsed.
    """
    if not isinstance(text, str):
        return ""

    text = html.unescape(text)
    text = unicodedata.normalize("NFKC", text)
    text = text.lower()
    # Corrected regex for HTTP/HTTPS/WWW URLs:
    text = re.sub(r"https?://\S+|www\.\S+", " urltoken ", text)
    # Corrected regex for Twitter/social @mentions:
    text = re.sub(r"@\w+", " usertoken ", text)
    # Corrected regex for hashtags (preserves word text, removes #):
    text = re.sub(r"#([a-zA-Z0-9_]+)", r"\1", text)
    # Corrected regex for collapsing multiple whitespace characters:
    text = re.sub(r"\s+", " ", text)

    return text.strip()

def original_normalize_text(text: str) -> str:
    """
    Exact replica of E:\\NLP\\ML_model\\preprocessing.py.
    Preserved for empirical auditing and provenance regression testing.
    Note: Contains double-backslash raw-string bug.
    """
    if not isinstance(text, str):
        return ""

    text = html.unescape(text)
    text = unicodedata.normalize("NFKC", text)
    text = text.lower()
    text = re.sub(r"https?://\\S+|www\\.\\S+", " urltoken ", text)
    text = re.sub(r"@\\w+", " usertoken ", text)
    text = re.sub(r"#([a-zA-Z0-9_]+)", r"\\1", text)
    text = re.sub(r"\\s+", " ", text)

    return text.strip()

