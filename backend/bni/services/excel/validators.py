"""
Validation utilities for BNI Excel file processing.

Extracted from processor.py for better maintainability and testability.
"""

import pandas as pd
from typing import Optional, Dict, List, Tuple
from decimal import Decimal, InvalidOperation
from members.models import Member
import logging

logger = logging.getLogger(__name__)


class FileFormatValidator:
    """Validates Excel file format and structure."""

    # Expected column names for NEW BNI Slip Audit Report format
    REQUIRED_COLUMNS = ["from", "slip type"]
    OLD_FORMAT_INDICATORS = ["slip", "audit"]

    @staticmethod
    def validate_file_not_empty(df: pd.DataFrame) -> Tuple[bool, Optional[str]]:
        """
        Validate that DataFrame is not empty.

        Returns:
            (is_valid, error_message)
        """
        if df.empty:
            return False, "Excel file is empty"
        return True, None

    @staticmethod
    def validate_minimum_columns(df: pd.DataFrame, min_columns: int = 3) -> Tuple[bool, Optional[str]]:
        """
        Validate DataFrame has minimum required columns.

        Args:
            df: DataFrame to validate
            min_columns: Minimum number of columns required

        Returns:
            (is_valid, error_message)
        """
        if df.shape[1] < min_columns:
            return False, f"Excel file must have at least {min_columns} columns"
        return True, None

    @staticmethod
    def validate_column_headers(df: pd.DataFrame) -> Tuple[bool, Optional[str]]:
        """
        Validate DataFrame has expected column headers for NEW format.

        Rejects OLD format files with metadata rows.

        Returns:
            (is_valid, error_message)
        """
        if len(df) == 0 or not hasattr(df, "columns"):
            return False, "DataFrame has no columns"

        cols_str = " ".join([str(c).lower() for c in df.columns])

        # Reject old format (has title like "Slips Audit Report")
        if any(indicator in df.columns[0].lower() for indicator in FileFormatValidator.OLD_FORMAT_INDICATORS):
            error_msg = "OLD format files are not supported. Please use files without metadata rows."
            return False, error_msg

        # Validate new format has expected columns
        if not all(col in cols_str for col in FileFormatValidator.REQUIRED_COLUMNS):
            error_msg = f"Invalid file format. Expected columns {FileFormatValidator.REQUIRED_COLUMNS}, got: {list(df.columns)}"
            return False, error_msg

        logger.info(f"Validated NEW format with columns: {list(df.columns)}")
        return True, None

    @staticmethod
    def validate_file_structure(df: pd.DataFrame) -> Tuple[bool, List[str]]:
        """
        Perform complete file structure validation.

        Returns:
            (is_valid, list_of_error_messages)
        """
        errors = []

        # Check if empty
        is_valid, error = FileFormatValidator.validate_file_not_empty(df)
        if not is_valid:
            errors.append(error)
            return False, errors

        # Check minimum columns
        is_valid, error = FileFormatValidator.validate_minimum_columns(df)
        if not is_valid:
            errors.append(error)
            return False, errors

        # Check column headers
        is_valid, error = FileFormatValidator.validate_column_headers(df)
        if not is_valid:
            errors.append(error)
            return False, errors

        return True, []


class SlipTypeValidator:
    """Validates and normalizes slip types."""

    SLIP_TYPES = {
        "referral": ["referral", "ref"],
        "one_to_one": ["one to one", "oto", "1to1", "1-to-1", "one-to-one"],
        "tyfcb": ["tyfcb", "thank you for closed business", "closed business"],
    }

    @staticmethod
    def normalize_slip_type(slip_type: str) -> Optional[str]:
        """
        Normalize slip type to standard format.

        Args:
            slip_type: Raw slip type string from Excel

        Returns:
            Normalized slip type or None if invalid
        """
        if not slip_type or pd.isna(slip_type):
            return None

        slip_type = str(slip_type).lower().strip()

        for standard_type, variations in SlipTypeValidator.SLIP_TYPES.items():
            if any(variation in slip_type for variation in variations):
                return standard_type

        return None

    @staticmethod
    def is_valid_slip_type(slip_type: str) -> bool:
        """Check if slip type is valid."""
        return SlipTypeValidator.normalize_slip_type(slip_type) is not None


