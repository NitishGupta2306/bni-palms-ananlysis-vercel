"""
Statistical calculations and performance analysis for BNI aggregation.

This module handles all statistics, performance tier calculations,
and member completeness analysis.
"""

import pandas as pd
from typing import Dict, Set
from members.models import Member
from reports.models import MonthlyReport


class PerformanceCalculator:
    """Handles performance statistics and tier calculations."""

    # Performance thresholds (as per specification.md)
    THRESHOLD_GREEN = 1.75  # >= 1.75x average
    THRESHOLD_ORANGE_HIGH = 1.75  # < 1.75x average
    THRESHOLD_ORANGE_LOW = 0.75  # >= 0.75x average
    THRESHOLD_RED = 0.5  # < 0.5x average

    # Color definitions (as per specification.md)
    COLOR_GREEN = "B6FFB6"  # Excellent performance
    COLOR_ORANGE = "FFD699"  # Good/Average performance
    COLOR_RED = "FFB6B6"  # Needs attention

    @classmethod
    def calculate_chapter_statistics(cls, aggregated_data: Dict) -> Dict:
        """
        Calculate chapter-wide statistics for performance evaluation.

        Args:
            aggregated_data: Dict containing referral_matrix, oto_matrix, tyfcb_inside, tyfcb_outside

        Returns:
            Dict with chapter_size, averages, and totals for each member
        """
        ref_matrix = aggregated_data["referral_matrix"]
        oto_matrix = aggregated_data["oto_matrix"]
        tyfcb_inside = aggregated_data["tyfcb_inside"]
        tyfcb_outside = aggregated_data["tyfcb_outside"]

        num_members = len(ref_matrix.index)

        # Calculate referral statistics
        ref_totals = ref_matrix.sum(axis=1)  # Total given per member
        avg_referrals = ref_totals.mean() if num_members > 0 else 0

        # Calculate OTO statistics
        oto_totals = oto_matrix.sum(axis=1)
        avg_oto = oto_totals.mean() if num_members > 0 else 0

        # Calculate TYFCB statistics
        tyfcb_totals = {}
        for member in ref_matrix.index:
            inside = float(tyfcb_inside.get(member, 0)) if tyfcb_inside else 0
            outside = float(tyfcb_outside.get(member, 0)) if tyfcb_outside else 0
            tyfcb_totals[member] = inside + outside
        avg_tyfcb = sum(tyfcb_totals.values()) / num_members if num_members > 0 else 0

        return {
            "chapter_size": num_members,
            "avg_referrals": avg_referrals,
            "avg_oto": avg_oto,
            "avg_tyfcb": avg_tyfcb,
            "ref_totals": ref_totals.to_dict(),
            "oto_totals": oto_totals.to_dict(),
            "tyfcb_totals": tyfcb_totals,
        }

    @classmethod
    def get_performance_color(cls, value: float, average: float) -> str:
        """
        Determine performance color based on value and average.

        Args:
            value: Member's value for a metric
            average: Chapter average for that metric

        Returns:
            Color hex code or None if no highlighting needed
        """
        if average == 0:
            return None  # No highlighting if average is 0

        ratio = value / average

        if ratio >= cls.THRESHOLD_GREEN:
            return cls.COLOR_GREEN
        elif ratio >= cls.THRESHOLD_ORANGE_LOW:
            return cls.COLOR_ORANGE
        elif ratio < cls.THRESHOLD_RED:
            return cls.COLOR_RED
        else:
            return None  # No highlighting for 0.5-0.75 range

    @classmethod
    def count_performance_tiers(cls, values: Dict[str, float], average: float) -> Dict:
        """
        Count how many members fall into each performance tier.

        Args:
            values: Dict mapping member names to their values
            average: Chapter average

        Returns:
            Dict with counts and percentages for each tier (green/orange/red/neutral)
        """
        if average == 0:
            return {"green": 0, "orange": 0, "red": 0, "neutral": len(values)}

        green_count = 0
        orange_count = 0
        red_count = 0
        neutral_count = 0

        for value in values.values():
            ratio = value / average
            if ratio >= cls.THRESHOLD_GREEN:
                green_count += 1
            elif ratio >= cls.THRESHOLD_ORANGE_LOW:
                orange_count += 1
            elif ratio < cls.THRESHOLD_RED:
                red_count += 1
            else:
                neutral_count += 1

        total = len(values)
        return {
            "green": green_count,
            "orange": orange_count,
            "red": red_count,
            "neutral": neutral_count,
            "green_pct": (green_count / total * 100) if total > 0 else 0,
            "orange_pct": (orange_count / total * 100) if total > 0 else 0,
            "red_pct": (red_count / total * 100) if total > 0 else 0,
        }

    @classmethod
    def calculate_member_completeness(
        cls, all_members: Set[Member], reports: list
    ) -> Dict:
        """
        Calculate how complete each member's data is across all months.

        Args:
            all_members: Set of all members across all reports
            reports: List of MonthlyReport objects

        Returns:
            Dict mapping member names to their completeness metrics
        """
        member_completeness = {}

        for member in all_members:
            months_present = 0
            total_months = len(reports)

            for report in reports:
                # Check if member appears in this month's data
                if hasattr(report, "referral_matrix"):
                    matrix_data = report.referral_matrix
                    if member.name in matrix_data.get("matrix", {}).get("index", []):
                        months_present += 1

            member_completeness[member.name] = {
                "months_present": months_present,
                "total_months": total_months,
                "completeness_pct": (months_present / total_months * 100)
                if total_months > 0
                else 0,
                "is_complete": months_present == total_months,
            }

        return member_completeness

    @classmethod
    def calculate_month_combination(cls, ref_data: Dict, oto_data: Dict) -> Dict:
        """
        Calculate combination matrix values (0-3) for a single month.

        Values:
        - 0 = Neither (no OTO, no Referral)
        - 1 = OTO Only
        - 2 = Referral Only
        - 3 = Both (OTO + Referral) ← Best outcome

        Args:
            ref_data: Referral matrix data for the month
            oto_data: OTO matrix data for the month

        Returns:
            Dict with combination matrix data
        """
        ref_matrix_data = ref_data.get("matrix", {})
        oto_matrix_data = oto_data.get("matrix", {})

        # Get member lists
        members = ref_matrix_data.get("index", [])

        # Create combination matrix
        combination = {}
        for from_member in members:
            combination[from_member] = {}
            for to_member in members:
                if from_member == to_member:
                    combination[from_member][to_member] = None
                    continue

                has_ref = (
                    ref_matrix_data.get("data", {})
                    .get(from_member, {})
                    .get(to_member, 0)
                    > 0
                )
                has_oto = (
                    oto_matrix_data.get("data", {})
                    .get(from_member, {})
                    .get(to_member, 0)
                    > 0
                )

                if has_ref and has_oto:
                    combination[from_member][to_member] = 3  # Both
                elif has_ref:
                    combination[from_member][to_member] = 2  # Referral only
                elif has_oto:
                    combination[from_member][to_member] = 1  # OTO only
                else:
                    combination[from_member][to_member] = 0  # Neither

        return {"matrix": {"index": members, "columns": members, "data": combination}}
