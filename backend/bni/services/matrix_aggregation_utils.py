"""
Data aggregation logic for multi-month BNI reports.

This module handles combining data from multiple monthly reports into
aggregated matrices and tracking member changes over time.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Set
from collections import defaultdict

from reports.models import MonthlyReport
from members.models import Member
from bni.services.calculations import PerformanceCalculator


class DataAggregator:
    """Handles aggregation of monthly report data."""

    @staticmethod
    def get_all_members(reports: List[MonthlyReport], chapter) -> Set[Member]:
        """
        Get all unique members across all reports.

        OPTIMIZED: Uses bulk __in query instead of individual lookups.

        Args:
            reports: List of MonthlyReport objects
            chapter: Chapter instance

        Returns:
            Set of Member objects
        """
        all_member_names = set()

        for report in reports:
            if report.referral_matrix_data:
                matrix_data = report.referral_matrix_data
                # Modern format: {"members": [...], "matrix": [...]}
                if "members" in matrix_data:
                    all_member_names.update(matrix_data["members"])

        # OPTIMIZED: Single bulk query
        normalized_names = [Member.normalize_name(name) for name in all_member_names]
        members = Member.objects.filter(
            chapter=chapter, normalized_name__in=normalized_names
        )

        return set(members)

    @staticmethod
    def add_matrix_data(target_matrix: pd.DataFrame, source_data: Dict):
        """
        Add source matrix data to target DataFrame.

        Args:
            target_matrix: pandas DataFrame to add data to (modified in place)
            source_data: Dict containing matrix data
        """
        if not source_data:
            return

        # Modern format: {'matrix': {'index': [...], 'columns': [...], 'data': {...}}}
        if "matrix" in source_data:
            matrix_dict = source_data["matrix"]
            if "data" in matrix_dict:
                for from_member, to_members in matrix_dict["data"].items():
                    if from_member not in target_matrix.index:
                        continue
                    for to_member, value in to_members.items():
                        if to_member not in target_matrix.columns:
                            continue
                        if isinstance(value, (int, float)):
                            target_matrix.loc[from_member, to_member] += value

    @staticmethod
    def add_tyfcb_data(target_dict: Dict, source_data: Dict):
        """
        Add TYFCB inside data from source to target.

        Args:
            target_dict: Dict to add data to (modified in place)
            source_data: Dict containing TYFCB data
        """
        # Modern structure: {'total_amount': X, 'count': Y, 'by_member': {member: amount}}
        if "by_member" in source_data:
            for member, amount in source_data["by_member"].items():
                if isinstance(amount, (int, float)):
                    if member not in target_dict:
                        target_dict[member] = 0
                    target_dict[member] += float(amount)

    @staticmethod
    def add_tyfcb_outside_data(target_dict: Dict, source_data: Dict):
        """
        Add outside TYFCB data from source to target.

        Args:
            target_dict: Dict to add data to (modified in place)
            source_data: Dict containing outside TYFCB data
        """
        # Modern structure: {'total_amount': X, 'count': Y, 'by_member': {member: amount}}
        if "by_member" in source_data:
            for member, amount in source_data["by_member"].items():
                if isinstance(amount, (int, float)):
                    target_dict[member] = target_dict.get(member, 0) + float(amount)

    @staticmethod
    def generate_combination_matrix(
        ref_matrix: pd.DataFrame, oto_matrix: pd.DataFrame
    ) -> pd.DataFrame:
        """
        Generate combination matrix from referral and OTO matrices.

        Values:
        - 0 = Neither (no OTO, no Referral)
        - 1 = OTO Only
        - 2 = Referral Only
        - 3 = Both (OTO + Referral) ← Best outcome

        Args:
            ref_matrix: Referral matrix DataFrame
            oto_matrix: OTO matrix DataFrame

        Returns:
            Combination matrix DataFrame
        """
        # 0 = Neither, 1 = OTO only, 2 = Referral only, 3 = Both
        ref_array = (ref_matrix > 0).astype(int) * 2
        oto_array = (oto_matrix > 0).astype(int) * 1
        combination = ref_array + oto_array

        # Set diagonal to 0
        np.fill_diagonal(combination.values, 0)

        return combination

    @staticmethod
    def aggregate_matrices(reports: List[MonthlyReport], chapter) -> Dict:
        """
        Aggregate all matrices across selected months.

        Args:
            reports: List of MonthlyReport objects (sorted by month_year)
            chapter: Chapter instance

        Returns:
            Dictionary containing:
            - referral_matrix: Combined referral counts (DataFrame)
            - oto_matrix: Combined one-to-one meeting counts (DataFrame)
            - combination_matrix: Combined relationship matrix (DataFrame)
            - tyfcb_inside: Combined inside TYFCB data
            - tyfcb_outside: Combined outside TYFCB data
            - member_completeness: Dict of member presence across months
            - month_range: String representation of month range
            - total_months: Number of months aggregated
        """
        # Get all unique members across all reports
        all_members = DataAggregator.get_all_members(reports, chapter)
        member_names = sorted([m.full_name for m in all_members])

        # Initialize empty matrices
        referral_matrix = pd.DataFrame(0, index=member_names, columns=member_names)
        oto_matrix = pd.DataFrame(0, index=member_names, columns=member_names)
        tyfcb_inside = defaultdict(lambda: defaultdict(float))
        tyfcb_outside = defaultdict(float)

        # Track member presence
        member_completeness = PerformanceCalculator.calculate_member_completeness(
            all_members, reports
        )

        # Aggregate each report's data
        for report in reports:
            # Aggregate referral matrix
            if report.referral_matrix_data:
                DataAggregator.add_matrix_data(referral_matrix, report.referral_matrix_data)

            # Aggregate OTO matrix
            if report.oto_matrix_data:
                DataAggregator.add_matrix_data(oto_matrix, report.oto_matrix_data)

            # Aggregate TYFCB data
            if report.tyfcb_inside_data:
                DataAggregator.add_tyfcb_data(tyfcb_inside, report.tyfcb_inside_data)

            if report.tyfcb_outside_data:
                DataAggregator.add_tyfcb_outside_data(tyfcb_outside, report.tyfcb_outside_data)

        # Generate combination matrix
        combination_matrix = DataAggregator.generate_combination_matrix(
            referral_matrix, oto_matrix
        )

        # Get month range string
        from bni.services.excel_utils import ExcelFormatter
        month_range = ExcelFormatter.get_month_range(reports)

        return {
            "referral_matrix": referral_matrix,  # Keep as DataFrame
            "oto_matrix": oto_matrix,  # Keep as DataFrame
            "combination_matrix": combination_matrix,  # Keep as DataFrame
            "tyfcb_inside": dict(tyfcb_inside),
            "tyfcb_outside": dict(tyfcb_outside),
            "member_completeness": member_completeness,
            "month_range": month_range,
            "total_months": len(reports),
        }

    @staticmethod
    def get_member_differences(reports: List[MonthlyReport], chapter) -> List[Dict]:
        """
        Get list of members who became inactive during the period.

        OPTIMIZED: Uses bulk queries instead of individual queries for each member.

        Args:
            reports: List of MonthlyReport objects
            chapter: Chapter instance

        Returns:
            List of dicts with member info and when they became inactive
        """
        if not reports:
            return []

        # OPTIMIZED: Build name-to-ID mapping with single bulk query
        all_member_names = set()
        for report in reports:
            if report.referral_matrix_data:
                if "members" in report.referral_matrix_data:
                    all_member_names.update(report.referral_matrix_data["members"])
                else:
                    all_member_names.update(report.referral_matrix_data.keys())

        normalized_names = [Member.normalize_name(name) for name in all_member_names]
        name_to_member = {
            m.full_name: m
            for m in Member.objects.filter(
                chapter=chapter, normalized_name__in=normalized_names
            ).only("id", "first_name", "last_name", "business_name", "classification")
        }

        # Get members from each report using the mapping
        members_by_month = {}
        for report in reports:
            member_ids = set()
            if report.referral_matrix_data:
                member_names = (
                    report.referral_matrix_data.get("members", [])
                    if "members" in report.referral_matrix_data
                    else report.referral_matrix_data.keys()
                )
                for member_name in member_names:
                    member = name_to_member.get(member_name)
                    if member:
                        member_ids.add(member.id)
            members_by_month[report.month_year] = member_ids

        # Find members who went inactive
        inactive_members = []
        all_member_ids = (
            set().union(*members_by_month.values()) if members_by_month else set()
        )

        # OPTIMIZED: Bulk fetch all potentially inactive members
        inactive_member_ids = []
        latest_month = reports[-1].month_year
        for member_id in all_member_ids:
            last_active_month = None
            for month_year in sorted(members_by_month.keys()):
                if member_id in members_by_month[month_year]:
                    last_active_month = month_year

            # If member wasn't in the last month, they went inactive
            if last_active_month and last_active_month != latest_month:
                inactive_member_ids.append(member_id)

        # Bulk fetch inactive member details
        if inactive_member_ids:
            inactive_member_objects = Member.objects.filter(id__in=inactive_member_ids)
            member_id_to_obj = {m.id: m for m in inactive_member_objects}

            for member_id in inactive_member_ids:
                member = member_id_to_obj.get(member_id)
                if not member:
                    continue

                # Find last active month
                last_active = None
                for month_year in sorted(members_by_month.keys()):
                    if member_id in members_by_month[month_year]:
                        last_active = month_year

                inactive_members.append(
                    {
                        "member": member,
                        "last_active_month": last_active,
                        "months_present": sum(
                            1
                            for months in members_by_month.values()
                            if member_id in months
                        ),
                        "total_months": len(reports),
                    }
                )

        return inactive_members
