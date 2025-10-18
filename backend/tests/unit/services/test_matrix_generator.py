"""
Unit tests for MatrixGenerator, NameMatcher, and DataValidator.

Tests matrix generation, name matching, and data validation logic.
"""

import pytest
import pandas as pd
import numpy as np
from unittest.mock import Mock
from datetime import date

from bni.services.matrix_generator import (
    MatrixGenerator,
    NameMatcher,
    DataValidator,
)


@pytest.mark.unit
@pytest.mark.service
class TestMatrixGenerator:
    """Test suite for MatrixGenerator class."""

    @pytest.fixture
    def mock_members(self):
        """Create mock member objects."""
        members = []
        for i, name in enumerate(["Alice Smith", "Bob Jones", "Carol White"], start=1):
            member = Mock()
            member.id = i
            member.full_name = name
            members.append(member)
        return members

    @pytest.fixture
    def generator(self, mock_members):
        """Create MatrixGenerator instance."""
        return MatrixGenerator(mock_members)

    def test_initialization(self, generator):
        """Test MatrixGenerator initialization."""
        assert len(generator.members) == 3
        assert len(generator.member_names) == 3
        assert "Alice Smith" in generator.member_names
        assert len(generator.member_lookup) == 3

    def test_members_sorted_by_name(self, mock_members):
        """Test that members are sorted alphabetically."""
        # Shuffle order
        shuffled = [mock_members[2], mock_members[0], mock_members[1]]
        generator = MatrixGenerator(shuffled)

        # Should be sorted
        assert generator.member_names == ["Alice Smith", "Bob Jones", "Carol White"]

    def test_generate_referral_matrix_empty(self, generator):
        """Test referral matrix generation with no referrals."""
        matrix = generator.generate_referral_matrix([])

        assert isinstance(matrix, pd.DataFrame)
        assert matrix.shape == (3, 3)
        assert matrix.sum().sum() == 0  # All zeros

    def test_generate_referral_matrix_single_referral(self, generator, mock_members):
        """Test referral matrix with single referral."""
        alice, bob, carol = mock_members

        referral = Mock()
        referral.giver = alice
        referral.receiver = bob

        matrix = generator.generate_referral_matrix([referral])

        assert matrix.loc["Alice Smith", "Bob Jones"] == 1
        assert matrix.loc["Bob Jones", "Alice Smith"] == 0  # Not bidirectional
        assert matrix.sum().sum() == 1

    def test_generate_referral_matrix_multiple_referrals(
        self, generator, mock_members
    ):
        """Test referral matrix with multiple referrals."""
        alice, bob, carol = mock_members

        referrals = [
            Mock(giver=alice, receiver=bob),
            Mock(giver=alice, receiver=bob),  # Duplicate - should count twice
            Mock(giver=bob, receiver=carol),
            Mock(giver=carol, receiver=alice),
        ]

        matrix = generator.generate_referral_matrix(referrals)

        assert matrix.loc["Alice Smith", "Bob Jones"] == 2
        assert matrix.loc["Bob Jones", "Carol White"] == 1
        assert matrix.loc["Carol White", "Alice Smith"] == 1
        assert matrix.sum().sum() == 4

    def test_generate_one_to_one_matrix_empty(self, generator):
        """Test OTO matrix generation with no meetings."""
        matrix = generator.generate_one_to_one_matrix([])

        assert isinstance(matrix, pd.DataFrame)
        assert matrix.shape == (3, 3)
        assert matrix.sum().sum() == 0

    def test_generate_one_to_one_matrix_single_meeting(
        self, generator, mock_members
    ):
        """Test OTO matrix with single meeting (bidirectional)."""
        alice, bob, carol = mock_members

        meeting = Mock()
        meeting.member1 = alice
        meeting.member2 = bob

        matrix = generator.generate_one_to_one_matrix([meeting])

        # Should be bidirectional
        assert matrix.loc["Alice Smith", "Bob Jones"] == 1
        assert matrix.loc["Bob Jones", "Alice Smith"] == 1
        assert matrix.sum().sum() == 2

    def test_generate_one_to_one_matrix_multiple_meetings(
        self, generator, mock_members
    ):
        """Test OTO matrix with multiple meetings."""
        alice, bob, carol = mock_members

        meetings = [
            Mock(member1=alice, member2=bob),
            Mock(member1=alice, member2=bob),  # Duplicate meeting
            Mock(member1=bob, member2=carol),
        ]

        matrix = generator.generate_one_to_one_matrix(meetings)

        # Alice-Bob: 2 meetings, bidirectional = 4 total
        assert matrix.loc["Alice Smith", "Bob Jones"] == 2
        assert matrix.loc["Bob Jones", "Alice Smith"] == 2

        # Bob-Carol: 1 meeting, bidirectional = 2 total
        assert matrix.loc["Bob Jones", "Carol White"] == 1
        assert matrix.loc["Carol White", "Bob Jones"] == 1

        assert matrix.sum().sum() == 6

    def test_generate_combination_matrix_with_pregenerated(
        self, generator, mock_members
    ):
        """Test combination matrix using pre-generated matrices."""
        ref_matrix = pd.DataFrame(
            [[0, 1, 0], [0, 0, 1], [0, 0, 0]],
            index=["Alice Smith", "Bob Jones", "Carol White"],
            columns=["Alice Smith", "Bob Jones", "Carol White"],
        )

        oto_matrix = pd.DataFrame(
            [[0, 1, 0], [1, 0, 0], [0, 0, 0]],
            index=["Alice Smith", "Bob Jones", "Carol White"],
            columns=["Alice Smith", "Bob Jones", "Carol White"],
        )

        combo_matrix = generator.generate_combination_matrix(
            [], [], ref_matrix=ref_matrix, oto_matrix=oto_matrix
        )

        # Alice-Bob: has both ref and oto = 3
        assert combo_matrix.loc["Alice Smith", "Bob Jones"] == 3

        # Bob-Alice: has oto only = 1
        assert combo_matrix.loc["Bob Jones", "Alice Smith"] == 1

        # Bob-Carol: has ref only = 2
        assert combo_matrix.loc["Bob Jones", "Carol White"] == 2

        # Diagonal should be 0
        assert combo_matrix.loc["Alice Smith", "Alice Smith"] == 0

    def test_generate_combination_matrix_without_pregenerated(
        self, generator, mock_members
    ):
        """Test combination matrix generates matrices if not provided."""
        alice, bob, carol = mock_members

        referrals = [Mock(giver=alice, receiver=bob)]
        meetings = [Mock(member1=alice, member2=bob)]

        combo_matrix = generator.generate_combination_matrix(referrals, meetings)

        # Alice-Bob: has both ref and oto = 3
        assert combo_matrix.loc["Alice Smith", "Bob Jones"] == 3

        # Bob-Alice: has oto only (bidirectional) = 1
        assert combo_matrix.loc["Bob Jones", "Alice Smith"] == 1

    def test_generate_tyfcb_summary_empty(self, generator):
        """Test TYFCB summary with no TYFCBs."""
        summary = generator.generate_tyfcb_summary([])

        assert isinstance(summary, pd.DataFrame)
        assert len(summary) == 3
        assert summary["TYFCB_Received_Amount"].sum() == 0

    def test_generate_tyfcb_summary_with_data(self, generator, mock_members):
        """Test TYFCB summary with data."""
        alice, bob, carol = mock_members

        tyfcbs = [
            Mock(giver=alice, receiver=bob, amount=1000.0),
            Mock(giver=bob, receiver=alice, amount=500.0),
            Mock(giver=carol, receiver=alice, amount=750.0),
        ]

        summary = generator.generate_tyfcb_summary(tyfcbs)

        # Alice: received 1250 (500 + 750), gave 1000, net = 250
        alice_row = summary[summary["Member"] == "Alice Smith"].iloc[0]
        assert alice_row["TYFCB_Received_Count"] == 2
        assert alice_row["TYFCB_Received_Amount"] == 1250.0
        assert alice_row["TYFCB_Given_Count"] == 1
        assert alice_row["TYFCB_Given_Amount"] == 1000.0
        assert alice_row["Net_Amount"] == 250.0

    def test_generate_member_summary_comprehensive(self, generator, mock_members):
        """Test comprehensive member summary generation."""
        alice, bob, carol = mock_members

        referrals = [
            Mock(giver=alice, receiver=bob),
            Mock(giver=alice, receiver=carol),
            Mock(giver=bob, receiver=alice),
        ]

        meetings = [
            Mock(member1=alice, member2=bob),
            Mock(member1=alice, member2=carol),
        ]

        tyfcbs = [
            Mock(giver=alice, receiver=bob, amount=1000.0),
            Mock(giver=bob, receiver=alice, amount=500.0),
        ]

        summary = generator.generate_member_summary(referrals, meetings, tyfcbs)

        alice_row = summary[summary["Member"] == "Alice Smith"].iloc[0]
        assert alice_row["Referrals_Given"] == 2
        assert alice_row["Referrals_Received"] == 1
        assert alice_row["Unique_Referrals_Given"] == 2  # Bob and Carol
        assert alice_row["One_to_Ones"] == 2  # With Bob and Carol
        assert alice_row["Unique_One_to_Ones"] == 2
        assert alice_row["TYFCB_Amount_Given"] == 1000.0
        assert alice_row["TYFCB_Amount_Received"] == 500.0


