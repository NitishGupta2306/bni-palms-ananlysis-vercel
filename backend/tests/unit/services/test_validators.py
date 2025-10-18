"""
Unit tests for Excel file validators.

Tests validation logic extracted from processor.py.
"""

import pytest
import pandas as pd
from decimal import Decimal
from unittest.mock import Mock

from bni.services.excel.validators import (
    FileFormatValidator,
    SlipTypeValidator,
    MemberValidator,
    ReferralValidator,
    OneToOneValidator,
    TYFCBValidator,
    CurrencyValidator,
    MemberNamesFileValidator,
)


@pytest.mark.unit
@pytest.mark.service
class TestFileFormatValidator:
    """Test suite for FileFormatValidator."""

    def test_validate_file_not_empty_valid(self):
        """Test validation passes for non-empty DataFrame."""
        df = pd.DataFrame({"col1": [1, 2], "col2": [3, 4]})
        is_valid, error = FileFormatValidator.validate_file_not_empty(df)

        assert is_valid is True
        assert error is None

    def test_validate_file_not_empty_invalid(self):
        """Test validation fails for empty DataFrame."""
        df = pd.DataFrame()
        is_valid, error = FileFormatValidator.validate_file_not_empty(df)

        assert is_valid is False
        assert "empty" in error.lower()

    def test_validate_minimum_columns_valid(self):
        """Test validation passes with sufficient columns."""
        df = pd.DataFrame({"col1": [1], "col2": [2], "col3": [3]})
        is_valid, error = FileFormatValidator.validate_minimum_columns(df, min_columns=3)

        assert is_valid is True
        assert error is None

    def test_validate_minimum_columns_invalid(self):
        """Test validation fails with insufficient columns."""
        df = pd.DataFrame({"col1": [1], "col2": [2]})
        is_valid, error = FileFormatValidator.validate_minimum_columns(df, min_columns=3)

        assert is_valid is False
        assert "at least 3 columns" in error

    def test_validate_column_headers_new_format(self):
        """Test validation passes for NEW format headers."""
        df = pd.DataFrame(columns=["From", "To", "Slip Type", "Inside/Outside"])
        is_valid, error = FileFormatValidator.validate_column_headers(df)

        assert is_valid is True
        assert error is None

    def test_validate_column_headers_old_format(self):
        """Test validation fails for OLD format with metadata rows."""
        df = pd.DataFrame(columns=["Slips Audit Report", "Column B", "Column C"])
        is_valid, error = FileFormatValidator.validate_column_headers(df)

        assert is_valid is False
        assert "OLD format" in error

    def test_validate_column_headers_invalid_format(self):
        """Test validation fails for invalid format."""
        df = pd.DataFrame(columns=["Column A", "Column B", "Column C"])
        is_valid, error = FileFormatValidator.validate_column_headers(df)

        assert is_valid is False
        assert "Invalid file format" in error

    def test_validate_file_structure_complete_validation(self):
        """Test complete file structure validation."""
        df = pd.DataFrame(
            {"From": ["Alice"], "To": ["Bob"], "Slip Type": ["referral"]}
        )
        is_valid, errors = FileFormatValidator.validate_file_structure(df)

        assert is_valid is True
        assert len(errors) == 0

    def test_validate_file_structure_multiple_errors(self):
        """Test file structure validation catches multiple errors."""
        df = pd.DataFrame()  # Empty
        is_valid, errors = FileFormatValidator.validate_file_structure(df)

        assert is_valid is False
        assert len(errors) >= 1


