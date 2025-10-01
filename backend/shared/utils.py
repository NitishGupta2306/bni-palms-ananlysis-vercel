"""
Shared utility functions for the BNI application
"""
from typing import Any, Dict, List, Optional


def normalize_name(name: str) -> str:
    """
    Normalize member names by removing common prefixes and suffixes
    """
    if not name:
        return ""

    name = name.strip()

    # Remove common prefixes
    prefixes = ["mr", "mrs", "ms", "dr", "prof", "rev"]
    name_lower = name.lower()
    for prefix in prefixes:
        if name_lower.startswith(f"{prefix}.") or name_lower.startswith(f"{prefix} "):
            name = name[len(prefix):].strip()
            if name.startswith('.'):
                name = name[1:].strip()
            break

    # Remove common suffixes
    suffixes = ["jr", "sr", "ii", "iii", "iv"]
    name_parts = name.split()
    if len(name_parts) > 1:
        last_part = name_parts[-1].lower().rstrip('.')
        if last_part in suffixes:
            name = " ".join(name_parts[:-1])

    return name.strip()


def safe_get(dictionary: Dict[str, Any], key: str, default: Any = None) -> Any:
    """
    Safely get a value from a dictionary with error handling
    """
    try:
        return dictionary.get(key, default)
    except (AttributeError, TypeError):
        return default