@pytest.mark.unit
@pytest.mark.service
class TestNameMatcher:
    """Test suite for NameMatcher class."""

    def test_normalize_name_basic(self):
        """Test basic name normalization."""
        assert NameMatcher.normalize_name("John Doe") == "john doe"
        assert NameMatcher.normalize_name("  John   Doe  ") == "john doe"

    def test_normalize_name_with_prefixes(self):
        """Test normalization with prefixes."""
        assert NameMatcher.normalize_name("Mr. John Doe") == "john doe"
        assert NameMatcher.normalize_name("Dr. Jane Smith") == "jane smith"
        assert NameMatcher.normalize_name("Prof. Bob Jones") == "bob jones"

    def test_normalize_name_with_suffixes(self):
        """Test normalization with suffixes."""
        assert NameMatcher.normalize_name("John Doe Jr.") == "john doe"
        assert NameMatcher.normalize_name("Jane Smith II") == "jane smith"
        assert NameMatcher.normalize_name("Bob Jones Sr.") == "bob jones"

    def test_normalize_name_empty_string(self):
        """Test normalization with empty string."""
        assert NameMatcher.normalize_name("") == ""
        assert NameMatcher.normalize_name(None) == ""

    def test_create_fuzzy_variants_basic(self):
        """Test fuzzy variant creation."""
        variants = NameMatcher.create_fuzzy_variants("John Doe")

        assert "john doe" in variants
        assert "john" in variants  # First name
        assert "doe" in variants  # Last name

    def test_create_fuzzy_variants_with_initials(self):
        """Test fuzzy variants include initials."""
        variants = NameMatcher.create_fuzzy_variants("John Doe")

        # Should include "j. doe" and "j doe"
        assert any("j" in v and "doe" in v for v in variants)

    def test_create_fuzzy_variants_single_name(self):
        """Test fuzzy variants with single name."""
        variants = NameMatcher.create_fuzzy_variants("Madonna")

        assert "madonna" in variants
        # No first/last name split
        assert len(variants) >= 1

    def test_find_best_match_exact(self):
        """Test finding exact match."""
        members = [
            Mock(id=1, full_name="John Doe"),
            Mock(id=2, full_name="Jane Smith"),
            Mock(id=3, full_name="Bob Jones"),
        ]

        match = NameMatcher.find_best_match("John Doe", members)

        assert match is not None
        assert match.id == 1

    def test_find_best_match_fuzzy(self):
        """Test fuzzy matching."""
        members = [
            Mock(id=1, full_name="John Doe"),
            Mock(id=2, full_name="Jane Smith"),
        ]

        # Slight misspelling
        match = NameMatcher.find_best_match("Jon Doe", members, threshold=0.8)

        assert match is not None
        assert match.id == 1

    def test_find_best_match_no_match(self):
        """Test when no match meets threshold."""
        members = [
            Mock(id=1, full_name="John Doe"),
            Mock(id=2, full_name="Jane Smith"),
        ]

        match = NameMatcher.find_best_match("Bob Jones", members, threshold=0.9)

        assert match is None

    def test_find_best_match_empty_name(self):
        """Test matching with empty name."""
        members = [Mock(id=1, full_name="John Doe")]

        match = NameMatcher.find_best_match("", members)

        assert match is None

    def test_find_best_match_case_insensitive(self):
        """Test matching is case-insensitive."""
        members = [Mock(id=1, full_name="John Doe")]

        match = NameMatcher.find_best_match("JOHN DOE", members)

        assert match is not None
        assert match.id == 1


