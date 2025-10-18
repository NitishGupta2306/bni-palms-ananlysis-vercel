"""
Helper Functions Module

Utility functions for Excel processing.
Extracted from processor.py to improve maintainability.
"""

import pandas as pd
from typing import Optional, Dict
from .validators import SlipTypeValidator, CurrencyValidator


class ProcessorHelpers:
    """Utility functions for Excel processing."""

    @staticmethod
    def get_cell_value(row: pd.Series, column_index: int) -> Optional[str]:
        """
        Safely get cell value from row.

        Args:
            row: DataFrame row
            column_index: Index of column to extract

        Returns:
            String value if present, None otherwise
        """
        try:
            if column_index >= len(row) or pd.isna(row.iloc[column_index]):
                return None
            return str(row.iloc[column_index]).strip()
        except (IndexError, AttributeError):
            return None

    @staticmethod
    def parse_currency_amount(amount_str: Optional[str]) -> float:
        """
        Parse currency amount from string using CurrencyValidator.

        Args:
            amount_str: String representation of currency amount

        Returns:
            Float value of amount
        """
        return CurrencyValidator.parse_currency_amount(amount_str)

    @staticmethod
    def normalize_slip_type(slip_type: str) -> Optional[str]:
        """
        Normalize slip type to standard format using SlipTypeValidator.

        Args:
            slip_type: Raw slip type string

        Returns:
            Normalized slip type or None if invalid
        """
        return SlipTypeValidator.normalize_slip_type(slip_type)

    @staticmethod
    def create_error_result(error_message: str) -> Dict:
        """
        Create error result dictionary.

        Args:
            error_message: Error message to include

        Returns:
            Dictionary with error status and empty results
        """
        return {
            "success": False,
            "error": error_message,
            "referrals_created": 0,
            "one_to_ones_created": 0,
            "tyfcbs_created": 0,
            "total_processed": 0,
            "errors": [error_message],
            "warnings": [],
        }

    @staticmethod
    def create_success_result(
        referrals_count: int,
        one_to_ones_count: int,
        tyfcbs_count: int,
        total_count: int,
        errors: list = None,
        warnings: list = None,
    ) -> Dict:
        """
        Create success result dictionary.

        Args:
            referrals_count: Number of referrals created
            one_to_ones_count: Number of one-to-ones created
            tyfcbs_count: Number of TYFCBs created
            total_count: Total records processed
            errors: Optional list of error messages
            warnings: Optional list of warning messages

        Returns:
            Dictionary with success status and results
        """
        return {
            "success": True,
            "referrals_created": referrals_count,
            "one_to_ones_created": one_to_ones_count,
            "tyfcbs_created": tyfcbs_count,
            "total_processed": total_count,
            "errors": errors or [],
            "warnings": warnings or [],
        }
