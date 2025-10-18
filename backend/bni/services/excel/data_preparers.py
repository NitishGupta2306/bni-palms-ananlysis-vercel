"""
Data Preparers Module

Handles preparation of database objects for bulk insert operations.
Extracted from processor.py to improve maintainability.
"""

import pandas as pd
from typing import Dict, Optional
from datetime import date
from django.utils import timezone

from members.models import Member
from analytics.models import Referral, OneToOne, TYFCB
from .validators import ReferralValidator, OneToOneValidator, TYFCBValidator


class DataPreparers:
    """Prepares database objects for bulk insert operations."""

    # Column mappings for BNI Slip Audit Report format
    COLUMN_MAPPINGS = {
        "giver_name": 0,  # Column A - From
        "receiver_name": 1,  # Column B - To
        "slip_type": 2,  # Column C - Slip Type
        "inside_outside": 3,  # Column D - Inside/Outside
        "tyfcb_amount": 4,  # Column E - $ if TYFCB
        "qty_ceu": 5,  # Column F - Qty if CEU
        "detail": 6,  # Column G - Detail
    }

    def __init__(self):
        """Initialize data preparers."""
        self.warnings = []

    def prepare_referral(
        self,
        row: pd.Series,
        row_idx: int,
        giver_name: str,
        receiver_name: str,
        members_lookup: Dict[str, Member],
        week_of_date: Optional[date],
    ) -> Optional[Referral]:
        """
        Prepare a referral object for bulk insert using ReferralValidator.

        Args:
            row: DataFrame row with referral data
            row_idx: Row index for error reporting
            giver_name: Name of member giving referral
            receiver_name: Name of member receiving referral
            members_lookup: Dictionary mapping names to Member objects
            week_of_date: Date for the referral

        Returns:
            Referral object if valid, None otherwise
        """
        is_valid, giver, receiver, warnings = ReferralValidator.validate_referral_data(
            giver_name, receiver_name, members_lookup, row_idx
        )

        if not is_valid:
            self.warnings.extend(warnings)
            return None

        return Referral(
            giver=giver,
            receiver=receiver,
            date_given=week_of_date or timezone.now().date(),
            week_of=week_of_date,
        )

    def prepare_one_to_one(
        self,
        row: pd.Series,
        row_idx: int,
        giver_name: str,
        receiver_name: str,
        members_lookup: Dict[str, Member],
        week_of_date: Optional[date],
    ) -> Optional[OneToOne]:
        """
        Prepare a one-to-one object for bulk insert using OneToOneValidator.

        Args:
            row: DataFrame row with one-to-one data
            row_idx: Row index for error reporting
            giver_name: Name of first member
            receiver_name: Name of second member
            members_lookup: Dictionary mapping names to Member objects
            week_of_date: Date of the meeting

        Returns:
            OneToOne object if valid, None otherwise
        """
        is_valid, member1, member2, warnings = OneToOneValidator.validate_one_to_one_data(
            giver_name, receiver_name, members_lookup, row_idx
        )

        if not is_valid:
            self.warnings.extend(warnings)
            return None

        return OneToOne(
            member1=member1,
            member2=member2,
            meeting_date=week_of_date or timezone.now().date(),
            week_of=week_of_date,
        )

    def prepare_tyfcb(
        self,
        row: pd.Series,
        row_idx: int,
        giver_name: str,
        receiver_name: str,
        members_lookup: Dict[str, Member],
        week_of_date: Optional[date],
    ) -> Optional[TYFCB]:
        """
        Prepare a TYFCB object for bulk insert using TYFCBValidator.

        Args:
            row: DataFrame row with TYFCB data
            row_idx: Row index for error reporting
            giver_name: Name of member giving TYFCB
            receiver_name: Name of member receiving TYFCB
            members_lookup: Dictionary mapping names to Member objects
            week_of_date: Date the business closed

        Returns:
            TYFCB object if valid, None otherwise
        """
        # Extract amount
        amount_str = self._get_cell_value(row, self.COLUMN_MAPPINGS["tyfcb_amount"])

        # Validate TYFCB data
        is_valid, receiver, giver, amount, warnings = TYFCBValidator.validate_tyfcb_data(
            receiver_name, giver_name, amount_str, members_lookup, row_idx
        )

        if not is_valid:
            self.warnings.extend(warnings)
            return None

        # Extract detail/description
        detail = self._get_cell_value(row, self.COLUMN_MAPPINGS["detail"])

        # Determine if inside or outside chapter
        # TYFCB is OUTSIDE if detail has a value (chapter name), INSIDE if detail is empty
        within_chapter = not bool(detail and detail.strip())

        return TYFCB(
            receiver=receiver,
            giver=giver,
            amount=amount,
            within_chapter=within_chapter,
            date_closed=week_of_date or timezone.now().date(),
            description=detail or "",
            week_of=week_of_date,
        )

    def _get_cell_value(self, row: pd.Series, column_index: int) -> Optional[str]:
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

    def get_warnings(self) -> list:
        """
        Get list of warnings generated during preparation.

        Returns:
            List of warning messages
        """
        return self.warnings

    def clear_warnings(self):
        """Clear warnings list."""
        self.warnings = []