@pytest.mark.unit
@pytest.mark.service
class TestDataValidator:
    """Test suite for DataValidator class."""

    def test_validate_referrals_clean_data(self):
        """Test referral validation with clean data."""
        member1 = Mock(id=1, full_name="Alice")
        member2 = Mock(id=2, full_name="Bob")

        referrals = [
            Mock(giver=member1, receiver=member2, date_given=date(2024, 1, 1)),
            Mock(giver=member2, receiver=member1, date_given=date(2024, 1, 2)),
        ]

        issues = DataValidator.validate_referrals(referrals)

        assert len(issues["self_referrals"]) == 0
        assert len(issues["duplicate_referrals"]) == 0

    def test_validate_referrals_self_referral(self):
        """Test detection of self-referrals."""
        member = Mock(id=1, full_name="Alice")

        referrals = [Mock(giver=member, receiver=member, date_given=date(2024, 1, 1))]

        issues = DataValidator.validate_referrals(referrals)

        assert len(issues["self_referrals"]) == 1

    def test_validate_referrals_duplicate(self):
        """Test detection of duplicate referrals."""
        member1 = Mock(id=1, full_name="Alice")
        member2 = Mock(id=2, full_name="Bob")

        referrals = [
            Mock(giver=member1, receiver=member2, date_given=date(2024, 1, 1)),
            Mock(giver=member1, receiver=member2, date_given=date(2024, 1, 1)),  # Duplicate
        ]

        issues = DataValidator.validate_referrals(referrals)

        assert len(issues["duplicate_referrals"]) == 1

    def test_validate_one_to_ones_clean_data(self):
        """Test OTO validation with clean data."""
        member1 = Mock(id=1, full_name="Alice")
        member2 = Mock(id=2, full_name="Bob")

        meetings = [
            Mock(member1=member1, member2=member2, meeting_date=date(2024, 1, 1)),
            Mock(member1=member2, member2=member1, meeting_date=date(2024, 1, 2)),  # Different date, OK
        ]

        issues = DataValidator.validate_one_to_ones(meetings)

        assert len(issues["self_meetings"]) == 0
        assert len(issues["duplicate_meetings"]) == 0

    def test_validate_one_to_ones_self_meeting(self):
        """Test detection of self-meetings."""
        member = Mock(id=1, full_name="Alice")

        meetings = [Mock(member1=member, member2=member, meeting_date=date(2024, 1, 1))]

        issues = DataValidator.validate_one_to_ones(meetings)

        assert len(issues["self_meetings"]) == 1

    def test_validate_one_to_ones_duplicate(self):
        """Test detection of duplicate meetings."""
        member1 = Mock(id=1, full_name="Alice")
        member2 = Mock(id=2, full_name="Bob")

        meetings = [
            Mock(member1=member1, member2=member2, meeting_date=date(2024, 1, 1)),
            Mock(member1=member2, member2=member1, meeting_date=date(2024, 1, 1)),  # Same date, duplicate
        ]

        issues = DataValidator.validate_one_to_ones(meetings)

        assert len(issues["duplicate_meetings"]) == 1

    def test_generate_quality_report_perfect_data(self):
        """Test quality report with perfect data."""
        member1 = Mock(id=1, full_name="Alice")
        member2 = Mock(id=2, full_name="Bob")

        referrals = [Mock(giver=member1, receiver=member2, date_given=date(2024, 1, 1))]
        meetings = [Mock(member1=member1, member2=member2, meeting_date=date(2024, 1, 1))]
        tyfcbs = [Mock(giver=member1, receiver=member2, amount=1000.0)]

        report = DataValidator.generate_quality_report(referrals, meetings, tyfcbs)

        assert report["overall_quality_score"] == 100.0
        assert report["total_records"] == 3
        assert report["total_issues"] == 0

    def test_generate_quality_report_with_issues(self):
        """Test quality report with data issues."""
        member1 = Mock(id=1, full_name="Alice")
        member2 = Mock(id=2, full_name="Bob")

        referrals = [
            Mock(giver=member1, receiver=member2, date_given=date(2024, 1, 1)),
            Mock(giver=member1, receiver=member1, date_given=date(2024, 1, 2)),  # Self-referral
        ]

        meetings = [
            Mock(member1=member1, member2=member2, meeting_date=date(2024, 1, 1)),
            Mock(member1=member1, member2=member1, meeting_date=date(2024, 1, 1)),  # Self-meeting
        ]

        tyfcbs = [Mock(giver=member1, receiver=member2, amount=-100.0)]  # Negative amount

        report = DataValidator.generate_quality_report(referrals, meetings, tyfcbs)

        assert report["overall_quality_score"] < 100.0
        assert report["total_issues"] == 2  # Self-referral + self-meeting
        assert report["referrals"]["self_referrals"] == 1
        assert report["one_to_ones"]["self_meetings"] == 1
        assert report["tyfcbs"]["negative_amounts"] == 1

    def test_generate_quality_report_empty_data(self):
        """Test quality report with no data."""
        report = DataValidator.generate_quality_report([], [], [])

        assert report["overall_quality_score"] == 100.0  # No data = perfect
        assert report["total_records"] == 0
        assert report["total_issues"] == 0
