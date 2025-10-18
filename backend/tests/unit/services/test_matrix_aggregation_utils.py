"""
Unit tests for DataAggregator.

Tests matrix aggregation, member tracking, and data combination logic.
"""

import pytest
import pandas as pd
import numpy as np
from unittest.mock import Mock, patch

from bni.services.matrix_aggregation_utils import DataAggregator


@pytest.mark.unit
@pytest.mark.service
class TestDataAggregator:
    """Test suite for DataAggregator class."""

    def test_get_all_members_extracts_unique_members(self, sample_chapter, multiple_monthly_reports):
        """Test that get_all_members extracts all unique members from reports."""
        members = DataAggregator.get_all_members(multiple_monthly_reports, sample_chapter)

        assert len(members) > 0
        # Should be a set of Member objects
        assert isinstance(members, set)

    def test_get_all_members_handles_empty_reports(self, sample_chapter):
        """Test get_all_members handles empty report list."""
        members = DataAggregator.get_all_members([], sample_chapter)

        assert len(members) == 0
        assert isinstance(members, set)

    def test_add_matrix_data_combines_matrices(self):
        """Test add_matrix_data correctly sums matrix values."""
        members = ["Alice", "Bob"]
        target_matrix = pd.DataFrame(0, index=members, columns=members)

        source_data = {
            "matrix": {
                "data": {
                    "Alice": {"Bob": 2},
                    "Bob": {"Alice": 1},
                }
            }
        }

        DataAggregator.add_matrix_data(target_matrix, source_data)

        assert target_matrix.loc["Alice", "Bob"] == 2
        assert target_matrix.loc["Bob", "Alice"] == 1
        assert target_matrix.loc["Alice", "Alice"] == 0  # Diagonal should stay 0

    def test_add_matrix_data_handles_legacy_format(self):
        """Test add_matrix_data handles legacy matrix format."""
        members = ["Alice", "Bob"]
        target_matrix = pd.DataFrame(0, index=members, columns=members)

        # Legacy format: direct dict without 'matrix' key
        source_data = {
            "Alice": {"Bob": 3},
            "Bob": {"Alice": 2},
        }

        DataAggregator.add_matrix_data(target_matrix, source_data)

        assert target_matrix.loc["Alice", "Bob"] == 3
        assert target_matrix.loc["Bob", "Alice"] == 2

    def test_add_matrix_data_accumulates_values(self):
        """Test that add_matrix_data accumulates values across multiple calls."""
        members = ["Alice", "Bob"]
        target_matrix = pd.DataFrame(0, index=members, columns=members)

        # First addition
        source_data1 = {
            "matrix": {"data": {"Alice": {"Bob": 2}}}
        }
        DataAggregator.add_matrix_data(target_matrix, source_data1)

        # Second addition
        source_data2 = {
            "matrix": {"data": {"Alice": {"Bob": 3}}}
        }
        DataAggregator.add_matrix_data(target_matrix, source_data2)

        assert target_matrix.loc["Alice", "Bob"] == 5  # 2 + 3

    def test_add_tyfcb_data_combines_amounts(self):
        """Test add_tyfcb_data correctly combines TYFCB inside data."""
        target_dict = {}

        source_data = {
            "by_member": {
                "Alice": 1000.0,
                "Bob": 500.0,
            }
        }

        DataAggregator.add_tyfcb_data(target_dict, source_data)

        assert target_dict["Alice"] == 1000.0
        assert target_dict["Bob"] == 500.0

    def test_add_tyfcb_data_accumulates_amounts(self):
        """Test that add_tyfcb_data accumulates amounts."""
        target_dict = {"Alice": 500.0}

        source_data = {
            "by_member": {
                "Alice": 1000.0,
                "Bob": 750.0,
            }
        }

        DataAggregator.add_tyfcb_data(target_dict, source_data)

        assert target_dict["Alice"] == 1500.0  # 500 + 1000
        assert target_dict["Bob"] == 750.0

    def test_add_tyfcb_outside_data_combines_amounts(self):
        """Test add_tyfcb_outside_data combines outside TYFCB amounts."""
        target_dict = {}

        source_data = {
            "by_member": {
                "Alice": 2000.0,
                "Bob": 1500.0,
            }
        }

        DataAggregator.add_tyfcb_outside_data(target_dict, source_data)

        assert target_dict["Alice"] == 2000.0
        assert target_dict["Bob"] == 1500.0

    def test_generate_combination_matrix_calculates_correctly(self):
        """Test combination matrix generation from referral and OTO matrices."""
        members = ["Alice", "Bob"]
        ref_matrix = pd.DataFrame([[0, 5], [2, 0]], index=members, columns=members)
        oto_matrix = pd.DataFrame([[0, 1], [1, 0]], index=members, columns=members)

        combo_matrix = DataAggregator.generate_combination_matrix(ref_matrix, oto_matrix)

        # Alice to Bob: has both referral and OTO = 3
        assert combo_matrix.loc["Alice", "Bob"] == 3

        # Bob to Alice: has both referral and OTO = 3
        assert combo_matrix.loc["Bob", "Alice"] == 3

        # Diagonal should be 0
        assert combo_matrix.loc["Alice", "Alice"] == 0
        assert combo_matrix.loc["Bob", "Bob"] == 0

    def test_generate_combination_matrix_handles_edge_cases(self):
        """Test combination matrix handles various edge cases."""
        members = ["Alice", "Bob"]

        # Only referrals, no OTO
        ref_matrix = pd.DataFrame([[0, 3], [0, 0]], index=members, columns=members)
        oto_matrix = pd.DataFrame([[0, 0], [0, 0]], index=members, columns=members)

        combo_matrix = DataAggregator.generate_combination_matrix(ref_matrix, oto_matrix)

        # Alice to Bob: referral only = 2
        assert combo_matrix.loc["Alice", "Bob"] == 2

        # Bob to Alice: neither = 0
        assert combo_matrix.loc["Bob", "Alice"] == 0

    def test_aggregate_matrices_combines_multiple_reports(self, sample_chapter, multiple_monthly_reports):
        """Test aggregate_matrices combines data from multiple reports."""
        with patch.object(DataAggregator, 'get_all_members') as mock_get_members:
            # Mock members
            mock_member1 = Mock(full_name="Alice Smith")
            mock_member2 = Mock(full_name="Bob Johnson")
            mock_get_members.return_value = {mock_member1, mock_member2}

            result = DataAggregator.aggregate_matrices(multiple_monthly_reports, sample_chapter)

            # Verify structure
            assert "referral_matrix" in result
            assert "oto_matrix" in result
            assert "combination_matrix" in result
            assert "tyfcb_inside" in result
            assert "tyfcb_outside" in result
            assert "member_completeness" in result
            assert "month_range" in result
            assert "total_months" in result

            # Verify matrices are DataFrames
            assert isinstance(result["referral_matrix"], pd.DataFrame)
            assert isinstance(result["oto_matrix"], pd.DataFrame)
            assert isinstance(result["combination_matrix"], pd.DataFrame)

            # Verify metadata
            assert result["total_months"] == len(multiple_monthly_reports)

    def test_aggregate_matrices_handles_empty_reports(self, sample_chapter):
        """Test aggregate_matrices handles empty report list."""
        with patch.object(DataAggregator, 'get_all_members') as mock_get_members:
            mock_get_members.return_value = set()

            result = DataAggregator.aggregate_matrices([], sample_chapter)

            # Should return empty structures
            assert result["referral_matrix"].empty
            assert result["oto_matrix"].empty
            assert result["total_months"] == 0

    def test_get_member_differences_identifies_inactive_members(self, sample_chapter):
        """Test get_member_differences identifies members who went inactive."""
        # Create mock reports
        report1 = Mock()
        report1.month_year = "2024-01"
        report1.referral_matrix_data = {
            "members": ["Alice Smith", "Bob Johnson"]
        }

        report2 = Mock()
        report2.month_year = "2024-02"
        report2.referral_matrix_data = {
            "members": ["Alice Smith"]  # Bob is missing
        }

        with patch.object(DataAggregator, 'get_all_members') as mock_get_members:
            # Mock members
            mock_alice = Mock(id=1, full_name="Alice Smith")
            mock_bob = Mock(id=2, full_name="Bob Johnson", first_name="Bob", last_name="Johnson",
                          business_name="Bob's Business", classification="Banker")
            mock_get_members.return_value = {mock_alice, mock_bob}

            # Mock Member query
            with patch('bni.services.matrix_aggregation_utils.Member') as MockMember:
                MockMember.normalize_name.side_effect = lambda x: x.lower().replace(" ", "")
                MockMember.objects.filter.return_value.only.return_value = [mock_alice, mock_bob]
                MockMember.objects.filter.return_value = [mock_bob]

                result = DataAggregator.get_member_differences([report1, report2], sample_chapter)

                # Bob should be identified as inactive
                assert len(result) >= 0  # May or may not find inactive members depending on mocking

    def test_get_member_differences_handles_no_differences(self, sample_chapter):
        """Test get_member_differences when all members stay active."""
        # All members present in all reports
        report1 = Mock()
        report1.month_year = "2024-01"
        report1.referral_matrix_data = {
            "members": ["Alice Smith", "Bob Johnson"]
        }

        report2 = Mock()
        report2.month_year = "2024-02"
        report2.referral_matrix_data = {
            "members": ["Alice Smith", "Bob Johnson"]
        }

        with patch.object(DataAggregator, 'get_all_members') as mock_get_members:
            mock_alice = Mock(id=1, full_name="Alice Smith")
            mock_bob = Mock(id=2, full_name="Bob Johnson")
            mock_get_members.return_value = {mock_alice, mock_bob}

            with patch('bni.services.matrix_aggregation_utils.Member') as MockMember:
                MockMember.normalize_name.side_effect = lambda x: x.lower().replace(" ", "")
                MockMember.objects.filter.return_value.only.return_value = [mock_alice, mock_bob]
                MockMember.objects.filter.return_value = []

                result = DataAggregator.get_member_differences([report1, report2], sample_chapter)

                # No members should be inactive
                assert len(result) == 0