class MemberValidator:
    """Validates member-related data."""

    @staticmethod
    def find_member_by_name(
        name: str, members_lookup: Dict[str, Member]
    ) -> Tuple[Optional[Member], Optional[str]]:
        """
        Find a member by name using fuzzy matching.

        Args:
            name: Member name to find
            members_lookup: Dictionary of normalized names to Member objects

        Returns:
            (member, warning_message)
        """
        if not name or pd.isna(name):
            return None, "Missing member name"

        name = str(name).strip()
        if not name:
            return None, "Empty member name"

        # Try exact normalized match first
        normalized = Member.normalize_name(name)
        if normalized in members_lookup:
            return members_lookup[normalized], None

        # Try variations
        variations = [
            name.lower(),
            " ".join(name.lower().split()),
        ]

        for variation in variations:
            if variation in members_lookup:
                return members_lookup[variation], None

        # No match found
        return None, f"Could not find member: '{name}'"

    @staticmethod
    def validate_member_names_not_same(
        member1: Member, member2: Member, record_type: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate that two members are not the same person.

        Args:
            member1: First member
            member2: Second member
            record_type: Type of record (referral, one_to_one, etc.)

        Returns:
            (is_valid, warning_message)
        """
        if member1 == member2:
            if record_type == "referral":
                return False, "Self-referral detected, skipping"
            elif record_type == "one_to_one":
                return False, "Self-meeting detected, skipping"
            else:
                return False, f"Self-{record_type} detected, skipping"
        return True, None


class ReferralValidator:
    """Validates referral records."""

    @staticmethod
    def validate_referral_data(
        giver_name: str,
        receiver_name: str,
        members_lookup: Dict[str, Member],
        row_idx: int,
    ) -> Tuple[bool, Optional[Member], Optional[Member], List[str]]:
        """
        Validate referral data and return giver/receiver members.

        Args:
            giver_name: Name of giver
            receiver_name: Name of receiver
            members_lookup: Member lookup dictionary
            row_idx: Row index for error messages

        Returns:
            (is_valid, giver_member, receiver_member, warnings)
        """
        warnings = []

        # Check required fields
        if not all([giver_name, receiver_name]):
            warnings.append(f"Row {row_idx + 1}: Referral missing giver or receiver name")
            return False, None, None, warnings

        # Find giver
        giver, warning = MemberValidator.find_member_by_name(giver_name, members_lookup)
        if not giver:
            warnings.append(f"Row {row_idx + 1}: Could not find giver '{giver_name}'")
            return False, None, None, warnings

        # Find receiver
        receiver, warning = MemberValidator.find_member_by_name(receiver_name, members_lookup)
        if not receiver:
            warnings.append(f"Row {row_idx + 1}: Could not find receiver '{receiver_name}'")
            return False, giver, None, warnings

        # Check not same person
        is_valid, warning = MemberValidator.validate_member_names_not_same(
            giver, receiver, "referral"
        )
        if not is_valid:
            warnings.append(f"Row {row_idx + 1}: {warning}")
            return False, giver, receiver, warnings

        return True, giver, receiver, warnings


class OneToOneValidator:
    """Validates one-to-one meeting records."""

    @staticmethod
    def validate_one_to_one_data(
        member1_name: str,
        member2_name: str,
        members_lookup: Dict[str, Member],
        row_idx: int,
    ) -> Tuple[bool, Optional[Member], Optional[Member], List[str]]:
        """
        Validate one-to-one data and return member objects.

        Args:
            member1_name: Name of first member
            member2_name: Name of second member
            members_lookup: Member lookup dictionary
            row_idx: Row index for error messages

        Returns:
            (is_valid, member1, member2, warnings)
        """
        warnings = []

        # Check required fields
        if not all([member1_name, member2_name]):
            warnings.append(f"Row {row_idx + 1}: One-to-one missing member names")
            return False, None, None, warnings

        # Find member1
        member1, warning = MemberValidator.find_member_by_name(member1_name, members_lookup)
        if not member1:
            warnings.append(f"Row {row_idx + 1}: Could not find member '{member1_name}'")
            return False, None, None, warnings

        # Find member2
        member2, warning = MemberValidator.find_member_by_name(member2_name, members_lookup)
        if not member2:
            warnings.append(f"Row {row_idx + 1}: Could not find member '{member2_name}'")
            return False, member1, None, warnings

        # Check not same person
        is_valid, warning = MemberValidator.validate_member_names_not_same(
            member1, member2, "one_to_one"
        )
        if not is_valid:
            warnings.append(f"Row {row_idx + 1}: {warning}")
            return False, member1, member2, warnings

        return True, member1, member2, warnings


class TYFCBValidator:
    """Validates TYFCB (Thank You For Closed Business) records."""

    @staticmethod
    def validate_tyfcb_data(
        receiver_name: str,
        giver_name: Optional[str],
        amount_str: Optional[str],
        members_lookup: Dict[str, Member],
        row_idx: int,
    ) -> Tuple[bool, Optional[Member], Optional[Member], Optional[Decimal], List[str]]:
        """
        Validate TYFCB data and return member objects and amount.

        Args:
            receiver_name: Name of receiver
            giver_name: Name of giver (optional)
            amount_str: Amount string from Excel
            members_lookup: Member lookup dictionary
            row_idx: Row index for error messages

        Returns:
            (is_valid, receiver, giver, amount, warnings)
        """
        warnings = []

        # Check required fields
        if not receiver_name:
            warnings.append(f"Row {row_idx + 1}: TYFCB missing receiver name")
            return False, None, None, None, warnings

        # Find receiver
        receiver, warning = MemberValidator.find_member_by_name(receiver_name, members_lookup)
        if not receiver:
            warnings.append(f"Row {row_idx + 1}: Could not find receiver '{receiver_name}'")
            return False, None, None, None, warnings

        # Find giver (optional)
        giver = None
        if giver_name:
            giver, warning = MemberValidator.find_member_by_name(giver_name, members_lookup)
            # Don't fail if giver not found, just warn
            if not giver and warning:
                warnings.append(f"Row {row_idx + 1}: {warning}")

        # Validate amount
        amount = CurrencyValidator.parse_currency_amount(amount_str)
        if amount <= 0:
            warnings.append(f"Row {row_idx + 1}: Invalid TYFCB amount: {amount_str}")
            return False, receiver, giver, None, warnings

        return True, receiver, giver, Decimal(str(amount)), warnings


class CurrencyValidator:
    """Validates and parses currency amounts."""

    @staticmethod
    def parse_currency_amount(amount_str: Optional[str]) -> float:
        """
        Parse currency amount from string.

        Removes currency symbols and commas, then converts to float.

        Args:
            amount_str: Amount string (e.g., "$1,234.56")

        Returns:
            Parsed amount as float, 0.0 if invalid
        """
        if not amount_str or pd.isna(amount_str):
            return 0.0

        try:
            # Remove currency symbols and commas
            cleaned = str(amount_str).replace("$", "").replace(",", "").strip()
            return float(cleaned) if cleaned else 0.0
        except (ValueError, TypeError):
            return 0.0

    @staticmethod
    def is_valid_positive_amount(amount: float) -> bool:
        """Check if amount is valid (positive)."""
        return amount > 0

    @staticmethod
    def validate_amount(amount_str: Optional[str]) -> Tuple[bool, Optional[float], Optional[str]]:
        """
        Validate and parse currency amount.

        Returns:
            (is_valid, parsed_amount, error_message)
        """
        amount = CurrencyValidator.parse_currency_amount(amount_str)

        if not CurrencyValidator.is_valid_positive_amount(amount):
            return False, None, f"Invalid amount: {amount_str}"

        return True, amount, None


class MemberNamesFileValidator:
    """Validates member names file data."""

    REQUIRED_COLUMNS = ["First Name", "Last Name"]

    @staticmethod
    def validate_has_required_columns(df: pd.DataFrame) -> Tuple[bool, Optional[str]]:
        """
        Validate that DataFrame has required columns for member names.

        Returns:
            (is_valid, error_message)
        """
        missing_columns = [
            col for col in MemberNamesFileValidator.REQUIRED_COLUMNS if col not in df.columns
        ]

        if missing_columns:
            return False, f"Missing required columns: {missing_columns}"

        return True, None

    @staticmethod
    def validate_member_row(first_name: str, last_name: str) -> Tuple[bool, Optional[str]]:
        """
        Validate a single member row has valid names.

        Returns:
            (is_valid, error_message)
        """
        # Check for null/NaN
        if pd.isna(first_name) or pd.isna(last_name):
            return False, "Missing first name or last name"

        # Convert to strings and strip
        first_name_str = str(first_name).strip()
        last_name_str = str(last_name).strip()

        # Check for empty strings
        if not first_name_str or not last_name_str:
            return False, "Empty first name or last name"

        # Check for 'nan' string (common pandas artifact)
        if first_name_str == "nan" or last_name_str == "nan":
            return False, "Invalid name value 'nan'"

        return True, None
