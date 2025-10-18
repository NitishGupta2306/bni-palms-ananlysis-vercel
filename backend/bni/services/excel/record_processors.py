"""
Record Processors Module

Legacy individual record processing methods (DEPRECATED).
These use iterrows() and create records one-by-one.
For better performance, use DataPreparers with bulk operations instead.

Extracted from processor.py to improve maintainability.
"""

import pandas as pd
from typing import Dict, Optional
from datetime import date
from decimal import Decimal
import logging

from django.utils import timezone
from members.models import Member
from analytics.models import Referral, OneToOne, TYFCB
from .helpers import ProcessorHelpers

logger = logging.getLogger(__name__)


class RecordProcessors:
    """
    Legacy individual record processors.

    DEPRECATED: These methods process records one-by-one and use iterrows().
    Use DataPreparers with bulk operations for 3-5x better performance.
    """

    # Column mappings for BNI Slip Audit Report format
    COLUMN_MAPPINGS = {
        "giver_name": 0,
        "receiver_name": 1,
        "slip_type": 2,
        "inside_outside": 3,
        "tyfcb_amount": 4,
        "qty_ceu": 5,
        "detail": 6,
    }

    def __init__(self, member_matcher):
        """
        Initialize record processors.

        Args:
            member_matcher: MemberMatcher instance for name lookups
        """
        self.member_matcher = member_matcher
        self.errors = []
        self.warnings = []

    def process_referral(
        self,
        row: pd.Series,
        row_idx: int,
        giver_name: str,
        receiver_name: str,
        members_lookup: Dict[str, Member],
        week_of_date: Optional[date],
    ) -> bool:
        """
        Process a referral record (DEPRECATED).

        DEPRECATED: Use DataPreparers.prepare_referral() with bulk_create() instead.

        Args:
            row: DataFrame row with referral data
            row_idx: Row index for error reporting
            giver_name: Name of member giving referral
            receiver_name: Name of member receiving referral
            members_lookup: Dictionary mapping names to Member objects
            week_of_date: Date for the referral

        Returns:
            True if successful, False otherwise
        """
        if not all([giver_name, receiver_name]):
            self.warnings.append(
                f"Row {row_idx + 1}: Referral missing giver or receiver name"
            )
            return False

        giver = self.member_matcher.find_member_by_name(giver_name, members_lookup)
        receiver = self.member_matcher.find_member_by_name(receiver_name, members_lookup)

        if not giver:
            self.warnings.append(
                f"Row {row_idx + 1}: Could not find giver '{giver_name}'"
            )
            return False

        if not receiver:
            self.warnings.append(
                f"Row {row_idx + 1}: Could not find receiver '{receiver_name}'"
            )
            return False

        if giver == receiver:
            self.warnings.append(f"Row {row_idx + 1}: Self-referral detected, skipping")
            return False

        # Create referral directly (migration applied, no unique constraint)
        try:
            Referral.objects.create(
                giver=giver,
                receiver=receiver,
                date_given=week_of_date or timezone.now().date(),
                week_of=week_of_date,
            )
            return True
        except Exception as e:
            self.errors.append(f"Row {row_idx + 1}: Referral creation error: {e}")
            return False

    def process_one_to_one(
        self,
        row: pd.Series,
        row_idx: int,
        giver_name: str,
        receiver_name: str,
        members_lookup: Dict[str, Member],
        week_of_date: Optional[date],
    ) -> bool:
        """
        Process a one-to-one meeting record (DEPRECATED).

        DEPRECATED: Use DataPreparers.prepare_one_to_one() with bulk_create() instead.

        Args:
            row: DataFrame row with one-to-one data
            row_idx: Row index for error reporting
            giver_name: Name of first member
            receiver_name: Name of second member
            members_lookup: Dictionary mapping names to Member objects
            week_of_date: Date of the meeting

        Returns:
            True if successful, False otherwise
        """
        if not all([giver_name, receiver_name]):
            self.warnings.append(f"Row {row_idx + 1}: One-to-one missing member names")
            return False

        member1 = self.member_matcher.find_member_by_name(giver_name, members_lookup)
        member2 = self.member_matcher.find_member_by_name(receiver_name, members_lookup)

        if not member1:
            self.warnings.append(
                f"Row {row_idx + 1}: Could not find member '{giver_name}'"
            )
            return False

        if not member2:
            self.warnings.append(
                f"Row {row_idx + 1}: Could not find member '{receiver_name}'"
            )
            return False

        if member1 == member2:
            self.warnings.append(f"Row {row_idx + 1}: Self-meeting detected, skipping")
            return False

        # Create one-to-one (duplicates already cleared at start)
        try:
            OneToOne.objects.create(
                member1=member1,
                member2=member2,
                meeting_date=week_of_date or timezone.now().date(),
                week_of=week_of_date,
            )
            return True
        except Exception as e:
            self.errors.append(f"Row {row_idx + 1}: One-to-one creation error: {e}")
            return False

    def process_tyfcb(
        self,
        row: pd.Series,
        row_idx: int,
        giver_name: str,
        receiver_name: str,
        members_lookup: Dict[str, Member],
        week_of_date: Optional[date],
    ) -> bool:
        """
        Process a TYFCB record (DEPRECATED).

        DEPRECATED: Use DataPreparers.prepare_tyfcb() with bulk_create() instead.

        Args:
            row: DataFrame row with TYFCB data
            row_idx: Row index for error reporting
            giver_name: Name of member giving TYFCB
            receiver_name: Name of member receiving TYFCB
            members_lookup: Dictionary mapping names to Member objects
            week_of_date: Date the business closed

        Returns:
            True if successful, False otherwise
        """
        if not receiver_name:
            self.warnings.append(f"Row {row_idx + 1}: TYFCB missing receiver name")
            return False

        receiver = self.member_matcher.find_member_by_name(receiver_name, members_lookup)
        if not receiver:
            self.warnings.append(
                f"Row {row_idx + 1}: Could not find receiver '{receiver_name}'"
            )
            return False

        # Giver is optional for TYFCB
        giver = None
        if giver_name:
            giver = self.member_matcher.find_member_by_name(giver_name, members_lookup)

        # Extract amount
        amount_str = ProcessorHelpers.get_cell_value(row, self.COLUMN_MAPPINGS["tyfcb_amount"])
        amount = ProcessorHelpers.parse_currency_amount(amount_str)

        if amount <= 0:
            self.warnings.append(
                f"Row {row_idx + 1}: Invalid TYFCB amount: {amount_str}"
            )
            return False

        # Determine if inside or outside chapter based on Inside/Outside column
        inside_outside = ProcessorHelpers.get_cell_value(
            row, self.COLUMN_MAPPINGS["inside_outside"]
        )
        within_chapter = bool(
            inside_outside and inside_outside.lower().strip() == "inside"
        )

        # Extract detail/description
        detail = ProcessorHelpers.get_cell_value(row, self.COLUMN_MAPPINGS["detail"])

        # Create TYFCB (duplicates already cleared at start)
        try:
            TYFCB.objects.create(
                receiver=receiver,
                giver=giver,
                amount=Decimal(str(amount)),
                within_chapter=within_chapter,
                date_closed=week_of_date or timezone.now().date(),
                description=detail or "",
                week_of=week_of_date,
            )
            return True
        except Exception as e:
            self.errors.append(f"Row {row_idx + 1}: TYFCB creation error: {e}")
            return False

    def get_errors(self) -> list:
        """Get list of errors."""
        return self.errors

    def get_warnings(self) -> list:
        """Get list of warnings."""
        return self.warnings

    def clear_errors(self):
        """Clear errors list."""
        self.errors = []

    def clear_warnings(self):
        """Clear warnings list."""
        self.warnings = []
