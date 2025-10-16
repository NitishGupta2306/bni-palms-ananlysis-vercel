"""
Excel formatters package for BNI PALMS reports.

This package contains modular Excel formatting utilities organized by sheet type:
- referral_formatter: Referral matrix formatting
- oto_formatter: One-to-One matrix formatting
- combination_formatter: Combination matrix formatting
- tyfcb_formatter: TYFCB report formatting
- summary_formatter: Summary page formatting
- comparison_formatter: Comparison/inactive members formatting

Shared utilities:
- colors: Color constants and performance calculation logic
- border_utils: Border styling functions
"""

from .colors import (
    COLOR_GREEN,
    COLOR_ORANGE,
    COLOR_RED,
    COLOR_YELLOW,
    COLOR_GRAY,
    COLOR_HEADER_BG,
    COLOR_BLACK,
    THRESHOLD_GREEN,
    THRESHOLD_ORANGE_HIGH,
    THRESHOLD_ORANGE_LOW,
    THRESHOLD_RED,
    get_performance_color,
    count_performance_tiers,
)

from .border_utils import (
    create_merged_header,
    apply_thin_borders,
    add_thick_right_border,
    add_bottom_border_to_row,
    add_outer_table_borders,
    apply_standard_table_borders,
)

from .referral_formatter import write_referral_matrix
from .oto_formatter import write_oto_matrix
from .combination_formatter import write_combination_matrix
from .tyfcb_formatter import write_tyfcb_report
from .summary_formatter import write_summary_page
from .comparison_formatter import write_inactive_members
from .executive_summary_formatter import write_executive_summary
from .charts_formatter import write_charts_page

__all__ = [
    # Colors
    "COLOR_GREEN",
    "COLOR_ORANGE",
    "COLOR_RED",
    "COLOR_YELLOW",
    "COLOR_GRAY",
    "COLOR_HEADER_BG",
    "COLOR_BLACK",
    "THRESHOLD_GREEN",
    "THRESHOLD_ORANGE_HIGH",
    "THRESHOLD_ORANGE_LOW",
    "THRESHOLD_RED",
    "get_performance_color",
    "count_performance_tiers",
    # Border utils
    "create_merged_header",
    "apply_thin_borders",
    "add_thick_right_border",
    "add_bottom_border_to_row",
    "add_outer_table_borders",
    "apply_standard_table_borders",
    "configure_print_settings",
    # Formatters
    "write_referral_matrix",
    "write_oto_matrix",
    "write_combination_matrix",
    "write_tyfcb_report",
    "write_summary_page",
    "write_inactive_members",
    "write_executive_summary",
    "write_charts_page",
]
