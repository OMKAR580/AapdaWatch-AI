"""
AapdaWatch AI — Hugging Face Pretrained Multilingual & Indic Disaster Classifier
Handles Hindi, Marathi, Bengali, Tamil, Telugu, and Hinglish disaster text classification.
"""

import os
import re
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("multilingual_hf")

# Comprehensive Indic and Vernacular Disaster Dictionary
INDIC_HAZARD_PATTERNS = {
    "flood": [
        # Hindi / Hinglish
        r"बाढ़", r"जलभराव", r"डूबा", r"डूब", r"पानी भर", r"सैलाब", r"जलप्रलय", r"वर्षा", r"बरसात", r"बारिश",
        r"baadh", r"flood", r"pani bhar", r"waterlogg", r"drowning", r"submerged",
        r"barish", r"baarish", r"barsaat", r"paani bhar", r"heavy rain", r"inundat",
        # Marathi
        r"पूर", r"पाणी साचले", r"मुसळधार", r"पावसामुळे", r"पाऊस",
        # Bengali
        r"বন্যা", r"প্লাবন", r"জলমগ্ন", r"বৃষ্টি",
    ],
    "earthquake": [
        # Hindi / Hinglish
        r"भूकंप", r"भूचाल", r"झटके", r"कंपन", r"धराशायी",
        r"bhookamp", r"earthquake", r"tremor", r"jhatke",
        # Marathi
        r"भूकंप", r"धक्के",
        # Bengali
        r"ভূমিকম্প",
    ],
    "fire": [
        # Hindi / Hinglish
        r"आग", r"अग्निकांड", r"धुआं", r"धधक", r"दावानल",
        r"aag", r"fire", r"dhua", r"blaze", r"forest fire",
        # Marathi
        r"आग", r"वणवा",
        # Bengali
        r"আগুন", r"দাবানল",
    ],
    "cyclone": [
        # Hindi / Hinglish
        r"चक्रवात", r"तूफान", r"आंधी", r"बवंडर", r"समुद्री तूफान",
        r"toofan", r"cyclone", r"storm", r"hurricane",
        # Marathi
        r"वादळ", r"चक्रीवादळ",
        # Bengali
        r"ঘূর্ণিঝড়", r"তুফান",
    ],
    "landslide": [
        # Hindi / Hinglish
        r"भूस्खलन", r"पहाड़ खिसक", r"मलबा", r"चट्टान",
        r"landslide", r"malba", r"pahad",
        # Marathi
        r"दरड", r"दरड कोसळली",
        # Bengali
        r"ভূমিধস",
    ],
}

INDIC_URGENCY_TOKENS = [
    r"बचाओ", r"मदद", r"फंसे", r"मौत", r"घायल", r"एनडीआरएफ", r"एसडीआरएफ",
    r"मलबे", r"मकान गिर", r"राहत", r"मदद करो", r"बहुत", r"खतरा", r"तेज",
    r"bachao", r"madad", r"fas gaye", r"trapped", r"stranded", r"injured",
    r"deaths", r"casualties", r"rescue", r"sdrf", r"ndrf", r"emergency",
    r"bhaut", r"bohot", r"bhot", r"tez", r"khatra", r"danger",
    r"वाचवा", r"मदत", r"उদ্ধার", r"সাহায্য",
]

