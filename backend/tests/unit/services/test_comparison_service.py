"""
Unit tests for ComparisonService.

Tests report comparison, change calculation, and trend analysis.
"""

import pytest
import pandas as pd
from unittest.mock import Mock, patch
from datetime import date

from bni.services.comparison_service import ComparisonService


@pytest.mark.unit
@pytest.mark.service
class TestComparisonService:
    """Test suite for ComparisonService class."""

    @pytest.fixture
    def mock_report_current(self):
        """Create a mock current period report."""
        report = Mock()
        report.id = 1
        report.month_year = date(2024, 2, 1)
        report.referral_matrix_data = {
            "members": ["Alice", "Bob"],
            "matrix": {"data": {"Alice": {"Bob": 5}, "Bob": {"Alice": 3}}},
        }
        report.oto_matrix_data = {
            "members": ["Alice", "Bob"],
            "matrix": {"data": {"Alice": {"Bob": 2}, "Bob": {"Alice": 2}}},
        }
        report.tyfcb_inside_data = {
            "by_member": {"Alice": 2000.0, "Bob": 1500.0}
        }
        return report

    @pytest.fixture
    def mock_report_previous(self):
        """Create a mock previous period report."""
        report = Mock()
        report.id = 2
        report.month_year = date(2024, 1, 1)
        report.referral_matrix_data = {
            "members": ["Alice", "Bob"],
            "matrix": {"data": {"Alice": {"Bob": 3}, "Bob": {"Alice": 2}}},
        }
        report.oto_matrix_data = {
            "members": ["Alice", "Bob"],
            "matrix": {"data": {"Alice": {"Bob": 1}, "Bob": {"Alice": 1}}},
        }
        report.tyfcb_inside_data = {
            "by_member": {"Alice": 1000.0, "Bob": 1000.0}
        }
        return report

    def test_calculate_change_increase(self):
        """Test change calculation for increase."""
        current = 15
        previous = 10

        change = ComparisonService.calculate_change(current, previous)

        assert change["value"] == 5
        assert change["percentage"] == 50.0
        assert change["direction"] == "increase"

    def test_calculate_change_decrease(self):
        """Test change calculation for decrease."""
        current = 8
        previous = 10

        change = ComparisonService.calculate_change(current, previous)

        assert change["value"] == -2
        assert change["percentage"] == -20.0
        assert change["direction"] == "decrease"

    def test_calculate_change_no_change(self):
        """Test change calculation for no change."""
        current = 10
        previous = 10

        change = ComparisonService.calculate_change(current, previous)

        assert change["value"] == 0
        assert change["percentage"] == 0.0
        assert change["direction"] == "no_change"

    def test_calculate_change_from_zero(self):
        """Test change calculation from zero previous value."""
        current = 10
        previous = 0

        change = ComparisonService.calculate_change(current, previous)

        assert change["value"] == 10
        assert change["percentage"] == 100.0
        assert change["direction"] == "increase"

    def test_calculate_change_to_zero(self):
        """Test change calculation to zero current value."""
        current = 0
        previous = 10

        change = ComparisonService.calculate_change(current, previous)

        assert change["value"] == -10
        assert change["percentage"] == -100.0
        assert change["direction"] == "decrease"

    def test_calculate_change_both_zero(self):
        """Test change calculation when both values are zero."""
        current = 0
        previous = 0

        change = ComparisonService.calculate_change(current, previous)

        assert change["value"] == 0
        assert change["percentage"] == 0.0
        assert change["direction"] == "no_change"

    def test_compare_matrices_referrals(self):
        """Test comparing referral matrices."""
        current_matrix = pd.DataFrame(
            [[0, 5], [3, 0]],
            index=["Alice", "Bob"],
            columns=["Alice", "Bob"],
        )
        previous_matrix = pd.DataFrame(
            [[0, 3], [2, 0]],
            index=["Alice", "Bob"],
            columns=["Alice", "Bob"],
        )

        comparison = ComparisonService.compare_matrices(
            current_matrix, previous_matrix, "referral"
        )

        assert "current" in comparison
        assert "previous" in comparison
        assert "changes" in comparison

        # Alice to Bob: 5 (current) vs 3 (previous) = +2
        assert comparison["changes"][("Alice", "Bob")]["value"] == 2

        # Bob to Alice: 3 (current) vs 2 (previous) = +1
        assert comparison["changes"][("Bob", "Alice")]["value"] == 1

    def test_compare_matrices_with_new_members(self):
        """Test comparing matrices when current has new members."""
        current_matrix = pd.DataFrame(
            [[0, 5, 2], [3, 0, 1], [1, 1, 0]],
            index=["Alice", "Bob", "Carol"],
            columns=["Alice", "Bob", "Carol"],
        )
        previous_matrix = pd.DataFrame(
            [[0, 3], [2, 0]],
            index=["Alice", "Bob"],
            columns=["Alice", "Bob"],
        )

        comparison = ComparisonService.compare_matrices(
            current_matrix, previous_matrix, "referral"
        )

        # Should handle new member Carol
        assert ("Alice", "Carol") in comparison["changes"]
        assert ("Carol", "Alice") in comparison["changes"]

    def test_calculate_member_performance_changes(
        self, mock_report_current, mock_report_previous
    ):
        """Test calculating member performance changes."""
        service = ComparisonService(mock_report_current, mock_report_previous)

        with patch.object(
            service, "_extract_member_totals"
        ) as mock_extract:
            mock_extract.side_effect = [
                {"Alice": 8, "Bob": 5},  # Current referrals
                {"Alice": 5, "Bob": 4},  # Previous referrals
            ]

            changes = service.calculate_member_performance_changes()

            assert "Alice" in changes
            assert "Bob" in changes

            # Alice: 8 -> 5 = +3 referrals
            alice_change = changes["Alice"]["referrals"]
            assert alice_change["value"] == 3
            assert alice_change["direction"] == "increase"

    def test_extract_member_totals_referrals(self):
        """Test extracting member referral totals from report."""
        report = Mock()
        report.referral_matrix_data = {
            "members": ["Alice", "Bob"],
            "matrix": {"data": {"Alice": {"Bob": 5}, "Bob": {"Alice": 3}}},
        }

        service = ComparisonService(report, report)
        totals = service._extract_member_totals(report, "referral")

        assert "Alice" in totals
        assert "Bob" in totals
        assert totals["Alice"] == 5
        assert totals["Bob"] == 3

    def test_extract_member_totals_tyfcb(self):
        """Test extracting member TYFCB totals from report."""
        report = Mock()
        report.tyfcb_inside_data = {
            "by_member": {"Alice": 2000.0, "Bob": 1500.0}
        }

        service = ComparisonService(report, report)
        totals = service._extract_member_totals(report, "tyfcb")

        assert totals["Alice"] == 2000.0
        assert totals["Bob"] == 1500.0

    def test_generate_comparison_summary(
        self, mock_report_current, mock_report_previous
    ):
        """Test generating comparison summary."""
        service = ComparisonService(mock_report_current, mock_report_previous)

        summary = service.generate_comparison_summary()

        assert "current_period" in summary
        assert "previous_period" in summary
        assert "overall_changes" in summary
        assert "member_changes" in summary

        # Verify structure
        assert "total_referrals" in summary["overall_changes"]
        assert "total_otos" in summary["overall_changes"]
        assert "total_tyfcb" in summary["overall_changes"]

    def test_identify_top_performers(self):
        """Test identifying top performers."""
        member_changes = {
            "Alice": {"referrals": {"value": 5, "percentage": 50.0}},
            "Bob": {"referrals": {"value": 2, "percentage": 20.0}},
            "Carol": {"referrals": {"value": 8, "percentage": 80.0}},
        }

        top = ComparisonService.identify_top_performers(
            member_changes, metric="referrals", limit=2
        )

        assert len(top) == 2
        assert top[0]["member"] == "Carol"
        assert top[1]["member"] == "Alice"

    def test_identify_declining_performers(self):
        """Test identifying declining performers."""
        member_changes = {
            "Alice": {"referrals": {"value": -3, "percentage": -30.0}},
            "Bob": {"referrals": {"value": 2, "percentage": 20.0}},
            "Carol": {"referrals": {"value": -1, "percentage": -10.0}},
        }

        declining = ComparisonService.identify_declining_performers(
            member_changes, metric="referrals", limit=2
        )

        assert len(declining) == 2
        assert declining[0]["member"] == "Alice"
        assert declining[1]["member"] == "Carol"

    def test_compare_reports_end_to_end(
        self, mock_report_current, mock_report_previous
    ):
        """Test complete report comparison end-to-end."""
        service = ComparisonService(mock_report_current, mock_report_previous)

        result = service.compare_reports()

        assert "summary" in result
        assert "matrix_comparisons" in result
        assert "member_performance" in result
        assert "insights" in result

        # Verify summary has all metrics
        summary = result["summary"]
        assert "referrals" in summary["overall_changes"]
        assert "otos" in summary["overall_changes"]
        assert "tyfcb" in summary["overall_changes"]
