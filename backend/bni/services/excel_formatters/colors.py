"""
Shared color constants and performance calculation logic for Excel reports.

All colors are as per specification.md to ensure consistency across reports.
"""

# ==============================================================================
# COLOR DEFINITIONS
# ==============================================================================

# Performance highlighting colors
COLOR_GREEN = "B6FFB6"      # Excellent performance (>= 1.75x average)
COLOR_ORANGE = "FFD699"     # Good/Average performance (0.75x - 1.75x average)
COLOR_RED = "FFB6B6"        # Needs attention (< 0.5x average)

# Special highlighting colors
COLOR_YELLOW = "FFE699"     # Non-zero values highlight
COLOR_GRAY = "D3D3D3"       # Header backgrounds
COLOR_HEADER_BG = "E8F5E8"  # Soft green for merged headers
COLOR_BLACK = "000000"      # Separators (deprecated - use borders instead)

# ==============================================================================
# PERFORMANCE THRESHOLDS
# ==============================================================================

# Performance tier boundaries
THRESHOLD_GREEN = 1.75          # >= 1.75x average = Excellent (Green)
THRESHOLD_ORANGE_HIGH = 1.75    # < 1.75x average (upper bound for orange)
THRESHOLD_ORANGE_LOW = 0.75     # >= 0.75x average (lower bound for orange)
THRESHOLD_RED = 0.5             # < 0.5x average = Needs Attention (Red)
                                 # 0.5x - 0.75x = No highlighting (neutral)

# ==============================================================================
# PERFORMANCE CALCULATION FUNCTIONS
# ==============================================================================

def get_performance_color(value: float, average: float) -> str:
    """
    Determine performance color based on value and average.

    Args:
        value: The member's value (referrals, OTO, TYFCB, etc.)
        average: The chapter average for this metric

    Returns:
        Color code (COLOR_GREEN, COLOR_ORANGE, COLOR_RED) or None for no highlighting
    """
    if average == 0:
        return None  # No highlighting if average is 0

    ratio = value / average

    if ratio >= THRESHOLD_GREEN:
        return COLOR_GREEN
    elif ratio >= THRESHOLD_ORANGE_LOW:
        return COLOR_ORANGE
    elif ratio < THRESHOLD_RED:
        return COLOR_RED
    else:
        return None  # No highlighting for 0.5-0.75 range


def count_performance_tiers(values: dict, average: float) -> dict:
    """
    Count how many members fall into each performance tier.

    Args:
        values: Dictionary of {member_name: value}
        average: The chapter average for this metric

    Returns:
        Dictionary with counts and percentages for each tier:
        {
            'green': count,
            'orange': count,
            'red': count,
            'neutral': count,
            'green_pct': percentage,
            'orange_pct': percentage,
            'red_pct': percentage
        }
    """
    if average == 0:
        return {
            "green": 0,
            "orange": 0,
            "red": 0,
            "neutral": len(values),
            "green_pct": 0,
            "orange_pct": 0,
            "red_pct": 0,
        }

    green_count = 0
    orange_count = 0
    red_count = 0
    neutral_count = 0

    for value in values.values():
        ratio = value / average
        if ratio >= THRESHOLD_GREEN:
            green_count += 1
        elif ratio >= THRESHOLD_ORANGE_LOW:
            orange_count += 1
        elif ratio < THRESHOLD_RED:
            red_count += 1
        else:
            neutral_count += 1

    total = len(values)
    return {
        "green": green_count,
        "orange": orange_count,
        "red": red_count,
        "neutral": neutral_count,
        "green_pct": (green_count / total * 100) if total > 0 else 0,
        "orange_pct": (orange_count / total * 100) if total > 0 else 0,
        "red_pct": (red_count / total * 100) if total > 0 else 0,
    }