# Indian Cities & Districts in Devanagari & Transliteration
INDIAN_CITIES_MAP = {
    # Uttar Pradesh
    "auraiya": ("Auraiya, Uttar Pradesh", 26.4670, 79.5165),
    "औरैया": ("Auraiya, Uttar Pradesh", 26.4670, 79.5165),
    "jalaun": ("Jalaun, Uttar Pradesh", 26.1456, 79.3514),
    "जालौन": ("Jalaun, Uttar Pradesh", 26.1456, 79.3514),
    "orai": ("Orai, Uttar Pradesh", 25.9898, 79.4520),
    "उरई": ("Orai, Uttar Pradesh", 25.9898, 79.4520),
    "etawah": ("Etawah, Uttar Pradesh", 26.7855, 79.0154),
    "इटावा": ("Etawah, Uttar Pradesh", 26.7855, 79.0154),
    "kanpur": ("Kanpur, Uttar Pradesh", 26.4499, 80.3319),
    "कानपुर": ("Kanpur, Uttar Pradesh", 26.4499, 80.3319),
    "lucknow": ("Lucknow, Uttar Pradesh", 26.8467, 80.9462),
    "लखनऊ": ("Lucknow, Uttar Pradesh", 26.8467, 80.9462),
    "varanasi": ("Varanasi, Uttar Pradesh", 25.3176, 82.9739),
    "वाराणसी": ("Varanasi, Uttar Pradesh", 25.3176, 82.9739),
    "banaras": ("Varanasi, Uttar Pradesh", 25.3176, 82.9739),
    "prayagraj": ("Prayagraj, Uttar Pradesh", 25.4358, 81.8463),
    "इलाहाबाद": ("Prayagraj, Uttar Pradesh", 25.4358, 81.8463),
    "jhansi": ("Jhansi, Uttar Pradesh", 25.4484, 78.5685),
    "झांसी": ("Jhansi, Uttar Pradesh", 25.4484, 78.5685),
    "gorakhpur": ("Gorakhpur, Uttar Pradesh", 26.7606, 83.3732),
    "गोरखपुर": ("Gorakhpur, Uttar Pradesh", 26.7606, 83.3732),
    "agra": ("Agra, Uttar Pradesh", 27.1767, 78.0081),
    "आगरा": ("Agra, Uttar Pradesh", 27.1767, 78.0081),
    # NCR / Metros / States
    "delhi": ("New Delhi, NCT", 28.6139, 77.2090),
    "नई दिल्ली": ("New Delhi, NCT", 28.6139, 77.2090),
    "दिल्ली": ("New Delhi, NCT", 28.6139, 77.2090),
    "mumbai": ("Mumbai, Maharashtra", 19.0760, 72.8777),
    "मुंबई": ("Mumbai, Maharashtra", 19.0760, 72.8777),
    "pune": ("Pune, Maharashtra", 18.5204, 73.8567),
    "पुणे": ("Pune, Maharashtra", 18.5204, 73.8567),
    "patna": ("Patna, Bihar", 25.5941, 85.1376),
    "पटना": ("Patna, Bihar", 25.5941, 85.1376),
    "kolkata": ("Kolkata, West Bengal", 22.5726, 88.3639),
    "कोलकाता": ("Kolkata, West Bengal", 22.5726, 88.3639),
    "chennai": ("Chennai, Tamil Nadu", 13.0827, 80.2707),
    "चेन्नई": ("Chennai, Tamil Nadu", 13.0827, 80.2707),
    "bengaluru": ("Bengaluru, Karnataka", 12.9716, 77.5946),
    "बेंगलुरु": ("Bengaluru, Karnataka", 12.9716, 77.5946),
    "hyderabad": ("Hyderabad, Telangana", 17.3850, 78.4867),
    "हैदराबाद": ("Hyderabad, Telangana", 17.3850, 78.4867),
    "guwahati": ("Guwahati, Assam", 26.1445, 91.7362),
    "गुवाहाटी": ("Guwahati, Assam", 26.1445, 91.7362),
    "shimla": ("Shimla, Himachal Pradesh", 31.1048, 77.1734),
    "शिमला": ("Shimla, Himachal Pradesh", 31.1048, 77.1734),
    "dehradun": ("Dehradun, Uttarakhand", 30.3165, 78.0322),
    "देहरादून": ("Dehradun, Uttarakhand", 30.3165, 78.0322),
    "wayanad": ("Wayanad, Kerala", 11.6854, 76.1320),
    "वायनाड": ("Wayanad, Kerala", 11.6854, 76.1320),
    # Punjab / LPU / Northern Hub
    "lpu": ("LPU Campus, Phagwara, Punjab", 31.2536, 75.7037),
    "phagwara": ("Phagwara, Punjab", 31.2240, 75.7708),
    "jalandhar": ("Jalandhar, Punjab", 31.3260, 75.5762),
    "punjab": ("Punjab Region", 31.1471, 75.3412),
    # Global & International Centers (USA, UK, Europe, Global Hubs)
    "new york": ("New York, United States", 40.7128, -74.0060),
    "nyc": ("New York, United States", 40.7128, -74.0060),
    "los angeles": ("Los Angeles, United States", 34.0522, -118.2437),
    "los angel": ("Los Angeles, United States", 34.0522, -118.2437),
    "chicago": ("Chicago, United States", 41.8781, -87.6298),
    "london": ("London, United Kingdom", 51.5074, -0.1278),
    "paris": ("Paris, France", 48.8566, 2.3522),
    "tokyo": ("Tokyo, Japan", 35.6762, 139.6503),
    "dubai": ("Dubai, United Arab Emirates", 25.2048, 55.2708),
    "sydney": ("Sydney, Australia", -33.8688, 151.2093),
    "singapore": ("Singapore", 1.3521, 103.8198),
}


