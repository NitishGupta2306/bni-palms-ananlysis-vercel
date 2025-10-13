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
from openpyxl.styles import Font, PatternFill, Alignment


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
            "referral_matrix": referral_matrix.to_dict(),
            "oto_matrix": oto_matrix.to_dict(),
            "combination_matrix": combination_matrix.to_dict(),
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
            BytesIO containing the ZIP file
        """
        zip_buffer = BytesIO()

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            # 1. Add aggregated matrices Excel
            matrices_excel = self._generate_matrices_excel()
            zip_file.writestr(
                f"{self.chapter.name}_Aggregated_Matrices_{self._get_month_range()}.xlsx",
                matrices_excel.getvalue(),
            )

            # 2. Add original slip audit files (if available)
            for report in self.reports:
                if report.slip_audit_file:
                    # Note: Since files are stored as filenames only, we can't include actual files
                    # This would need file storage implementation
                    pass

            # 3. Add member differences report
            differences_excel = self._generate_member_differences_excel()
            zip_file.writestr(
                f"{self.chapter.name}_Member_Differences_{self._get_month_range()}.xlsx",
                differences_excel.getvalue(),
            )

        zip_buffer.seek(0)
        return zip_buffer

    def _get_all_members(self) -> Set[Member]:
        """Get all unique members across all reports."""
        all_member_names = set()

        for report in self.reports:
            if report.referral_matrix_data:
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
        for receiver, givers in source_data.items():
            for giver, amount in givers.items():
                if isinstance(amount, (int, float)):
                    target_dict[receiver][giver] += float(amount)

    def _add_tyfcb_outside_data(self, target_dict: Dict, source_data: Dict):
        """Add outside TYFCB data from source to target."""
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

    def _write_matrix_to_sheet(self, worksheet, matrix_data: Dict, title: str):
        """Write matrix data to Excel worksheet."""
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

        # Write row headers and data
        for row_idx, row_name in enumerate(df.index, start=3):
            worksheet.cell(row=row_idx, column=1, value=row_name).font = Font(bold=True)

            for col_idx, col_name in enumerate(df.columns, start=2):
                value = df.loc[row_name, col_name]
                worksheet.cell(row=row_idx, column=col_idx, value=value)

    def _write_summary_to_sheet(self, worksheet, aggregated_data: Dict):
        """Write summary information to worksheet."""
        worksheet["A1"] = f"Aggregated Report Summary"
        worksheet["A1"].font = Font(bold=True, size=16)

        worksheet["A3"] = "Chapter:"
        worksheet["B3"] = self.chapter.name if self.chapter else "N/A"

        worksheet["A4"] = "Period:"
        worksheet["B4"] = self._get_month_range()

        worksheet["A5"] = "Total Months:"
        worksheet["B5"] = len(self.reports)

        worksheet["A6"] = "Months Included:"
        for idx, report in enumerate(self.reports, start=7):
            worksheet[f"A{idx}"] = report.month_year

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