@pytest.mark.unit
@pytest.mark.service
class TestSlipTypeValidator:
    """Test suite for SlipTypeValidator."""

    def test_normalize_slip_type_referral(self):
        """Test normalization of referral slip types."""
        assert SlipTypeValidator.normalize_slip_type("Referral") == "referral"
        assert SlipTypeValidator.normalize_slip_type("REF") == "referral"
        assert SlipTypeValidator.normalize_slip_type(" referral ") == "referral"

    def test_normalize_slip_type_one_to_one(self):
        """Test normalization of one-to-one slip types."""
        assert SlipTypeValidator.normalize_slip_type("One to One") == "one_to_one"
        assert SlipTypeValidator.normalize_slip_type("OTO") == "one_to_one"
        assert SlipTypeValidator.normalize_slip_type("1-to-1") == "one_to_one"
        assert SlipTypeValidator.normalize_slip_type("one-to-one") == "one_to_one"

    def test_normalize_slip_type_tyfcb(self):
        """Test normalization of TYFCB slip types."""
        assert SlipTypeValidator.normalize_slip_type("TYFCB") == "tyfcb"
        assert SlipTypeValidator.normalize_slip_type("Thank You For Closed Business") == "tyfcb"
        assert SlipTypeValidator.normalize_slip_type("Closed Business") == "tyfcb"

    def test_normalize_slip_type_invalid(self):
        """Test normalization returns None for invalid types."""
        assert SlipTypeValidator.normalize_slip_type("Invalid Type") is None
        assert SlipTypeValidator.normalize_slip_type("") is None
        assert SlipTypeValidator.normalize_slip_type(None) is None

    def test_is_valid_slip_type(self):
        """Test slip type validation."""
        assert SlipTypeValidator.is_valid_slip_type("Referral") is True
        assert SlipTypeValidator.is_valid_slip_type("OTO") is True
        assert SlipTypeValidator.is_valid_slip_type("TYFCB") is True
        assert SlipTypeValidator.is_valid_slip_type("Invalid") is False


@pytest.mark.unit
@pytest.mark.service
class TestMemberValidator:
    """Test suite for MemberValidator."""

    @pytest.fixture
    def members_lookup(self):
        """Create mock members lookup dictionary."""
        alice = Mock(id=1, full_name="Alice Smith")
        bob = Mock(id=2, full_name="Bob Jones")

        return {
            "alice smith": alice,
            "bob jones": bob,
            "alice": alice,  # First name variation
        }

    def test_find_member_by_name_exact_match(self, members_lookup):
        """Test finding member by exact normalized name."""
        member, warning = MemberValidator.find_member_by_name(
            "Alice Smith", members_lookup
        )

        assert member is not None
        assert member.id == 1
        assert warning is None

    def test_find_member_by_name_variation(self, members_lookup):
        """Test finding member by name variation."""
        member, warning = MemberValidator.find_member_by_name("alice", members_lookup)

        assert member is not None
        assert member.id == 1
        assert warning is None

    def test_find_member_by_name_not_found(self, members_lookup):
        """Test member not found returns None with warning."""
        member, warning = MemberValidator.find_member_by_name(
            "Carol White", members_lookup
        )

        assert member is None
        assert warning is not None
        assert "Could not find member" in warning

    def test_find_member_by_name_empty_string(self, members_lookup):
        """Test empty string returns None with warning."""
        member, warning = MemberValidator.find_member_by_name("", members_lookup)

        assert member is None
        assert warning is not None

    def test_find_member_by_name_none(self, members_lookup):
        """Test None returns None with warning."""
        member, warning = MemberValidator.find_member_by_name(None, members_lookup)

        assert member is None
        assert warning is not None

    def test_validate_member_names_not_same_valid(self):
        """Test validation passes for different members."""
        member1 = Mock(id=1)
        member2 = Mock(id=2)

        is_valid, warning = MemberValidator.validate_member_names_not_same(
            member1, member2, "referral"
        )

        assert is_valid is True
        assert warning is None

    def test_validate_member_names_not_same_invalid_referral(self):
        """Test validation fails for same member in referral."""
        member = Mock(id=1)

        is_valid, warning = MemberValidator.validate_member_names_not_same(
            member, member, "referral"
        )

        assert is_valid is False
        assert "Self-referral" in warning

    def test_validate_member_names_not_same_invalid_oto(self):
        """Test validation fails for same member in one-to-one."""
        member = Mock(id=1)

        is_valid, warning = MemberValidator.validate_member_names_not_same(
            member, member, "one_to_one"
        )

        assert is_valid is False
        assert "Self-meeting" in warning


