import re
import logging
from typing import Dict, Any, Tuple

logger = logging.getLogger(__name__)

STOP_WORDS = [
    "materials",
    "material",
    "raw",
    "imports",
    "imported",
    "systems",
    "components",
    "parts",
    "devices",
    "assemblies",
    "equipment",
    "solutions",
    "items",
    "industrial",
    "automotive",
    "electrical",
    "manufacturing",
    "wiring",
    "cells",
    "modules",
    "products"
]

# Mapping synonyms and cleaned inputs to normalized market categories
SEMANTIC_SYNONYMS = {
    "ecu chips": "semiconductor",
    "ecu chip": "semiconductor",
    "semiconductors": "semiconductor",
    "chip": "semiconductor",
    "chips": "semiconductor",
    "battery cells": "lithium",
    "battery cell": "lithium",
    "battery": "lithium",
    "batteries": "lithium",
    "wiring harness": "copper",
    "transformer coil": "copper",
    "diesel logistics": "fuel",
    "lubricants": "fuel",
    "lubricant": "fuel",
    "diesel": "fuel",
    "oil": "fuel",
    "logistics": "fuel",
    "steel": "steel",
    "copper": "copper",
    "aluminium": "aluminium",
    "aluminum": "aluminium",
    "lithium": "lithium",
    "rubber": "rubber"
}

# Mapping normalized categories to market sources
CATEGORY_MARKET_MAP = {
    "steel": {
        "market": "industrial_steel_index",
        "risk_type": "commodity"
    },
    "aluminium": {
        "market": "metal_exchange_index",
        "risk_type": "commodity"
    },
    "copper": {
        "market": "copper_market_index",
        "risk_type": "commodity"
    },
    "semiconductor": {
        "market": "chip_supply_chain_index",
        "risk_type": "global_supply_chain"
    },
    "lithium": {
        "market": "battery_material_index",
        "risk_type": "battery_supply_chain"
    },
    "fuel": {
        "market": "global_energy_market",
        "risk_type": "energy_volatility"
    },
    "rubber": {
        "market": "rubber_commodity_index",
        "risk_type": "commodity"
    }
}


def clean_input(text: str) -> str:
    """
    Remove filler words, icons, emojis, special symbols, extra spaces,
    and duplicate words. Returns a cleaned, lowercase normalized string.
    """
    if not text:
        return ""
    
    # 1. Unicode/Emoji/Symbol cleanup: Remove non-alphanumeric, spaces, hyphens
    cleaned = re.sub(r'[^\w\s\-\/]', ' ', text)
    
    # 2. Lowercase normalization
    cleaned = cleaned.lower()
    
    # 3. Split into words and exclude stop words
    words = cleaned.split()
    filtered_words = []
    seen = set()
    
    for word in words:
        # Strip punctuation
        w = word.strip("-/ ")
        if not w:
            continue
        if w not in STOP_WORDS and w not in seen:
            filtered_words.append(w)
            seen.add(w)
            
    # 4. Rejoin and clean extra whitespaces
    result = " ".join(filtered_words).strip()
    return result


def detect_category(raw_input: str, industry: str) -> Tuple[str, str, float]:
    """
    Perform synonym mapping, context-aware matching, and confidence score calculation.
    Returns: (cleaned_category, normalized_category, confidence_score)
    """
    cleaned = clean_input(raw_input)
    industry_norm = (industry or "manufacturing").lower()
    
    # Context-aware panel matching
    if "panel" in cleaned:
        if "electrical" in industry_norm:
            # Electrical industry: maps to electrical panel (which maps to copper indices)
            return "panel", "electrical panel", 0.95
        else:
            # Manufacturing/Automotive maps to fabrication panel (steel index)
            return "panel", "fabrication panel", 0.95

    # Check exact synonym match
    if cleaned in SEMANTIC_SYNONYMS:
        norm_cat = SEMANTIC_SYNONYMS[cleaned]
        return cleaned, norm_cat, 1.0

    # Keyword check: look for substrings in the cleaned input
    for key, norm_cat in SEMANTIC_SYNONYMS.items():
        if key in cleaned or cleaned in key:
            return cleaned, norm_cat, 0.90

    # Default to first word of cleaned input, check if it's steel/copper/etc.
    parts = cleaned.split()
    if parts:
        first_word = parts[0]
        for key, norm_cat in SEMANTIC_SYNONYMS.items():
            if first_word == key:
                return cleaned, norm_cat, 0.80

    # General fallback
    return cleaned, "steel", 0.50
