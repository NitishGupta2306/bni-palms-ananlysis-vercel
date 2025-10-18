"""
Unit tests for PerformanceCalculator.

Tests chapter statistics, performance colors, and tier counting.
"""

import pytest
import pandas as pd
from unittest.mock import Mock

from bni.services.calculations import PerformanceCalculator


@pytest.mark.unit
@pytest.mark.service
class TestPerformanceCalculator:
    """Test suite for PerformanceCalculator class."""

    def test_calculate_chapter_statistics_basic(self):
        """Test basic chapter statistics calculation."""
        aggregated_data = {
            "referral_matrix": pd.DataFrame([[0, 5, 3], [2, 0, 1], [0, 2, 0]]),
            "oto_matrix": pd.DataFrame([[0, 2, 1], [2, 0, 0], [1, 0, 0]]),
            "combination_matrix": pd.DataFrame([[0, 3, 3], [3, 0, 1], [1, 2, 0]]),
            "tyfcb_inside": {"Member1": 1000, "Member2": 500, "Member3": 750},
        }

        stats = PerformanceCalculator.calculate_chapter_statistics(aggregated_data)

        assert "avg_referrals_given" in stats
        assert "avg_otos_given" in stats
        assert "avg_tyfcb" in stats
        assert "avg_both_count" in stats
        assert stats["avg_referrals_given"] > 0
        assert stats["avg_otos_given"] > 0
        assert stats["avg_tyfcb"] > 0

    def test_calculate_chapter_statistics_empty_data(self):
        """Test chapter statistics with empty data."""
        aggregated_data = {
            "referral_matrix": pd.DataFrame(),
            "oto_matrix": pd.DataFrame(),
            "combination_matrix": pd.DataFrame(),
            "tyfcb_inside": {},
        }

        stats = PerformanceCalculator.calculate_chapter_statistics(aggregated_data)

        assert stats["avg_referrals_given"] == 0
        assert stats["avg_otos_given"] == 0
        assert stats["avg_tyfcb"] == 0

    def test_get_performance_color_excellent(self):
        """Test performance color for excellent performance (>= 1.75x avg)."""
        chapter_avg = 10.0
        member_value = 20.0  # 2x average

        color = PerformanceCalculator.get_performance_color(member_value, chapter_avg)

        assert color == "green"

    def test_get_performance_color_good(self):
        """Test performance color for good performance (>= 0.75x, < 1.75x avg)."""
        chapter_avg = 10.0
        member_value = 10.0  # Equal to average

        color = PerformanceCalculator.get_performance_color(member_value, chapter_avg)

        assert color == "orange"

    def test_get_performance_color_needs_attention(self):
        """Test performance color for needs attention (< 0.5x avg)."""
        chapter_avg = 10.0
        member_value = 3.0  # < 0.5x average

        color = PerformanceCalculator.get_performance_color(member_value, chapter_avg)

        assert color == "red"

    def test_get_performance_color_no_highlight(self):
        """Test performance color for no highlight (>= 0.5x, < 0.75x avg)."""
        chapter_avg = 10.0
        member_value = 6.0  # 0.6x average

        color = PerformanceCalculator.get_performance_color(member_value, chapter_avg)

        assert color is None

    def test_get_performance_color_edge_cases(self):
        """Test performance color edge cases."""
        chapter_avg = 10.0

        # Exactly 1.75x
        assert PerformanceCalculator.get_performance_color(17.5, chapter_avg) == "green"

        # Exactly 0.75x
        assert PerformanceCalculator.get_performance_color(7.5, chapter_avg) == "orange"

        # Exactly 0.5x
        assert PerformanceCalculator.get_performance_color(5.0, chapter_avg) is None

        # Zero value
        assert PerformanceCalculator.get_performance_color(0, chapter_avg) == "red"

        # Zero average (edge case)
        assert PerformanceCalculator.get_performance_color(5.0, 0) is None

    def test_count_performance_tiers_mixed(self):
        """Test counting performance tiers with mixed performance."""
        chapter_avg = 10.0
        member_values = {
            "Member1": 20.0,  # Green (2x)
            "Member2": 10.0,  # Orange (1x)
            "Member3": 3.0,   # Red (0.3x)
            "Member4": 6.0,   # None (0.6x)
            "Member5": 18.0,  # Green (1.8x)
        }

        tier_counts = PerformanceCalculator.count_performance_tiers(member_values, chapter_avg)

        assert tier_counts["green"] == 2
        assert tier_counts["orange"] == 1
        assert tier_counts["red"] == 1
        assert tier_counts["none"] == 1

    def test_count_performance_tiers_all_excellent(self):
        """Test counting when all members are excellent."""
        chapter_avg = 10.0
        member_values = {
            "Member1": 20.0,
            "Member2": 18.0,
            "Member3": 25.0,
        }

        tier_counts = PerformanceCalculator.count_performance_tiers(member_values, chapter_avg)

        assert tier_counts["green"] == 3
        assert tier_counts["orange"] == 0
        assert tier_counts["red"] == 0

    def test_count_performance_tiers_empty(self):
        """Test counting with no members."""
        chapter_avg = 10.0
        member_values = {}

        tier_counts = PerformanceCalculator.count_performance_tiers(member_values, chapter_avg)

        assert tier_counts["green"] == 0
        assert tier_counts["orange"] == 0
        assert tier_counts["red"] == 0
        assert tier_counts["none"] == 0

    def test_calculate_member_completeness_full_presence(self):
        """Test member completeness when all members are in all reports."""
        members = [Mock(id=1, full_name="Member1"), Mock(id=2, full_name="Member2")]

        reports = [
            Mock(referral_matrix_data={"members": ["Member1", "Member2"]}),
            Mock(referral_matrix_data={"members": ["Member1", "Member2"]}),
        ]

        completeness = PerformanceCalculator.calculate_member_completeness(members, reports)

        assert "Member1" in completeness
        assert "Member2" in completeness
        assert completeness["Member1"]["months_present"] == 2
        assert completeness["Member2"]["months_present"] == 2
        assert completeness["Member1"]["completeness_percentage"] == 100.0

    def test_calculate_member_completeness_partial_presence(self):
        """Test member completeness with partial presence."""
        members = [
            Mock(id=1, full_name="Member1"),
            Mock(id=2, full_name="Member2"),
            Mock(id=3, full_name="Member3"),
        ]

        reports = [
            Mock(referral_matrix_data={"members": ["Member1", "Member2"]}),
            Mock(referral_matrix_data={"members": ["Member1", "Member3"]}),
            Mock(referral_matrix_data={"members": ["Member1"]}),
        ]

        completeness = PerformanceCalculator.calculate_member_completeness(members, reports)

        # Member1 in all 3 reports
        assert completeness["Member1"]["months_present"] == 3
        assert completeness["Member1"]["completeness_percentage"] == 100.0

        # Member2 in 1 of 3 reports
        assert completeness["Member2"]["months_present"] == 1
        assert completeness["Member2"]["completeness_percentage"] == pytest.approx(33.33, rel=0.1)

        # Member3 in 1 of 3 reports
        assert completeness["Member3"]["months_present"] == 1
        assert completeness["Member3"]["completeness_percentage"] == pytest.approx(33.33, rel=0.1)

    def test_calculate_member_completeness_no_reports(self):
        """Test member completeness with no reports."""
        members = [Mock(id=1, full_name="Member1")]
        reports = []

        completeness = PerformanceCalculator.calculate_member_completeness(members, reports)

        assert completeness["Member1"]["months_present"] == 0
        assert completeness["Member1"]["completeness_percentage"] == 0.0

    def test_calculate_referral_totals(self):
        """Test referral totals calculation."""
        ref_matrix = pd.DataFrame(
            [[0, 5, 3], [2, 0, 1], [0, 2, 0]],
            index=["Member1", "Member2", "Member3"],
            columns=["Member1", "Member2", "Member3"],
        )

        totals = PerformanceCalculator.calculate_referral_totals(ref_matrix)

        assert "given" in totals
        assert "received" in totals
        assert "unique_given" in totals

        # Member1 gave: 5 + 3 = 8
        assert totals["given"]["Member1"] == 8

        # Member1 received: 2 + 0 = 2
        assert totals["received"]["Member1"] == 2

        # Member1 gave to 2 unique members
        assert totals["unique_given"]["Member1"] == 2

    def test_calculate_combination_counts(self):
        """Test combination matrix counts calculation."""
        combo_matrix = pd.DataFrame(
            [[0, 3, 2], [3, 0, 1], [2, 0, 0]],
            index=["Member1", "Member2", "Member3"],
            columns=["Member1", "Member2", "Member3"],
        )

        counts = PerformanceCalculator.calculate_combination_counts(combo_matrix)

        assert "both" in counts      # value == 3
        assert "referral_only" in counts  # value == 2
        assert "oto_only" in counts  # value == 1
        assert "neither" in counts   # value == 0

        # Member1 has: 1 both (3), 1 referral only (2)
        assert counts["both"]["Member1"] == 1
        assert counts["referral_only"]["Member1"] == 1
        assert counts["oto_only"]["Member1"] == 0

    def test_thresholds_are_correct(self):
        """Test that threshold constants are correct."""
        assert PerformanceCalculator.THRESHOLD_GREEN == 1.75
        assert PerformanceCalculator.THRESHOLD_ORANGE_LOW == 0.75
        assert PerformanceCalculator.THRESHOLD_RED == 0.5

    def test_performance_color_with_negative_values(self):
        """Test performance color doesn't break with negative values."""
        chapter_avg = 10.0
        member_value = -5.0

        color = PerformanceCalculator.get_performance_color(member_value, chapter_avg)

        # Negative values should be treated as red
        assert color == "red"