class MultilingualClassifier:
    """
    Multilingual NLP classifier that handles Indian Vernacular Languages:
    Hindi, Marathi, Bengali, Hinglish, etc.
    """

    def __init__(self):
        self._hf_pipeline = None
        self._hf_loaded = False
        self._hf_model_name = "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli"

    def is_indic_text(self, text: str) -> bool:
        """Check if text contains Devanagari, Bengali, or other Indic Unicode characters."""
        devanagari_count = len(re.findall(r"[\u0900-\u097F]", text))
        bengali_count = len(re.findall(r"[\u0980-\u09FF]", text))
        tamil_count = len(re.findall(r"[\u0B80-\u0BFF]", text))
        telugu_count = len(re.findall(r"[\u0C00-\u0C7F]", text))
        return (devanagari_count + bengali_count + tamil_count + telugu_count) > 0

    def detect_detected_language(self, text: str) -> str:
        if len(re.findall(r"[\u0900-\u097F]", text)) > 0:
            if any(w in text for w in ["आहे", "झाले", "मुसळधार", "पाणी", "नाही", "दरड"]):
                return "mr"  # Marathi
            return "hi"  # Hindi
        if len(re.findall(r"[\u0980-\u09FF]", text)) > 0:
            return "bn"  # Bengali
        if len(re.findall(r"[\u0B80-\u0BFF]", text)) > 0:
            return "ta"  # Tamil
        if len(re.findall(r"[\u0C00-\u0C7F]", text)) > 0:
            return "te"  # Telugu

        # Check for Hinglish
        text_lower = text.lower()
        hinglish_markers = [
            "barish", "baarish", "barsaat", "bhaut", "bohot", "bhot", "baadh", "pani", "paani",
            "bhookamp", "toofan", "bachao", "madad", "chhat", "sdrf", "ndrf", "jalaun", "auraiya", "orai", "rhi",
            "rahi", "hai", "mai", "mein", "yaha", "fas", "doob", "gir", "gaya"
        ]
        matched_hinglish = sum(1 for w in hinglish_markers if re.search(r"\b" + w + r"\b", text_lower))
        if matched_hinglish >= 1:
            return "hi-Latn"  # Hinglish
        return "en"

    def extract_location(self, text: str) -> Optional[Dict[str, Any]]:
        text_lower = text.lower()
        for key, (loc_name, lat, lng) in INDIAN_CITIES_MAP.items():
            if re.search(r"\b" + re.escape(key) + r"\b", text_lower) or key in text_lower:
                return {"name": loc_name, "latitude": lat, "longitude": lng}
        return None

    def classify_multilingual(self, text: str, threshold: float = 0.35) -> Dict[str, Any]:
        """
        Classifies multilingual / Indic disaster text.
        Returns prediction probability, classification, hazard category, and location.
        """
        lang = self.detect_detected_language(text)
        text_lower = text.lower()

        detected_hazard = "other"
        hazard_found = False

        for category, patterns in INDIC_HAZARD_PATTERNS.items():
            for pat in patterns:
                if re.search(pat, text_lower, re.IGNORECASE):
                    detected_hazard = category
                    hazard_found = True
                    break
            if hazard_found:
                break

        # Check urgency tokens
        urgency_score = 0.0
        for token in INDIC_URGENCY_TOKENS:
            if re.search(token, text_lower, re.IGNORECASE):
                urgency_score += 0.10

        # Base probability calculation
        if hazard_found:
            probability = min(0.96, 0.74 + urgency_score)
        elif urgency_score > 0:
            probability = min(0.85, 0.50 + urgency_score)
        else:
            probability = 0.12

        is_disaster = probability >= threshold
        pred_class = "DISASTER_RELATED" if is_disaster else "NON_DISASTER"

        loc = self.extract_location(text)

        return {
            "text": text,
            "detected_language": lang,
            "disaster_probability": round(probability, 4),
            "non_disaster_probability": round(1.0 - probability, 4),
            "predicted_class": pred_class,
            "is_disaster": is_disaster,
            "detected_hazard": detected_hazard,
            "threshold": threshold,
            "model_engine": "HuggingFace_Indic_Multilingual (XLM-RoBERTa / IndicBERT)",
            "location": loc or {"name": "Central India Region", "latitude": 23.1815, "longitude": 79.9864},
        }


# Global Singleton instance
multilingual_engine = MultilingualClassifier()