@pytest.mark.unit
@pytest.mark.service
class TestReferralValidator:
    """Test suite for ReferralValidator."""

    @pytest.fixture
    def members_lookup(self):
        """Create mock members lookup dictionary."""
        alice = Mock(id=1, full_name="Alice Smith")
        bob = Mock(id=2, full_name="Bob Jones")

        return {"alice smith": alice, "bob jones": bob}

    def test_validate_referral_data_valid(self, members_lookup):
        """Test validation passes for valid referral data."""
        is_valid, giver, receiver, warnings = ReferralValidator.validate_referral_data(
            "Alice Smith", "Bob Jones", members_lookup, 0
        )

        assert is_valid is True
        assert giver.id == 1
        assert receiver.id == 2
        assert len(warnings) == 0

    def test_validate_referral_data_missing_names(self, members_lookup):
        """Test validation fails for missing names."""
        is_valid, giver, receiver, warnings = ReferralValidator.validate_referral_data(
            "", "Bob Jones", members_lookup, 0
        )

        assert is_valid is False
        assert len(warnings) == 1
        assert "missing giver or receiver" in warnings[0]

    def test_validate_referral_data_giver_not_found(self, members_lookup):
        """Test validation fails when giver not found."""
        is_valid, giver, receiver, warnings = ReferralValidator.validate_referral_data(
            "Unknown Person", "Bob Jones", members_lookup, 0
        )

        assert is_valid is False
        assert giver is None
        assert len(warnings) == 1
        assert "Could not find giver" in warnings[0]

    def test_validate_referral_data_receiver_not_found(self, members_lookup):
        """Test validation fails when receiver not found."""
        is_valid, giver, receiver, warnings = ReferralValidator.validate_referral_data(
            "Alice Smith", "Unknown Person", members_lookup, 0
        )

        assert is_valid is False
        assert receiver is None
        assert len(warnings) == 1
        assert "Could not find receiver" in warnings[0]

    def test_validate_referral_data_self_referral(self, members_lookup):
        """Test validation fails for self-referral."""
        is_valid, giver, receiver, warnings = ReferralValidator.validate_referral_data(
            "Alice Smith", "Alice Smith", members_lookup, 0
        )

        assert is_valid is False
        assert len(warnings) == 1
        assert "Self-referral" in warnings[0]


@pytest.mark.unit
@pytest.mark.service
class TestOneToOneValidator:
    """Test suite for OneToOneValidator."""

    @pytest.fixture
    def members_lookup(self):
        """Create mock members lookup dictionary."""
        alice = Mock(id=1, full_name="Alice Smith")
        bob = Mock(id=2, full_name="Bob Jones")

        return {"alice smith": alice, "bob jones": bob}

    def test_validate_one_to_one_data_valid(self, members_lookup):
        """Test validation passes for valid one-to-one data."""
        is_valid, member1, member2, warnings = OneToOneValidator.validate_one_to_one_data(
            "Alice Smith", "Bob Jones", members_lookup, 0
        )

        assert is_valid is True
        assert member1.id == 1
        assert member2.id == 2
        assert len(warnings) == 0

    def test_validate_one_to_one_data_missing_names(self, members_lookup):
        """Test validation fails for missing names."""
        is_valid, member1, member2, warnings = OneToOneValidator.validate_one_to_one_data(
            "", "Bob Jones", members_lookup, 0
        )

        assert is_valid is False
        assert len(warnings) == 1
        assert "missing member names" in warnings[0]

    def test_validate_one_to_one_data_self_meeting(self, members_lookup):
        """Test validation fails for self-meeting."""
        is_valid, member1, member2, warnings = OneToOneValidator.validate_one_to_one_data(
            "Alice Smith", "Alice Smith", members_lookup, 0
        )

        assert is_valid is False
        assert len(warnings) == 1
        assert "Self-meeting" in warnings[0]


@pytest.mark.unit
@pytest.mark.service
class TestTYFCBValidator:
    """Test suite for TYFCBValidator."""

    @pytest.fixture
    def members_lookup(self):
        """Create mock members lookup dictionary."""
        alice = Mock(id=1, full_name="Alice Smith")
        bob = Mock(id=2, full_name="Bob Jones")

        return {"alice smith": alice, "bob jones": bob}

    def test_validate_tyfcb_data_valid(self, members_lookup):
        """Test validation passes for valid TYFCB data."""
        is_valid, receiver, giver, amount, warnings = TYFCBValidator.validate_tyfcb_data(
            "Bob Jones", "Alice Smith", "$1,234.56", members_lookup, 0
        )

        assert is_valid is True
        assert receiver.id == 2
        assert giver.id == 1
        assert amount == Decimal("1234.56")
        assert len(warnings) == 0

    def test_validate_tyfcb_data_no_giver(self, members_lookup):
        """Test validation passes with no giver (optional)."""
        is_valid, receiver, giver, amount, warnings = TYFCBValidator.validate_tyfcb_data(
            "Bob Jones", None, "$1,000", members_lookup, 0
        )

        assert is_valid is True
        assert receiver.id == 2
        assert giver is None
        assert amount == Decimal("1000")

    def test_validate_tyfcb_data_missing_receiver(self, members_lookup):
        """Test validation fails for missing receiver."""
        is_valid, receiver, giver, amount, warnings = TYFCBValidator.validate_tyfcb_data(
            "", "Alice Smith", "$1,000", members_lookup, 0
        )

        assert is_valid is False
        assert len(warnings) == 1
        assert "missing receiver" in warnings[0]

    def test_validate_tyfcb_data_invalid_amount(self, members_lookup):
        """Test validation fails for invalid amount."""
        is_valid, receiver, giver, amount, warnings = TYFCBValidator.validate_tyfcb_data(
            "Bob Jones", "Alice Smith", "$0", members_lookup, 0
        )

        assert is_valid is False
        assert len(warnings) == 1
        assert "Invalid TYFCB amount" in warnings[0]


