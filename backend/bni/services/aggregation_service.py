"""
Aggregation service for multi-month PALMS analysis.
Combines multiple monthly reports into aggregated matrices and member tracking.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Set, Tuple
from collections import defaultdict
from datetime import datetime
from io import BytesIO
import zipfile

from reports.models import MonthlyReport
from members.models import Member
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Import new modular formatters
from bni.services.excel_formatters import (
    write_referral_matrix,
    write_oto_matrix,
    write_combination_matrix,
    write_tyfcb_report,
    write_summary_page,
    write_inactive_members,
    write_charts_page,
)


class AggregationService:
    """Service for aggregating multiple monthly reports."""

    def __init__(self, reports: List[MonthlyReport]):
        """
        Initialize with list of monthly reports to aggregate.

        Args:
            reports: List of MonthlyReport objects (should be from same chapter)
        """
        self.reports = sorted(reports, key=lambda r: r.month_year)
        self.chapter = self.reports[0].chapter if self.reports else None

        # Color definitions (as per specification.md)
        self.COLOR_GREEN = "B6FFB6"  # Excellent performance
        self.COLOR_ORANGE = "FFD699"  # Good/Average performance
        self.COLOR_RED = "FFB6B6"  # Needs attention
        self.COLOR_YELLOW = "FFE699"  # Special highlights (non-zero values)
        self.COLOR_BLACK = "000000"  # Separators
        self.COLOR_GRAY = "D3D3D3"  # Headers
        self.COLOR_HEADER_BG = "E8F5E8"  # Soft green for headers

        # Performance thresholds (as per specification.md)
        self.THRESHOLD_GREEN = 1.75  # >= 1.75x average
        self.THRESHOLD_ORANGE_HIGH = 1.75  # < 1.75x average
        self.THRESHOLD_ORANGE_LOW = 0.75  # >= 0.75x average
        self.THRESHOLD_RED = 0.5  # < 0.5x average

    # ============================================================================
    # UTILITY METHODS
    # ============================================================================

    def _create_merged_header(
        self, worksheet, title: str, num_columns: int, row: int = 1
    ):
        """Create merged header cell spanning multiple columns."""
        # Get period string
        period_str = self._get_period_display()
        full_title = f"{title} - Period: {period_str}"

        # Merge cells
        end_col = get_column_letter(num_columns)
        worksheet.merge_cells(f"A{row}:{end_col}{row}")

        # Style the merged cell
        cell = worksheet[f"A{row}"]
        cell.value = full_title
        cell.font = Font(bold=True, size=14)
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.fill = PatternFill(
            start_color=self.COLOR_HEADER_BG,
            end_color=self.COLOR_HEADER_BG,
            fill_type="solid",
        )

        # Add border
        thick_border = Border(bottom=Side(style="thick"))
        cell.border = thick_border

        # Set fixed row height for merged header (prevents auto-resizing)
        worksheet.row_dimensions[row].height = 30

    def _get_period_display(self) -> str:
        """Get period string in MM/YYYY - MM/YYYY format."""
        if not self.reports:
            return ""

        if len(self.reports) == 1:
            # Single month
            date = datetime.strptime(self.reports[0].month_year, "%Y-%m")
            return date.strftime("%m/%Y")

        # Multiple months
        start_date = datetime.strptime(self.reports[0].month_year, "%Y-%m")
        end_date = datetime.strptime(self.reports[-1].month_year, "%Y-%m")

        return f"{start_date.strftime('%m/%Y')} - {end_date.strftime('%m/%Y')}"

    def _calculate_chapter_statistics(self, aggregated_data: Dict) -> Dict:
        """Calculate chapter-wide statistics for performance evaluation."""
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

    def _get_performance_color(self, value: float, average: float) -> str:
        """Determine performance color based on value and average."""
        if average == 0:
            return None  # No highlighting if average is 0

        ratio = value / average

        if ratio >= self.THRESHOLD_GREEN:
            return self.COLOR_GREEN
        elif ratio >= self.THRESHOLD_ORANGE_LOW:
            return self.COLOR_ORANGE
        elif ratio < self.THRESHOLD_RED:
            return self.COLOR_RED
        else:
            return None  # No highlighting for 0.5-0.75 range

    def _count_performance_tiers(
        self, values: Dict[str, float], average: float
    ) -> Dict:
        """Count how many members fall into each performance tier."""
        if average == 0:
            return {"green": 0, "orange": 0, "red": 0, "neutral": len(values)}

        green_count = 0
        orange_count = 0
        red_count = 0
        neutral_count = 0

        for value in values.values():
            ratio = value / average
            if ratio >= self.THRESHOLD_GREEN:
                green_count += 1
            elif ratio >= self.THRESHOLD_ORANGE_LOW:
                orange_count += 1
            elif ratio < self.THRESHOLD_RED:
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

    def _add_black_separator_column(
        self, worksheet, col_idx: int, start_row: int, end_row: int
    ):
        """Add a black separator column for visual distinction."""
        col_letter = get_column_letter(col_idx)
        for row in range(start_row, end_row + 1):
            cell = worksheet[f"{col_letter}{row}"]
            cell.fill = PatternFill(
                start_color=self.COLOR_BLACK,
                end_color=self.COLOR_BLACK,
                fill_type="solid",
            )

        # Make column narrow
        worksheet.column_dimensions[col_letter].width = 2

    def _apply_thin_borders(
        self, worksheet, start_row: int, end_row: int, start_col: int, end_col: int
    ):
        """Apply thin borders to a range of cells for professional appearance."""
        thin_side = Side(style="thin", color="000000")

        for row in range(start_row, end_row + 1):
            for col in range(start_col, end_col + 1):
                cell = worksheet.cell(row=row, column=col)
                existing = cell.border

                # Determine which border sides to use
                left_side = thin_side
                right_side = thin_side
                top_side = thin_side
                bottom_side = thin_side

                # Keep medium/thick borders if they exist
                if (
                    existing
                    and existing.left
                    and hasattr(existing.left, "style")
                    and existing.left.style in ["medium", "thick"]
                ):
                    left_side = existing.left
                if (
                    existing
                    and existing.right
                    and hasattr(existing.right, "style")
                    and existing.right.style in ["medium", "thick"]
                ):
                    right_side = existing.right
                if (
                    existing
                    and existing.top
                    and hasattr(existing.top, "style")
                    and existing.top.style in ["medium", "thick"]
                ):
                    top_side = existing.top
                if (
                    existing
                    and existing.bottom
                    and hasattr(existing.bottom, "style")
                    and existing.bottom.style in ["medium", "thick"]
                ):
                    bottom_side = existing.bottom

                cell.border = Border(
                    left=left_side,
                    right=right_side,
                    top=top_side,
                    bottom=bottom_side,
                )

    def _add_thick_right_border(
        self, worksheet, col_idx: int, start_row: int, end_row: int
    ):
        """Add thick right border to a column for section separation."""
        thick_border_right = Border(right=Side(style="medium", color="000000"))

        for row in range(start_row, end_row + 1):
            cell = worksheet.cell(row=row, column=col_idx)
            # Combine with existing borders
            existing = cell.border
            cell.border = Border(
                left=existing.left if existing else None,
                right=Side(style="medium", color="000000"),
                top=existing.top if existing else None,
                bottom=existing.bottom if existing else None,
            )

    def _add_bottom_border_to_row(
        self,
        worksheet,
        row_idx: int,
        start_col: int,
        end_col: int,
        style: str = "medium",
    ):
        """Add bottom border to a row (useful for headers)."""
        for col in range(start_col, end_col + 1):
            cell = worksheet.cell(row=row_idx, column=col)
            existing = cell.border
            cell.border = Border(
                left=existing.left if existing else None,
                right=existing.right if existing else None,
                top=existing.top if existing else None,
                bottom=Side(style=style, color="000000"),
            )

    def _add_outer_table_borders(
        self, worksheet, start_row: int, end_row: int, start_col: int, end_col: int
    ):
        """Add medium borders around the outer edges of a table for a complete boxed look."""
        medium_side = Side(style="medium", color="000000")

        # Top edge
        for col in range(start_col, end_col + 1):
            cell = worksheet.cell(row=start_row, column=col)
            existing = cell.border
            cell.border = Border(
                top=medium_side,
                left=existing.left if existing else None,
                right=existing.right if existing else None,
                bottom=existing.bottom if existing else None,
            )

        # Bottom edge
        for col in range(start_col, end_col + 1):
            cell = worksheet.cell(row=end_row, column=col)
            existing = cell.border
            cell.border = Border(
                bottom=medium_side,
                left=existing.left if existing else None,
                right=existing.right if existing else None,
                top=existing.top if existing else None,
            )

        # Left edge
        for row in range(start_row, end_row + 1):
            cell = worksheet.cell(row=row, column=start_col)
            existing = cell.border
            cell.border = Border(
                left=medium_side,
                top=existing.top if existing else None,
                right=existing.right if existing else None,
                bottom=existing.bottom if existing else None,
            )

        # Right edge
        for row in range(start_row, end_row + 1):
            cell = worksheet.cell(row=row, column=end_col)
            existing = cell.border
            cell.border = Border(
                right=medium_side,
                top=existing.top if existing else None,
                left=existing.left if existing else None,
                bottom=existing.bottom if existing else None,
            )

    # ============================================================================
    # END UTILITY METHODS
    # ============================================================================

    def aggregate_matrices(self) -> Dict:
        """
        Aggregate all matrices across selected months.

        Returns:
            Dictionary containing:
            - referral_matrix: Combined referral counts
            - oto_matrix: Combined one-to-one meeting counts
            - combination_matrix: Combined relationship matrix
            - tyfcb_inside: Combined inside TYFCB data
            - tyfcb_outside: Combined outside TYFCB data
            - member_completeness: Dict of member presence across months
        """
        # Get all unique members across all reports
        all_members = self._get_all_members()
        member_names = sorted([m.full_name for m in all_members])

        # Initialize empty matrices
        referral_matrix = pd.DataFrame(0, index=member_names, columns=member_names)
        oto_matrix = pd.DataFrame(0, index=member_names, columns=member_names)
        tyfcb_inside = defaultdict(lambda: defaultdict(float))
        tyfcb_outside = defaultdict(float)

        # Track member presence
        member_completeness = self._calculate_member_completeness(all_members)

        # Aggregate each report's data
        for report in self.reports:
            # Aggregate referral matrix
            if report.referral_matrix_data:
                self._add_matrix_data(referral_matrix, report.referral_matrix_data)

            # Aggregate OTO matrix
            if report.oto_matrix_data:
                self._add_matrix_data(oto_matrix, report.oto_matrix_data)

            # Aggregate TYFCB data
            if report.tyfcb_inside_data:
                self._add_tyfcb_data(tyfcb_inside, report.tyfcb_inside_data)

            if report.tyfcb_outside_data:
                self._add_tyfcb_outside_data(tyfcb_outside, report.tyfcb_outside_data)

        # Generate combination matrix
        combination_matrix = self._generate_combination_matrix(
            referral_matrix, oto_matrix
        )

        return {
            "referral_matrix": referral_matrix,  # Keep as DataFrame
            "oto_matrix": oto_matrix,  # Keep as DataFrame
            "combination_matrix": combination_matrix,  # Keep as DataFrame
            "tyfcb_inside": dict(tyfcb_inside),
            "tyfcb_outside": dict(tyfcb_outside),
            "member_completeness": member_completeness,
            "month_range": self._get_month_range(),
            "total_months": len(self.reports),
        }

    def get_member_differences(self) -> List[Dict]:
        """
        Get list of members who became inactive during the period.

        Returns:
            List of dicts with member info and when they became inactive
        """
        if not self.reports:
            return []

        # Get members from each report
        members_by_month = {}
        for report in self.reports:
            member_ids = set()
            # Extract member IDs from matrix data
            if report.referral_matrix_data:
                for member_name in report.referral_matrix_data.keys():
                    member = Member.objects.filter(
                        chapter=self.chapter,
                        normalized_name=Member.normalize_name(member_name),
                    ).first()
                    if member:
                        member_ids.add(member.id)
            members_by_month[report.month_year] = member_ids

        # Find members who went inactive
        inactive_members = []
        all_member_ids = (
            set().union(*members_by_month.values()) if members_by_month else set()
        )

        for member_id in all_member_ids:
            last_active_month = None
            for month_year in sorted(members_by_month.keys()):
                if member_id in members_by_month[month_year]:
                    last_active_month = month_year

            # Check if member is not in the latest report
            latest_month = self.reports[-1].month_year
            if member_id not in members_by_month.get(latest_month, set()):
                member = Member.objects.get(id=member_id)
                inactive_members.append(
                    {
                        "member_id": member.id,
                        "member_name": member.full_name,
                        "last_active_month": last_active_month,
                        "business_name": member.business_name,
                        "classification": member.classification,
                    }
                )

        return sorted(inactive_members, key=lambda x: x["member_name"])

    def generate_download_package(self) -> BytesIO:
        """
        Generate ZIP file containing:
        1. Aggregated matrices Excel
        2. Original slip audit files
        3. Member differences report

        Returns:
            BytesIO containing the comprehensive Excel file
        """
        # Generate single comprehensive Excel file
        excel_buffer = self._generate_comprehensive_excel()
        return excel_buffer

    def _get_all_members(self) -> Set[Member]:
        """Get all unique members across all reports."""
        all_member_names = set()

        for report in self.reports:
            if report.referral_matrix_data:
                # Handle serialized format: {members: [...], matrix: [[...]]}
                if "members" in report.referral_matrix_data:
                    all_member_names.update(report.referral_matrix_data["members"])
                else:
                    # Legacy format: {member_name: {...}}
                    all_member_names.update(report.referral_matrix_data.keys())

        # Convert names to Member objects
        members = []
        for name in all_member_names:
            member = Member.objects.filter(
                chapter=self.chapter, normalized_name=Member.normalize_name(name)
            ).first()
            if member:
                members.append(member)

        return set(members)

    def _calculate_member_completeness(self, all_members: Set[Member]) -> Dict:
        """
        Calculate which members are present in all vs some months.

        Returns:
            Dict with member_id as key and completeness info as value
        """
        completeness = {}
        total_months = len(self.reports)

        for member in all_members:
            months_present = []
            months_missing = []

            for report in self.reports:
                # Check if member exists in this report's matrix data
                member_in_report = False
                if report.referral_matrix_data:
                    # Handle serialized format: {members: [...], matrix: [[...]]}
                    if "members" in report.referral_matrix_data:
                        if member.full_name in report.referral_matrix_data["members"]:
                            member_in_report = True
                    else:
                        # Legacy format
                        if member.full_name in report.referral_matrix_data:
                            member_in_report = True

                if member_in_report:
                    months_present.append(report.month_year)
                else:
                    months_missing.append(report.month_year)

            completeness[member.id] = {
                "member_name": member.full_name,
                "present_in_all": len(months_missing) == 0,
                "months_present": months_present,
                "months_missing": months_missing,
                "presence_count": len(months_present),
                "total_months": total_months,
            }

        return completeness

    def _add_matrix_data(self, target_matrix: pd.DataFrame, source_data: Dict):
        """Add matrix data from source to target (sum values)."""
        # Handle serialized format: {members: [...], matrix: [[...]]}
        if "members" in source_data and "matrix" in source_data:
            members = source_data["members"]
            matrix = source_data["matrix"]

            # Add data from source matrix to target
            for i, row_name in enumerate(members):
                if row_name not in target_matrix.index:
                    continue
                for j, col_name in enumerate(members):
                    if col_name not in target_matrix.columns:
                        continue
                    if i < len(matrix) and j < len(matrix[i]):
                        value = matrix[i][j]
                        if isinstance(value, (int, float)):
                            target_matrix.loc[row_name, col_name] += value
        else:
            # Legacy format: {row_name: {col_name: value}}
            for row_name, row_data in source_data.items():
                if row_name not in target_matrix.index:
                    continue
                for col_name, value in row_data.items():
                    if col_name not in target_matrix.columns:
                        continue
                    if isinstance(value, (int, float)):
                        target_matrix.loc[row_name, col_name] += value

    def _add_tyfcb_data(self, target_dict: Dict, source_data: Dict):
        """Add TYFCB data from source to target (sum amounts)."""
        # Handle the actual structure: {'total_amount': X, 'count': Y, 'by_member': {member: amount}}
        if "by_member" in source_data:
            # New structure from processor
            for member, amount in source_data["by_member"].items():
                if isinstance(amount, (int, float)):
                    if member not in target_dict:
                        target_dict[member] = 0
                    target_dict[member] += float(amount)
        else:
            # Legacy structure (if exists): {receiver: {giver: amount}}
            for receiver, givers in source_data.items():
                if isinstance(givers, dict):
                    for giver, amount in givers.items():
                        if isinstance(amount, (int, float)):
                            if receiver not in target_dict:
                                target_dict[receiver] = {}
                            if giver not in target_dict[receiver]:
                                target_dict[receiver][giver] = 0
                            target_dict[receiver][giver] += float(amount)

    def _add_tyfcb_outside_data(self, target_dict: Dict, source_data: Dict):
        """Add outside TYFCB data from source to target."""
        # Handle the actual structure: {'total_amount': X, 'count': Y, 'by_member': {member: amount}}
        if "by_member" in source_data:
            # New structure from processor
            for member, amount in source_data["by_member"].items():
                if isinstance(amount, (int, float)):
                    target_dict[member] = target_dict.get(member, 0) + float(amount)
        else:
            # Legacy structure: {member: amount}
            for member, amount in source_data.items():
                if isinstance(amount, (int, float)):
                    target_dict[member] = target_dict.get(member, 0) + float(amount)

    def _generate_combination_matrix(
        self, ref_matrix: pd.DataFrame, oto_matrix: pd.DataFrame
    ) -> pd.DataFrame:
        """Generate combination matrix from referral and OTO matrices."""
        # 0 = Neither, 1 = OTO only, 2 = Referral only, 3 = Both
        ref_array = (ref_matrix > 0).astype(int) * 2
        oto_array = (oto_matrix > 0).astype(int) * 1
        combination = ref_array + oto_array

        # Set diagonal to 0
        np.fill_diagonal(combination.values, 0)

        return combination

    def _get_month_range(self) -> str:
        """Get month range string for file naming."""
        if not self.reports:
            return ""

        if len(self.reports) == 1:
            return self.reports[0].month_year

        # Parse month_year format (e.g., "2025-01")
        start = self.reports[0].month_year
        end = self.reports[-1].month_year

        # Convert to readable format: "Jan-till-Mar-2025"
        try:
            start_date = datetime.strptime(start, "%Y-%m")
            end_date = datetime.strptime(end, "%Y-%m")

            start_str = start_date.strftime("%b")
            end_str = end_date.strftime("%b")
            year = end_date.strftime("%Y")

            return f"{start_str}-till-{end_str}-{year}"
        except:
            return f"{start}_to_{end}"

    def _generate_comprehensive_excel(self) -> BytesIO:
        """Generate single comprehensive Excel file with all data."""
        aggregated = self.aggregate_matrices()
        differences = self.get_member_differences()

        # Calculate chapter statistics for performance highlighting
        stats = self._calculate_chapter_statistics(aggregated)
        stats["total_months"] = len(self.reports)  # Add total_months to stats

        # Get period string for display
        period_str = self._get_period_display()

        wb = Workbook()
        wb.remove(wb.active)  # Remove default sheet

        # 1. Summary sheet (first)
        ws_summary = wb.create_sheet("Summary", 0)
        write_summary_page(
            ws_summary,
            self.chapter.name if self.chapter else "BNI",
            period_str,
            aggregated,
            differences,
            stats,
        )

        # 2. Referral Matrix (with monthly breakdowns)
        ws_ref = wb.create_sheet("Referral Matrix")
        write_referral_matrix(
            ws_ref,
            aggregated["referral_matrix"],
            period_str,
            stats,
            self.reports,
        )

        # 3. One-to-One Matrix (with monthly breakdowns)
        ws_oto = wb.create_sheet("One-to-One Matrix")
        write_oto_matrix(
            ws_oto,
            aggregated["oto_matrix"],
            period_str,
            stats,
            self.reports,
        )

        # 4. Combination Matrix (with monthly breakdowns) - uses special 4-column format
        ws_combo = wb.create_sheet("Combination Matrix")
        write_combination_matrix(
            ws_combo,
            aggregated["combination_matrix"],
            period_str,
            stats,
            self.reports,
        )

        # 5. Combined TYFCB Report (Inside and Outside)
        if aggregated["tyfcb_inside"] or aggregated["tyfcb_outside"]:
            ws_tyfcb = wb.create_sheet("TYFCB Report")
            write_tyfcb_report(
                ws_tyfcb,
                aggregated["tyfcb_inside"],
                aggregated["tyfcb_outside"],
                period_str,
                stats,
                self.reports,
            )

        # 6. Member Differences (Inactive Members)
        if differences:
            ws_diff = wb.create_sheet("Inactive Members")
            write_inactive_members(ws_diff, differences, period_str)

        # 7. Charts (Visual Analytics - last sheet)
        ws_charts = wb.create_sheet("Charts")
        write_charts_page(
            ws_charts,
            self.chapter.name if self.chapter else "BNI",
            period_str,
            aggregated,
            stats,
            self.reports,
        )

        excel_buffer = BytesIO()
        wb.save(excel_buffer)
        excel_buffer.seek(0)

        return excel_buffer

    def _generate_matrices_excel(self) -> BytesIO:
        """Generate Excel file with all aggregated matrices."""
        aggregated = self.aggregate_matrices()

        wb = Workbook()
        wb.remove(wb.active)  # Remove default sheet

        # Add Referral Matrix sheet
        ws_ref = wb.create_sheet("Referral Matrix")
        self._write_matrix_to_sheet(
            ws_ref, aggregated["referral_matrix"], "Referrals Given →"
        )

        # Add One-to-One Matrix sheet
        ws_oto = wb.create_sheet("One-to-One Matrix")
        self._write_matrix_to_sheet(
            ws_oto, aggregated["oto_matrix"], "One-to-One Meetings"
        )

        # Add Combination Matrix sheet
        ws_combo = wb.create_sheet("Combination Matrix")
        self._write_matrix_to_sheet(
            ws_combo,
            aggregated["combination_matrix"],
            "Combination (0=None, 1=OTO, 2=Ref, 3=Both)",
        )

        # Add Summary sheet
        ws_summary = wb.create_sheet("Summary", 0)
        self._write_summary_to_sheet(ws_summary, aggregated)

        excel_buffer = BytesIO()
        wb.save(excel_buffer)
        excel_buffer.seek(0)

        return excel_buffer

    def _write_single_report_matrix(self, worksheet, matrix_data: Dict, title: str):
        """Write single report matrix data with totals and highlighting."""
        # Handle serialized format: {members: [...], matrix: [[...]]}
        if (
            not matrix_data
            or "members" not in matrix_data
            or "matrix" not in matrix_data
        ):
            worksheet["A1"] = title
            worksheet["A1"].font = Font(bold=True, size=14)
            worksheet["A3"] = "No data available for this month"
            return

        members = matrix_data["members"]
        matrix = matrix_data["matrix"]

        # Convert to DataFrame for easier processing
        df = pd.DataFrame(matrix, index=members, columns=members)

        # Use the same formatting as aggregated matrices
        self._write_matrix_to_sheet(worksheet, df, title)

    def _write_matrix_with_monthly_breakdowns(
        self, worksheet, aggregated_matrix, title: str, matrix_type: str, stats: Dict
    ):
        """Write aggregated matrix with monthly total rows and performance highlighting."""
        # Convert to DataFrame if needed
        if isinstance(aggregated_matrix, dict):
            df = pd.DataFrame(aggregated_matrix)
        else:
            df = aggregated_matrix

        num_members = len(df.columns)

        # Calculate total columns needed: 1 (Member col) + num_members + 2 aggregates + (2 monthly cols) * num_months
        num_months = len(self.reports)
        total_columns = 1 + num_members + 2 + (num_months * 2)

        # Create merged header
        self._create_merged_header(worksheet, title, total_columns, row=1)

        # Freeze panes at row 3 (below headers)
        worksheet.freeze_panes = "B3"

        # Column headers (Row 2)
        # Add header for row names column (column 1)
        cell = worksheet.cell(row=2, column=1, value="Member")
        cell.font = Font(bold=True)
        cell.fill = PatternFill(
            start_color=self.COLOR_GRAY,
            end_color=self.COLOR_GRAY,
            fill_type="solid",
        )
        cell.alignment = Alignment(horizontal="center", vertical="center")

        current_col = 2

        # Member name column headers (rotated 90°)
        for member_name in df.columns:
            cell = worksheet.cell(row=2, column=current_col)
            cell.value = member_name
            cell.font = Font(bold=True, size=9)
            cell.alignment = Alignment(
                textRotation=90, horizontal="center", vertical="bottom"
            )
            cell.fill = PatternFill(
                start_color=self.COLOR_GRAY,
                end_color=self.COLOR_GRAY,
                fill_type="solid",
            )
            current_col += 1

        # Aggregate column headers
        agg_start_col = current_col
        worksheet.cell(row=2, column=current_col, value="Total Given").font = Font(
            bold=True
        )
        worksheet.cell(
            row=2, column=current_col, value="Total Given"
        ).fill = PatternFill(
            start_color=self.COLOR_GRAY, end_color=self.COLOR_GRAY, fill_type="solid"
        )
        current_col += 1

        worksheet.cell(row=2, column=current_col, value="Unique Given").font = Font(
            bold=True
        )
        worksheet.cell(
            row=2, column=current_col, value="Unique Given"
        ).fill = PatternFill(
            start_color=self.COLOR_GRAY, end_color=self.COLOR_GRAY, fill_type="solid"
        )
        agg_end_col = current_col  # Save position for thick border later
        current_col += 1

        # Monthly column headers
        for idx, report in enumerate(self.reports, start=1):
            month_date = datetime.strptime(report.month_year, "%Y-%m")
            month_display = month_date.strftime("%m/%Y")

            cell = worksheet.cell(
                row=2, column=current_col, value=f"M{idx}-{month_display}\nTotal"
            )
            cell.font = Font(bold=True, size=8)
            cell.alignment = Alignment(
                textRotation=90, horizontal="center", vertical="bottom", wrap_text=True
            )
            cell.fill = PatternFill(
                start_color=self.COLOR_GRAY,
                end_color=self.COLOR_GRAY,
                fill_type="solid",
            )
            current_col += 1

            cell = worksheet.cell(
                row=2, column=current_col, value=f"M{idx}-{month_display}\nUnique"
            )
            cell.font = Font(bold=True, size=8)
            cell.alignment = Alignment(
                textRotation=90, horizontal="center", vertical="bottom", wrap_text=True
            )
            cell.fill = PatternFill(
                start_color=self.COLOR_GRAY,
                end_color=self.COLOR_GRAY,
                fill_type="solid",
            )

            # Save position for thick border after each month's "Unique" column
            if idx < len(self.reports):  # Don't mark last month
                month_end_col = current_col

            current_col += 1

        # Set header row height for rotated text visibility
        worksheet.row_dimensions[2].height = 60

        # Get performance metrics
        if matrix_type == "referral":
            member_totals = stats["ref_totals"]
            avg_value = stats["avg_referrals"]
        elif matrix_type == "oto":
            member_totals = stats["oto_totals"]
            avg_value = stats["avg_oto"]
        else:  # combination - we'll calculate "Both" counts
            member_totals = {}
            for member in df.index:
                member_totals[member] = (df.loc[member] == 3).sum()
            avg_value = (
                sum(member_totals.values()) / len(member_totals) if member_totals else 0
            )

        # Write data rows (starting at row 3)
        current_row = 3
        yellow_fill = PatternFill(
            start_color=self.COLOR_YELLOW,
            end_color=self.COLOR_YELLOW,
            fill_type="solid",
        )

        for row_name in df.index:
            # Member name (with performance highlighting)
            member_cell = worksheet.cell(row=current_row, column=1, value=row_name)
            member_cell.font = Font(bold=True)

            # Apply performance color to member name
            perf_color = self._get_performance_color(
                member_totals.get(row_name, 0), avg_value
            )
            if perf_color:
                member_cell.fill = PatternFill(
                    start_color=perf_color, end_color=perf_color, fill_type="solid"
                )

            # Matrix data cells
            col_idx = 2
            for col_name in df.columns:
                value = df.loc[row_name, col_name]
                cell = worksheet.cell(row=current_row, column=col_idx, value=value)

                # Yellow highlight for non-zero values
                if value and value > 0:
                    cell.fill = yellow_fill
                    cell.font = Font(bold=True)

                col_idx += 1

            # Calculate aggregate totals for this member
            row_total = df.loc[row_name].sum()
            unique_count = (df.loc[row_name] > 0).sum()

            # Total Given (with performance highlighting)
            total_cell = worksheet.cell(
                row=current_row, column=agg_start_col, value=row_total
            )
            total_cell.font = Font(bold=True)
            if perf_color:
                total_cell.fill = PatternFill(
                    start_color=perf_color, end_color=perf_color, fill_type="solid"
                )

            # Unique Given (with performance highlighting)
            unique_cell = worksheet.cell(
                row=current_row, column=agg_start_col + 1, value=unique_count
            )
            unique_cell.font = Font(bold=True)
            if perf_color:
                unique_cell.fill = PatternFill(
                    start_color=perf_color, end_color=perf_color, fill_type="solid"
                )

            # Move to monthly columns (right after aggregate columns)
            col_idx = agg_end_col + 1

            # Monthly totals
            for report in self.reports:
                # Get month matrix data
                if matrix_type == "referral":
                    month_matrix_data = report.referral_matrix_data
                elif matrix_type == "oto":
                    month_matrix_data = report.oto_matrix_data
                else:  # combination
                    if report.referral_matrix_data and report.oto_matrix_data:
                        month_matrix_data = self._calculate_month_combination(
                            report.referral_matrix_data, report.oto_matrix_data
                        )
                    else:
                        month_matrix_data = None

                # Calculate monthly totals for this member
                if (
                    month_matrix_data
                    and "members" in month_matrix_data
                    and "matrix" in month_matrix_data
                ):
                    members = month_matrix_data["members"]
                    matrix = month_matrix_data["matrix"]

                    if row_name in members:
                        member_idx = members.index(row_name)
                        if member_idx < len(matrix):
                            month_row = matrix[member_idx]
                            month_total = sum(
                                val
                                for val in month_row
                                if isinstance(val, (int, float)) and val > 0
                            )
                            month_unique = sum(
                                1
                                for val in month_row
                                if isinstance(val, (int, float)) and val > 0
                            )

                            worksheet.cell(
                                row=current_row, column=col_idx, value=month_total
                            )
                            worksheet.cell(
                                row=current_row, column=col_idx + 1, value=month_unique
                            )
                        else:
                            worksheet.cell(row=current_row, column=col_idx, value=0)
                            worksheet.cell(row=current_row, column=col_idx + 1, value=0)
                    else:
                        worksheet.cell(row=current_row, column=col_idx, value=0)
                        worksheet.cell(row=current_row, column=col_idx + 1, value=0)
                else:
                    worksheet.cell(row=current_row, column=col_idx, value=0)
                    worksheet.cell(row=current_row, column=col_idx + 1, value=0)

                col_idx += 2  # Move to next month

            current_row += 1

        # Total Received row
        total_row = current_row
        worksheet.cell(row=total_row, column=1, value="Total Received").font = Font(
            bold=True
        )

        col_idx = 2
        for col_name in df.columns:
            col_total = df[col_name].sum()
            cell = worksheet.cell(row=total_row, column=col_idx, value=col_total)
            cell.font = Font(bold=True)
            col_idx += 1

        # Add professional borders (ORDER MATTERS)

        # 1. Outer table borders first
        self._add_outer_table_borders(worksheet, 2, total_row, 1, total_columns)

        # 2. Medium border below headers
        self._add_bottom_border_to_row(worksheet, 2, 1, total_columns, style="medium")

        # 3. Thick right borders for section separators
        self._add_thick_right_border(worksheet, agg_end_col, 2, total_row)
        month_col = agg_end_col + 1
        for idx in range(num_months - 1):
            month_end = month_col + 1
            self._add_thick_right_border(worksheet, month_end, 2, total_row)
            month_col += 2

        # 4. Thin borders to ALL cells LAST (fills in the grid)
        self._apply_thin_borders(worksheet, 2, total_row, 1, total_columns)

        # 5. Set default column widths
        worksheet.column_dimensions["A"].width = 20  # Member name column
        for col in range(2, total_columns + 1):
            worksheet.column_dimensions[get_column_letter(col)].width = 12

    def _calculate_month_combination(self, ref_data: Dict, oto_data: Dict):
        """Calculate combination matrix for a single month."""
        if "members" not in ref_data or "matrix" not in ref_data:
            return None
        if "members" not in oto_data or "matrix" not in oto_data:
            return None

        members = ref_data["members"]
        ref_matrix = ref_data["matrix"]
        oto_matrix = oto_data["matrix"]

        # Create combination matrix: 0=None, 1=OTO, 2=Ref, 3=Both
        combo_matrix = []
        for i in range(len(members)):
            combo_row = []
            for j in range(len(members)):
                ref_val = (
                    ref_matrix[i][j]
                    if i < len(ref_matrix) and j < len(ref_matrix[i])
                    else 0
                )
                oto_val = (
                    oto_matrix[i][j]
                    if i < len(oto_matrix) and j < len(oto_matrix[i])
                    else 0
                )

                combo_val = 0
                if ref_val > 0:
                    combo_val += 2
                if oto_val > 0:
                    combo_val += 1

                combo_row.append(combo_val)
            combo_matrix.append(combo_row)

        return {"members": members, "matrix": combo_matrix}

    def _write_combination_matrix_with_monthly_breakdowns(
        self, worksheet, aggregated_matrix, title: str, stats: Dict
    ):
        """Write combination matrix with 4 aggregate columns and monthly breakdowns.

        Combination values: 0=Neither, 1=OTO Only, 2=Referral Only, 3=Both
        Aggregate columns: Total Both (3), Total Ref Only (2), Total OTO Only (1), Total Neither (0)
        """
        # Convert to DataFrame if needed
        if isinstance(aggregated_matrix, dict):
            df = pd.DataFrame(aggregated_matrix)
        else:
            df = aggregated_matrix

        num_members = len(df.columns)

        # Calculate total columns: 1 (Member col) + num_members + 4 aggregates + (4 monthly cols) * num_months
        num_months = len(self.reports)
        total_columns = 1 + num_members + 4 + (num_months * 4)

        # Create merged header
        self._create_merged_header(worksheet, title, total_columns, row=1)

        # Freeze panes
        worksheet.freeze_panes = "B3"

        # Column headers (Row 2)
        # Add header for row names column (column 1)
        cell = worksheet.cell(row=2, column=1, value="Member")
        cell.font = Font(bold=True)
        cell.fill = PatternFill(
            start_color=self.COLOR_GRAY,
            end_color=self.COLOR_GRAY,
            fill_type="solid",
        )
        cell.alignment = Alignment(horizontal="center", vertical="center")

        current_col = 2

        # Member name column headers (rotated 90°)
        for member_name in df.columns:
            cell = worksheet.cell(row=2, column=current_col)
            cell.value = member_name
            cell.font = Font(bold=True, size=9)
            cell.alignment = Alignment(
                textRotation=90, horizontal="center", vertical="bottom"
            )
            cell.fill = PatternFill(
                start_color=self.COLOR_GRAY,
                end_color=self.COLOR_GRAY,
                fill_type="solid",
            )
            current_col += 1

        # Aggregate column headers (4 columns for combination)
        agg_start_col = current_col
        agg_headers = ["Both (3)", "Ref Only (2)", "OTO Only (1)", "Neither (0)"]
        for header in agg_headers:
            cell = worksheet.cell(row=2, column=current_col, value=header)
            cell.font = Font(bold=True, size=9)
            cell.fill = PatternFill(
                start_color=self.COLOR_GRAY,
                end_color=self.COLOR_GRAY,
                fill_type="solid",
            )
            cell.alignment = Alignment(wrap_text=True, horizontal="center")
            current_col += 1

        agg_end_col = current_col - 1  # Save position for thick border later

        # Monthly column headers (4 columns per month for combination)
        for idx, report in enumerate(self.reports, start=1):
            month_date = datetime.strptime(report.month_year, "%Y-%m")
            month_display = month_date.strftime("%m/%Y")

            for combo_label in ["Both", "Ref", "OTO", "None"]:
                cell = worksheet.cell(
                    row=2,
                    column=current_col,
                    value=f"M{idx}-{month_display}\n{combo_label}",
                )
                cell.font = Font(bold=True, size=7)
                cell.alignment = Alignment(
                    textRotation=90,
                    horizontal="center",
                    vertical="bottom",
                    wrap_text=True,
                )
                cell.fill = PatternFill(
                    start_color=self.COLOR_GRAY,
                    end_color=self.COLOR_GRAY,
                    fill_type="solid",
                )
                current_col += 1

        # Set header row height for rotated text visibility
        worksheet.row_dimensions[2].height = 60

        # Calculate "Both" counts for performance highlighting
        member_both_counts = {}
        for member in df.index:
            member_both_counts[member] = (df.loc[member] == 3).sum()
        avg_both = (
            sum(member_both_counts.values()) / len(member_both_counts)
            if member_both_counts
            else 0
        )

        # Write data rows (starting at row 3)
        current_row = 3
        yellow_fill = PatternFill(
            start_color=self.COLOR_YELLOW,
            end_color=self.COLOR_YELLOW,
            fill_type="solid",
        )

        for row_name in df.index:
            # Member name (with performance highlighting based on "Both" count)
            member_cell = worksheet.cell(row=current_row, column=1, value=row_name)
            member_cell.font = Font(bold=True)

            perf_color = self._get_performance_color(
                member_both_counts[row_name], avg_both
            )
            if perf_color:
                member_cell.fill = PatternFill(
                    start_color=perf_color, end_color=perf_color, fill_type="solid"
                )

            # Matrix data cells
            col_idx = 2
            for col_name in df.columns:
                value = df.loc[row_name, col_name]
                cell = worksheet.cell(row=current_row, column=col_idx, value=value)

                # Yellow highlight for "Both" (value 3)
                if value == 3:
                    cell.fill = yellow_fill
                    cell.font = Font(bold=True)

                col_idx += 1

            # Calculate aggregate counts for this member
            member_row = df.loc[row_name]
            both_count = (member_row == 3).sum()
            ref_only_count = (member_row == 2).sum()
            oto_only_count = (member_row == 1).sum()
            neither_count = (member_row == 0).sum()

            # Write aggregate columns (with performance highlighting)
            agg_values = [both_count, ref_only_count, oto_only_count, neither_count]
            for i, agg_val in enumerate(agg_values):
                cell = worksheet.cell(
                    row=current_row, column=agg_start_col + i, value=agg_val
                )
                cell.font = Font(bold=True)
                if i == 0 and perf_color:  # Only highlight "Both" column
                    cell.fill = PatternFill(
                        start_color=perf_color, end_color=perf_color, fill_type="solid"
                    )

            # Move to monthly columns (right after 4 aggregate columns)
            col_idx = agg_end_col + 1

            # Monthly counts
            for report in self.reports:
                # Get month combination data
                if report.referral_matrix_data and report.oto_matrix_data:
                    month_matrix_data = self._calculate_month_combination(
                        report.referral_matrix_data, report.oto_matrix_data
                    )
                else:
                    month_matrix_data = None

                # Calculate monthly counts for this member
                if (
                    month_matrix_data
                    and "members" in month_matrix_data
                    and "matrix" in month_matrix_data
                ):
                    members = month_matrix_data["members"]
                    matrix = month_matrix_data["matrix"]

                    if row_name in members:
                        member_idx = members.index(row_name)
                        if member_idx < len(matrix):
                            month_row = matrix[member_idx]
                            month_both = sum(1 for val in month_row if val == 3)
                            month_ref = sum(1 for val in month_row if val == 2)
                            month_oto = sum(1 for val in month_row if val == 1)
                            month_none = sum(1 for val in month_row if val == 0)

                            worksheet.cell(
                                row=current_row, column=col_idx, value=month_both
                            )
                            worksheet.cell(
                                row=current_row, column=col_idx + 1, value=month_ref
                            )
                            worksheet.cell(
                                row=current_row, column=col_idx + 2, value=month_oto
                            )
                            worksheet.cell(
                                row=current_row, column=col_idx + 3, value=month_none
                            )
                        else:
                            for i in range(4):
                                worksheet.cell(
                                    row=current_row, column=col_idx + i, value=0
                                )
                    else:
                        for i in range(4):
                            worksheet.cell(row=current_row, column=col_idx + i, value=0)
                else:
                    for i in range(4):
                        worksheet.cell(row=current_row, column=col_idx + i, value=0)

                col_idx += 4  # Move to next month

            current_row += 1

        # Total Received row
        total_row = current_row
        worksheet.cell(row=total_row, column=1, value="Total Received").font = Font(
            bold=True
        )

        # Totals for member name columns (matrix cells)
        col_idx = 2
        for col_name in df.columns:
            # For combination, we'll show the count of "Both" received
            col_both_count = (df[col_name] == 3).sum()
            cell = worksheet.cell(row=total_row, column=col_idx, value=col_both_count)
            cell.font = Font(bold=True)
            col_idx += 1

        # Totals for aggregate columns (sum all members' aggregate values)
        for agg_idx in range(4):  # Both, Ref Only, OTO Only, Neither
            col_total = 0
            for row_name in df.index:
                member_row = df.loc[row_name]
                if agg_idx == 0:  # Both
                    col_total += (member_row == 3).sum()
                elif agg_idx == 1:  # Ref Only
                    col_total += (member_row == 2).sum()
                elif agg_idx == 2:  # OTO Only
                    col_total += (member_row == 1).sum()
                else:  # Neither
                    col_total += (member_row == 0).sum()

            cell = worksheet.cell(
                row=total_row, column=agg_start_col + agg_idx, value=col_total
            )
            cell.font = Font(bold=True)

        # Totals for monthly columns (sum monthly counts across all members)
        # Note: We don't have monthly data stored in a way that's easy to sum here
        # So we'll leave these columns empty in the Total Received row for now
        # The borders will still apply to make it look clean

    def _write_matrix_to_sheet(self, worksheet, matrix_data: Dict, title: str):
        """Write matrix data to Excel worksheet with totals and highlighting."""
        # Convert dict to DataFrame if needed
        if isinstance(matrix_data, dict):
            df = pd.DataFrame(matrix_data)
        else:
            df = matrix_data

        # Write title
        worksheet["A1"] = title
        worksheet["A1"].font = Font(bold=True, size=14)

        # Write column headers
        for col_idx, col_name in enumerate(df.columns, start=2):
            cell = worksheet.cell(row=2, column=col_idx)
            cell.value = col_name
            cell.font = Font(bold=True)
            cell.alignment = Alignment(textRotation=90, horizontal="center")

        # Add "Total Given" and "Unique Given" headers
        total_col = len(df.columns) + 2
        worksheet.cell(row=2, column=total_col, value="Total Given").font = Font(
            bold=True
        )
        worksheet.cell(row=2, column=total_col + 1, value="Unique Given").font = Font(
            bold=True
        )

        # Highlighting fills
        highlight_fill = PatternFill(
            start_color="FFE699", end_color="FFE699", fill_type="solid"
        )

        # Write row headers and data
        for row_idx, row_name in enumerate(df.index, start=3):
            # Row header
            worksheet.cell(row=row_idx, column=1, value=row_name).font = Font(bold=True)

            # Calculate totals for this row
            row_total = 0
            unique_count = 0

            # Matrix data
            for col_idx, col_name in enumerate(df.columns, start=2):
                value = df.loc[row_name, col_name]
                cell = worksheet.cell(row=row_idx, column=col_idx, value=value)

                # Highlight non-zero values
                if value and value > 0:
                    cell.fill = highlight_fill
                    cell.font = Font(bold=True)
                    row_total += value
                    unique_count += 1

            # Write totals
            worksheet.cell(row=row_idx, column=total_col, value=row_total).font = Font(
                bold=True
            )
            worksheet.cell(
                row=row_idx, column=total_col + 1, value=unique_count
            ).font = Font(bold=True)

        # Add "Total Received" row at bottom
        total_row = len(df.index) + 3
        worksheet.cell(row=total_row, column=1, value="Total Received").font = Font(
            bold=True
        )

        # Calculate column totals (received)
        for col_idx, col_name in enumerate(df.columns, start=2):
            col_total = df[col_name].sum()
            worksheet.cell(row=total_row, column=col_idx, value=col_total).font = Font(
                bold=True
            )

        # Add professional borders (ORDER MATTERS)

        # 1. Outer table borders first
        self._add_outer_table_borders(worksheet, 2, total_row, 1, total_columns)

        # 2. Medium border below headers
        self._add_bottom_border_to_row(worksheet, 2, 1, total_columns, style="medium")

        # 3. Thick right borders for section separators
        self._add_thick_right_border(worksheet, agg_end_col, 2, total_row)
        month_col = agg_end_col + 1
        for idx in range(num_months - 1):
            month_end = month_col + 3
            self._add_thick_right_border(worksheet, month_end, 2, total_row)
            month_col += 4

        # 4. Thin borders to ALL cells LAST (fills in the grid)
        self._apply_thin_borders(worksheet, 2, total_row, 1, total_columns)

        # 5. Set default column widths
        worksheet.column_dimensions["A"].width = 20  # Member name column
        for col in range(2, total_columns + 1):
            worksheet.column_dimensions[get_column_letter(col)].width = 12

    def _write_summary_to_sheet(
        self, worksheet, aggregated_data: Dict, differences: list, stats: Dict
    ):
        """Write comprehensive summary page with statistics and performance tables."""
        # Merged header
        self._create_merged_header(
            worksheet,
            f"{self.chapter.name if self.chapter else 'BNI'} - Summary Report",
            10,
            row=1,
        )

        # Freeze panes
        worksheet.freeze_panes = "A3"

        current_row = 3

        # ============================================================================
        # SECTION 1: QUICK STATISTICS
        # ============================================================================

        # Section header
        worksheet.cell(
            row=current_row, column=1, value="Chapter Statistics"
        ).font = Font(bold=True, size=12)
        current_row += 1

        # Statistics table
        stat_headers = ["Metric", "Value"]
        for col_idx, header in enumerate(stat_headers, start=1):
            cell = worksheet.cell(row=current_row, column=col_idx)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(
                start_color=self.COLOR_GRAY,
                end_color=self.COLOR_GRAY,
                fill_type="solid",
            )
        current_row += 1

        # Calculate performance tier percentages
        ref_tiers = self._count_performance_tiers(
            stats["ref_totals"], stats["avg_referrals"]
        )
        oto_tiers = self._count_performance_tiers(stats["oto_totals"], stats["avg_oto"])
        tyfcb_tiers = self._count_performance_tiers(
            stats["tyfcb_totals"], stats["avg_tyfcb"]
        )

        # Write statistics
        statistics = [
            ("Chapter Size", stats["chapter_size"]),
            ("Period", self._get_period_display()),
            ("Total Months", len(self.reports)),
            ("", ""),
            ("Chapter Avg Referrals Given", f"{stats['avg_referrals']:.1f}"),
            ("Chapter Avg OTO Given", f"{stats['avg_oto']:.1f}"),
            ("Chapter Avg TYFCB (AED)", f"{stats['avg_tyfcb']:.2f}"),
            ("", ""),
            ("Referrals - % Green", f"{ref_tiers['green_pct']:.1f}%"),
            ("Referrals - % Orange", f"{ref_tiers['orange_pct']:.1f}%"),
            ("Referrals - % Red", f"{ref_tiers['red_pct']:.1f}%"),
            ("", ""),
            ("OTO - % Green", f"{oto_tiers['green_pct']:.1f}%"),
            ("OTO - % Orange", f"{oto_tiers['orange_pct']:.1f}%"),
            ("OTO - % Red", f"{oto_tiers['red_pct']:.1f}%"),
            ("", ""),
            ("TYFCB - % Green", f"{tyfcb_tiers['green_pct']:.1f}%"),
            ("TYFCB - % Orange", f"{tyfcb_tiers['orange_pct']:.1f}%"),
            ("TYFCB - % Red", f"{tyfcb_tiers['red_pct']:.1f}%"),
        ]

        if differences:
            statistics.append(("", ""))
            statistics.append(("Inactive Members", len(differences)))

        for metric, value in statistics:
            worksheet.cell(row=current_row, column=1, value=metric).font = Font(
                bold=metric != ""
            )
            worksheet.cell(row=current_row, column=2, value=value)
            current_row += 1

        # Auto-adjust column widths for statistics
        worksheet.column_dimensions["A"].width = 30
        worksheet.column_dimensions["B"].width = 20

        # ============================================================================
        # SECTION 2: PERFORMANCE TABLE (ALL MEMBERS)
        # ============================================================================

        current_row += 2
        worksheet.cell(
            row=current_row, column=1, value="Member Performance Overview"
        ).font = Font(bold=True, size=12)
        current_row += 1

        # Table headers
        perf_headers = ["Member Name", "Referrals", "OTO", "TYFCB (AED)"]
        for col_idx, header in enumerate(perf_headers, start=1):
            cell = worksheet.cell(row=current_row, column=col_idx)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(
                start_color=self.COLOR_GRAY,
                end_color=self.COLOR_GRAY,
                fill_type="solid",
            )
        current_row += 1

        # Get all members sorted by total performance (sum of normalized scores)
        ref_matrix = aggregated_data["referral_matrix"]
        member_performance = []

        for member in ref_matrix.index:
            ref_val = stats["ref_totals"].get(member, 0)
            oto_val = stats["oto_totals"].get(member, 0)
            tyfcb_val = stats["tyfcb_totals"].get(member, 0)

            # Calculate normalized score (sum of ratios to average)
            ref_ratio = (
                ref_val / stats["avg_referrals"] if stats["avg_referrals"] > 0 else 0
            )
            oto_ratio = oto_val / stats["avg_oto"] if stats["avg_oto"] > 0 else 0
            tyfcb_ratio = (
                tyfcb_val / stats["avg_tyfcb"] if stats["avg_tyfcb"] > 0 else 0
            )
            total_score = ref_ratio + oto_ratio + tyfcb_ratio

            member_performance.append(
                {
                    "member": member,
                    "ref": ref_val,
                    "oto": oto_val,
                    "tyfcb": tyfcb_val,
                    "score": total_score,
                }
            )

        # Sort by score descending
        member_performance.sort(key=lambda x: x["score"], reverse=True)

        # Write performance data with color coding
        for perf_data in member_performance:
            # Member name
            worksheet.cell(
                row=current_row, column=1, value=perf_data["member"]
            ).font = Font(bold=True)

            # Referrals (with color)
            ref_cell = worksheet.cell(row=current_row, column=2, value=perf_data["ref"])
            ref_color = self._get_performance_color(
                perf_data["ref"], stats["avg_referrals"]
            )
            if ref_color:
                ref_cell.fill = PatternFill(
                    start_color=ref_color, end_color=ref_color, fill_type="solid"
                )
                ref_cell.font = Font(bold=True)

            # OTO (with color)
            oto_cell = worksheet.cell(row=current_row, column=3, value=perf_data["oto"])
            oto_color = self._get_performance_color(perf_data["oto"], stats["avg_oto"])
            if oto_color:
                oto_cell.fill = PatternFill(
                    start_color=oto_color, end_color=oto_color, fill_type="solid"
                )
                oto_cell.font = Font(bold=True)

            # TYFCB (with color)
            tyfcb_cell = worksheet.cell(
                row=current_row, column=4, value=perf_data["tyfcb"]
            )
            tyfcb_cell.number_format = "#,##0.00"
            tyfcb_color = self._get_performance_color(
                perf_data["tyfcb"], stats["avg_tyfcb"]
            )
            if tyfcb_color:
                tyfcb_cell.fill = PatternFill(
                    start_color=tyfcb_color, end_color=tyfcb_color, fill_type="solid"
                )
                tyfcb_cell.font = Font(bold=True)

            current_row += 1

        # ============================================================================
        # SECTION 3: PERFORMANCE GUIDE (RIGHT SIDE)
        # ============================================================================

        guide_start_row = 4
        guide_col = 7

        # Guide header
        worksheet.cell(
            row=guide_start_row, column=guide_col, value="Performance Guide"
        ).font = Font(bold=True, size=11)
        worksheet.merge_cells(
            start_row=guide_start_row,
            start_column=guide_col,
            end_row=guide_start_row,
            end_column=guide_col + 1,
        )
        guide_start_row += 2

        # Guide table
        guide_data = [
            ("Color", "Meaning", "Threshold"),
            ("Green", "Excellent", "≥ 1.75x average"),
            ("Orange", "Good/Average", "0.75x - 1.75x average"),
            ("Red", "Needs Attention", "< 0.5x average"),
        ]

        for row_offset, (color_name, meaning, threshold) in enumerate(guide_data):
            row = guide_start_row + row_offset

            if row_offset == 0:  # Header row
                for col_offset, text in enumerate([color_name, meaning, threshold]):
                    cell = worksheet.cell(
                        row=row, column=guide_col + col_offset, value=text
                    )
                    cell.font = Font(bold=True)
                    cell.fill = PatternFill(
                        start_color=self.COLOR_GRAY,
                        end_color=self.COLOR_GRAY,
                        fill_type="solid",
                    )
            else:
                # Color cell
                cell = worksheet.cell(row=row, column=guide_col, value=color_name)
                cell.font = Font(bold=True)
                if color_name == "Green":
                    cell.fill = PatternFill(
                        start_color=self.COLOR_GREEN,
                        end_color=self.COLOR_GREEN,
                        fill_type="solid",
                    )
                elif color_name == "Orange":
                    cell.fill = PatternFill(
                        start_color=self.COLOR_ORANGE,
                        end_color=self.COLOR_ORANGE,
                        fill_type="solid",
                    )
                elif color_name == "Red":
                    cell.fill = PatternFill(
                        start_color=self.COLOR_RED,
                        end_color=self.COLOR_RED,
                        fill_type="solid",
                    )

                # Meaning
                worksheet.cell(row=row, column=guide_col + 1, value=meaning)

                # Threshold
                worksheet.cell(row=row, column=guide_col + 2, value=threshold)

        # Adjust column widths for guide
        worksheet.column_dimensions[get_column_letter(guide_col)].width = 12
        worksheet.column_dimensions[get_column_letter(guide_col + 1)].width = 15
        worksheet.column_dimensions[get_column_letter(guide_col + 2)].width = 20

        # Set default column widths
        worksheet.column_dimensions["A"].width = 30  # Metric names
        worksheet.column_dimensions["B"].width = 15  # Values

    def _write_combined_tyfcb_to_sheet(
        self, worksheet, tyfcb_inside: Dict, tyfcb_outside: Dict, stats: Dict
    ):
        """Write TYFCB report with aggregate table and separate monthly tables."""
        # Create merged header (7 columns for aggregate section)
        self._create_merged_header(worksheet, "TYFCB Report", 7, row=1)

        # Freeze panes
        worksheet.freeze_panes = "B3"

        # Get all unique members
        all_members = set()
        if tyfcb_inside:
            all_members.update(tyfcb_inside.keys())
        if tyfcb_outside:
            all_members.update(tyfcb_outside.keys())

        # Calculate aggregate table data
        member_totals = []
        monthly_data = {}  # Initialize monthly_data dictionary
        for member in all_members:
            monthly_data[member] = {}
            for idx, report in enumerate(self.reports, start=1):
                monthly_data[member][idx] = {"inside": 0, "outside": 0, "count": 0}

                # Get inside TYFCB for this month
                if report.tyfcb_inside_data and "by_member" in report.tyfcb_inside_data:
                    if member in report.tyfcb_inside_data["by_member"]:
                        monthly_data[member][idx]["inside"] = float(
                            report.tyfcb_inside_data["by_member"][member]
                        )

                # Get outside TYFCB for this month
                if (
                    report.tyfcb_outside_data
                    and "by_member" in report.tyfcb_outside_data
                ):
                    if member in report.tyfcb_outside_data["by_member"]:
                        monthly_data[member][idx]["outside"] = float(
                            report.tyfcb_outside_data["by_member"][member]
                        )

                # Count referrals given this month (from referral matrix)
                if (
                    report.referral_matrix_data
                    and "members" in report.referral_matrix_data
                ):
                    if member in report.referral_matrix_data["members"]:
                        member_idx = report.referral_matrix_data["members"].index(
                            member
                        )
                        if member_idx < len(report.referral_matrix_data["matrix"]):
                            # Count non-zero referrals given by this member
                            row = report.referral_matrix_data["matrix"][member_idx]
                            monthly_data[member][idx]["count"] = sum(
                                1 for val in row if val > 0
                            )

        # Build header row
        headers = [
            "Member",
            "Total Inside (AED)",
            "Total Outside (AED)",
            "Total TYFCB (AED)",
            "Total Referrals",
            "Avg Referrals/Month",
            "Avg Value/Referral (AED)",
        ]

        # Add monthly columns
        for idx, report in enumerate(self.reports, start=1):
            headers.append(f"M{idx} - {report.month_year} Inside")
            headers.append(f"M{idx} - {report.month_year} Outside")
            headers.append(f"M{idx} - {report.month_year} Ref Count")

        # Write headers
        for col_idx, header in enumerate(headers, start=1):
            cell = worksheet.cell(row=3, column=col_idx)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(
                start_color="D3D3D3", end_color="D3D3D3", fill_type="solid"
            )
            if col_idx > 1:  # Rotate all headers except Member
                cell.alignment = Alignment(textRotation=90, horizontal="center")

        # Set header row height for rotated text visibility
        worksheet.row_dimensions[3].height = 60

        # Calculate totals for each member
        member_totals = []
        for member in all_members:
            inside_total = tyfcb_inside.get(member, 0) if tyfcb_inside else 0
            outside_total = tyfcb_outside.get(member, 0) if tyfcb_outside else 0
            total_tyfcb = float(inside_total) + float(outside_total)

            # Calculate total referrals across all months
            total_referrals = sum(
                monthly_data[member][idx]["count"]
                for idx in range(1, len(self.reports) + 1)
            )

            # Calculate averages
            num_months = len(self.reports)
            avg_referrals = total_referrals / num_months if num_months > 0 else 0
            avg_value = total_tyfcb / total_referrals if total_referrals > 0 else 0

            member_totals.append(
                {
                    "member": member,
                    "inside": float(inside_total),
                    "outside": float(outside_total),
                    "total": total_tyfcb,
                    "total_referrals": total_referrals,
                    "avg_referrals": avg_referrals,
                    "avg_value": avg_value,
                }
            )

        # Sort by total TYFCB descending
        member_totals.sort(key=lambda x: x["total"], reverse=True)

        # Get chapter average TYFCB for performance highlighting
        avg_tyfcb = stats["avg_tyfcb"]

        # Write data rows
        row = 4
        for member_data in member_totals:
            member = member_data["member"]
            col = 1

            # Member name - highlight RED if Outside > 2x Inside
            member_cell = worksheet.cell(row=row, column=col, value=member)
            member_cell.font = Font(bold=True)

            # Check if Outside TYFCB is more than 2x Inside TYFCB
            inside_val = member_data["inside"]
            outside_val = member_data["outside"]
            if inside_val > 0 and outside_val > (2 * inside_val):
                # Red highlight for name if outside is more than 2x inside
                member_cell.fill = PatternFill(
                    start_color=self.COLOR_RED,
                    end_color=self.COLOR_RED,
                    fill_type="solid",
                )
            col += 1

            # Total Inside
            cell = worksheet.cell(row=row, column=col, value=member_data["inside"])
            cell.number_format = "#,##0.00"
            col += 1

            # Total Outside
            cell = worksheet.cell(row=row, column=col, value=member_data["outside"])
            cell.number_format = "#,##0.00"
            col += 1

            # Total TYFCB - with performance highlighting
            cell = worksheet.cell(row=row, column=col, value=member_data["total"])
            cell.number_format = "#,##0.00"
            cell.font = Font(bold=True)

            # Apply performance color based on chapter average
            perf_color = self._get_performance_color(member_data["total"], avg_tyfcb)
            if perf_color:
                cell.fill = PatternFill(
                    start_color=perf_color, end_color=perf_color, fill_type="solid"
                )
            col += 1

            # Total Referrals
            worksheet.cell(row=row, column=col, value=member_data["total_referrals"])
            col += 1

            # Avg Referrals/Month
            cell = worksheet.cell(
                row=row, column=col, value=member_data["avg_referrals"]
            )
            cell.number_format = "0.00"
            col += 1

            # Avg Value/Referral
            cell = worksheet.cell(row=row, column=col, value=member_data["avg_value"])
            cell.number_format = "#,##0.00"
            col += 1

            # Monthly breakdown columns
            for idx in range(1, len(self.reports) + 1):
                # Inside for this month
                cell = worksheet.cell(
                    row=row, column=col, value=monthly_data[member][idx]["inside"]
                )
                cell.number_format = "#,##0.00"
                col += 1

                # Outside for this month
                cell = worksheet.cell(
                    row=row, column=col, value=monthly_data[member][idx]["outside"]
                )
                cell.number_format = "#,##0.00"
                col += 1

                # Referral count for this month
                worksheet.cell(
                    row=row, column=col, value=monthly_data[member][idx]["count"]
                )
                col += 1

            row += 1

        # Add totals row
        total_row = row + 1
        worksheet.cell(row=total_row, column=1, value="TOTAL:").font = Font(bold=True)

        # Calculate column totals
        total_inside = sum(m["inside"] for m in member_totals)
        total_outside = sum(m["outside"] for m in member_totals)
        total_tyfcb = sum(m["total"] for m in member_totals)
        total_refs = sum(m["total_referrals"] for m in member_totals)

        cell = worksheet.cell(row=total_row, column=2, value=total_inside)
        cell.number_format = "#,##0.00"
        cell.font = Font(bold=True)

        cell = worksheet.cell(row=total_row, column=3, value=total_outside)
        cell.number_format = "#,##0.00"
        cell.font = Font(bold=True)

        cell = worksheet.cell(row=total_row, column=4, value=total_tyfcb)
        cell.number_format = "#,##0.00"
        cell.font = Font(bold=True)

        cell = worksheet.cell(row=total_row, column=5, value=total_refs)
        cell.font = Font(bold=True)

        # Calculate total columns in TYFCB sheet
        num_months = len(self.reports)
        num_agg_cols = 7  # Member, Inside, Outside, Total, Refs, AvgRefs, AvgValue
        total_columns = num_agg_cols + (num_months * 3)  # 3 cols per month

        # Add professional borders (ORDER MATTERS)

        # 1. Outer table borders first
        self._add_outer_table_borders(worksheet, 3, total_row, 1, total_columns)

        # 2. Medium border below headers
        self._add_bottom_border_to_row(worksheet, 3, 1, total_columns, style="medium")

        # 3. Thick right borders for section separators
        self._add_thick_right_border(worksheet, num_agg_cols, 3, total_row)
        month_col = num_agg_cols + 1
        for idx in range(num_months - 1):
            month_end = month_col + 2
            self._add_thick_right_border(worksheet, month_end, 3, total_row)
            month_col += 3

        # 4. Thin borders to ALL cells LAST (fills in the grid)
        self._apply_thin_borders(worksheet, 3, total_row, 1, total_columns)

        # 5. Set default column widths
        worksheet.column_dimensions["A"].width = 20  # Member name column
        for col in range(2, total_columns + 1):
            worksheet.column_dimensions[
                get_column_letter(col)
            ].width = 15  # Wider for TYFCB amounts

    def _write_tyfcb_to_sheet(self, worksheet, tyfcb_data: Dict, title: str):
        """Write TYFCB inside data to worksheet."""
        worksheet["A1"] = title
        worksheet["A1"].font = Font(bold=True, size=14)

        # Headers
        worksheet["A3"] = "Member"
        worksheet["B3"] = "Total TYFCB (AED)"
        worksheet["A3"].font = Font(bold=True)
        worksheet["B3"].font = Font(bold=True)

        # Data - sorted by amount descending
        sorted_members = sorted(tyfcb_data.items(), key=lambda x: x[1], reverse=True)

        row = 4
        for member, amount in sorted_members:
            worksheet[f"A{row}"] = member
            worksheet[f"B{row}"] = float(amount)
            worksheet[f"B{row}"].number_format = "#,##0.00"
            row += 1

        # Total
        total_row = row + 1
        worksheet[f"A{total_row}"] = "TOTAL:"
        worksheet[f"A{total_row}"].font = Font(bold=True)
        worksheet[f"B{total_row}"] = sum(float(v) for v in tyfcb_data.values())
        worksheet[f"B{total_row}"].font = Font(bold=True)
        worksheet[f"B{total_row}"].number_format = "#,##0.00"

    def _write_tyfcb_outside_to_sheet(self, worksheet, tyfcb_outside_data: Dict):
        """Write TYFCB outside data to worksheet."""
        worksheet["A1"] = "TYFCB From Outside Chapter"
        worksheet["A1"].font = Font(bold=True, size=14)

        # Headers
        worksheet["A3"] = "Member"
        worksheet["B3"] = "Total TYFCB (AED)"
        worksheet["A3"].font = Font(bold=True)
        worksheet["B3"].font = Font(bold=True)

        # Data - sorted by amount descending
        sorted_members = sorted(
            tyfcb_outside_data.items(), key=lambda x: x[1], reverse=True
        )

        row = 4
        for member, amount in sorted_members:
            worksheet[f"A{row}"] = member
            worksheet[f"B{row}"] = float(amount)
            worksheet[f"B{row}"].number_format = "#,##0.00"
            row += 1

        # Total
        total_row = row + 1
        worksheet[f"A{total_row}"] = "TOTAL:"
        worksheet[f"A{total_row}"].font = Font(bold=True)
        worksheet[f"B{total_row}"] = sum(float(v) for v in tyfcb_outside_data.values())
        worksheet[f"B{total_row}"].font = Font(bold=True)
        worksheet[f"B{total_row}"].number_format = "#,##0.00"

    def _write_member_differences_to_sheet(self, worksheet, differences: list):
        """Write member differences (inactive members) to worksheet."""
        worksheet["A1"] = "Inactive Members Report"
        worksheet["A1"].font = Font(bold=True, size=14)

        worksheet["A2"] = f"Period: {self._get_month_range()}"

        # Headers
        headers = [
            "Member Name",
            "Business Name",
            "Classification",
            "Last Active Month",
        ]
        for col_idx, header in enumerate(headers, start=1):
            cell = worksheet.cell(row=4, column=col_idx)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(
                start_color="D3D3D3", end_color="D3D3D3", fill_type="solid"
            )

        # Data
        last_row = 5
        for row_idx, member_data in enumerate(differences, start=5):
            worksheet.cell(row=row_idx, column=1, value=member_data["member_name"])
            worksheet.cell(
                row=row_idx, column=2, value=member_data.get("business_name", "")
            )
            worksheet.cell(
                row=row_idx, column=3, value=member_data.get("classification", "")
            )
            worksheet.cell(
                row=row_idx, column=4, value=member_data["last_active_month"]
            )
            last_row = row_idx

        # Add professional borders (ORDER MATTERS)
        if differences:
            # 1. Outer table borders first
            self._add_outer_table_borders(worksheet, 4, last_row, 1, 4)
            # 2. Medium border below headers
            self._add_bottom_border_to_row(worksheet, 4, 1, 4, style="medium")
            # 3. Thin borders to ALL cells LAST (fills in the grid)
            self._apply_thin_borders(worksheet, 4, last_row, 1, 4)

        # Set default column widths
        worksheet.column_dimensions["A"].width = 25  # Member name
        worksheet.column_dimensions["B"].width = 25  # Business name
        worksheet.column_dimensions["C"].width = 20  # Classification
        worksheet.column_dimensions["D"].width = 18  # Last active month

    def _generate_member_differences_excel(self) -> BytesIO:
        """Generate Excel file with member differences (inactive members)."""
        differences = self.get_member_differences()

        wb = Workbook()
        ws = wb.active
        ws.title = "Member Differences"

        # Title
        ws["A1"] = "Member Activity Report"
        ws["A1"].font = Font(bold=True, size=14)

        ws["A2"] = f"Period: {self._get_month_range()}"

        # Headers
        headers = [
            "Member Name",
            "Business Name",
            "Classification",
            "Last Active Month",
            "Status",
        ]
        for col_idx, header in enumerate(headers, start=1):
            cell = ws.cell(row=4, column=col_idx)
            cell.value = header
            cell.font = Font(bold=True)
            cell.fill = PatternFill(
                start_color="D3D3D3", end_color="D3D3D3", fill_type="solid"
            )

        # Data
        if differences:
            for row_idx, member_data in enumerate(differences, start=5):
                ws.cell(row=row_idx, column=1, value=member_data["member_name"])
                ws.cell(
                    row=row_idx, column=2, value=member_data.get("business_name", "")
                )
                ws.cell(
                    row=row_idx, column=3, value=member_data.get("classification", "")
                )
                ws.cell(row=row_idx, column=4, value=member_data["last_active_month"])
                ws.cell(row=row_idx, column=5, value="Became Inactive")
        else:
            ws["A5"] = "No members became inactive during this period"

        # Add detailed month-by-month view
        ws_detail = wb.create_sheet("Month-by-Month Status")
        self._write_member_status_detail(ws_detail)

        excel_buffer = BytesIO()
        wb.save(excel_buffer)
        excel_buffer.seek(0)

        return excel_buffer

    def _write_member_status_detail(self, worksheet):
        """Write detailed member status for each month."""
        all_members = self._get_all_members()
        member_completeness = self._calculate_member_completeness(all_members)

        # Headers
        worksheet["A1"] = "Member"
        worksheet["A1"].font = Font(bold=True)

        # Month columns
        for col_idx, report in enumerate(self.reports, start=2):
            cell = worksheet.cell(row=1, column=col_idx)
            cell.value = report.month_year
            cell.font = Font(bold=True)
            cell.alignment = Alignment(horizontal="center")

        # Data
        for row_idx, member in enumerate(
            sorted(all_members, key=lambda m: m.full_name), start=2
        ):
            worksheet.cell(row=row_idx, column=1, value=member.full_name)

            completeness = member_completeness.get(member.id, {})
            for col_idx, report in enumerate(self.reports, start=2):
                month = report.month_year
                if month in completeness.get("months_present", []):
                    cell = worksheet.cell(row=row_idx, column=col_idx, value="Active")
                    cell.fill = PatternFill(
                        start_color="90EE90", end_color="90EE90", fill_type="solid"
                    )
                else:
                    cell = worksheet.cell(row=row_idx, column=col_idx, value="Inactive")
                    cell.fill = PatternFill(
                        start_color="FFB6C1", end_color="FFB6C1", fill_type="solid"
                    )