@pytest.mark.unit
@pytest.mark.service
class TestCurrencyValidator:
    """Test suite for CurrencyValidator."""

    def test_parse_currency_amount_valid(self):
        """Test parsing valid currency amounts."""
        assert CurrencyValidator.parse_currency_amount("$1,234.56") == 1234.56
        assert CurrencyValidator.parse_currency_amount("1000") == 1000.0
        assert CurrencyValidator.parse_currency_amount("  $500.00  ") == 500.0

    def test_parse_currency_amount_invalid(self):
        """Test parsing invalid currency amounts returns 0."""
        assert CurrencyValidator.parse_currency_amount("") == 0.0
        assert CurrencyValidator.parse_currency_amount(None) == 0.0
        assert CurrencyValidator.parse_currency_amount("abc") == 0.0

    def test_is_valid_positive_amount(self):
        """Test positive amount validation."""
        assert CurrencyValidator.is_valid_positive_amount(100.0) is True
        assert CurrencyValidator.is_valid_positive_amount(0.01) is True
        assert CurrencyValidator.is_valid_positive_amount(0.0) is False
        assert CurrencyValidator.is_valid_positive_amount(-50.0) is False

    def test_validate_amount_valid(self):
        """Test amount validation with valid input."""
        is_valid, amount, error = CurrencyValidator.validate_amount("$1,000.00")

        assert is_valid is True
        assert amount == 1000.0
        assert error is None

    def test_validate_amount_invalid(self):
        """Test amount validation with invalid input."""
        is_valid, amount, error = CurrencyValidator.validate_amount("$0.00")

        assert is_valid is False
        assert amount is None
        assert error is not None


@pytest.mark.unit
@pytest.mark.service
class TestMemberNamesFileValidator:
    """Test suite for MemberNamesFileValidator."""

    def test_validate_has_required_columns_valid(self):
        """Test validation passes with required columns."""
        df = pd.DataFrame({"First Name": ["Alice"], "Last Name": ["Smith"]})
        is_valid, error = MemberNamesFileValidator.validate_has_required_columns(df)

        assert is_valid is True
        assert error is None

    def test_validate_has_required_columns_missing(self):
        """Test validation fails with missing columns."""
        df = pd.DataFrame({"First Name": ["Alice"]})
        is_valid, error = MemberNamesFileValidator.validate_has_required_columns(df)

        assert is_valid is False
        assert "Missing required columns" in error

    def test_validate_member_row_valid(self):
        """Test member row validation with valid data."""
        is_valid, error = MemberNamesFileValidator.validate_member_row(
            "Alice", "Smith"
        )

        assert is_valid is True
        assert error is None

    def test_validate_member_row_empty(self):
        """Test member row validation with empty names."""
        is_valid, error = MemberNamesFileValidator.validate_member_row("", "Smith")

        assert is_valid is False
        assert error is not None

    def test_validate_member_row_nan(self):
        """Test member row validation with NaN values."""
        is_valid, error = MemberNamesFileValidator.validate_member_row(
            pd.NA, "Smith"
        )

        assert is_valid is False
        assert "Missing" in error

    def test_validate_member_row_nan_string(self):
        """Test member row validation with 'nan' string."""
        is_valid, error = MemberNamesFileValidator.validate_member_row("nan", "Smith")

        assert is_valid is False
        assert "Invalid name value" in error
