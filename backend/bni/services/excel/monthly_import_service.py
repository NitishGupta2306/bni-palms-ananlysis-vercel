import pandas as pd
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Union
from decimal import Decimal
from datetime import datetime, date
import logging

from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone

from chapters.models import Chapter
from members.models import Member
from bni.services.chapter_service import ChapterService
from bni.services.member_service import MemberService

logger = logging.getLogger(__name__)


class BNIMonthlyDataImportService:
    """
    Service for importing BNI monthly audit report data from Excel files.
    Handles both current month and last month data import for trend analysis.
    """

    def __init__(self):
        self.errors = []
        self.stats = {
            'chapters_created': 0,
            'members_created': 0,
            'reports_created': 0,
            'metrics_created': 0,
            'errors': 0
        }

    def import_monthly_data(self, chapter_name: str, excel_file_path: str, report_month: date):
        """
        Import monthly BNI data from Excel file for a specific chapter and month.

        Args:
            chapter_name: Name of the BNI chapter
            excel_file_path: Path to the Excel audit report file
            report_month: Date representing the month (e.g., 2024-12-01)

        Returns:
            dict: Import statistics and any errors
        """
        try:
            with transaction.atomic():
                # Import the new models here to avoid circular imports
                from bni.models import MonthlyChapterReport, MemberMonthlyMetrics

                # Use ChapterService for chapter creation
                chapter, created = ChapterService.get_or_create_chapter(
                    name=chapter_name,
                    location='TBD',
                    meeting_day='TBD'
                )
                if created:
                    self.stats['chapters_created'] += 1
                    logger.info(f"Created new chapter: {chapter_name}")

                # Read Excel file with proper engine handling
                df = self._read_excel_file_monthly(excel_file_path)
                logger.info(f"Reading Excel file: {excel_file_path}")
                logger.info(f"Found {len(df)} rows in Excel file")
                logger.info(f"Excel columns: {list(df.columns)}")

                # Process member data and create monthly metrics
                members_data = self._process_member_data(df, chapter, report_month)

                # Create monthly chapter report
                chapter_report = self._create_chapter_report(chapter, members_data, report_month)

                # Create individual member metrics
                self._create_member_metrics(chapter_report, members_data, report_month)

                logger.info(f"Successfully imported data for {chapter_name} - {report_month}")

        except Exception as e:
            logger.error(f"Error importing data for {chapter_name}: {str(e)}")
            self.errors.append(f"Import failed for {chapter_name}: {str(e)}")
            self.stats['errors'] += 1

        return {
            'stats': self.stats,
            'errors': self.errors
        }

    def _read_excel_file_monthly(self, excel_file_path: str) -> pd.DataFrame:
        """
        Read Excel file with fallback for different formats, specifically for monthly reports.
        Handles XML-based .xls files (audit reports) and standard Excel files.
        """
        from pathlib import Path
        import xml.etree.ElementTree as ET
        import io

        file_path = Path(excel_file_path)

        try:
            # Check if it's an XML-based .xls file by reading the first line
            with open(excel_file_path, 'r', encoding='utf-8') as f:
                first_line = f.readline().strip()

            if first_line.startswith('<?xml'):
                # Handle XML-based .xls files (BNI audit reports)
                logger.info(f"Detected XML-based .xls file: {excel_file_path}")
                return self._parse_xml_excel(excel_file_path)
            else:
                # Handle standard Excel files
                if file_path.suffix.lower() == '.xls':
                    # Try xlrd for binary .xls files
                    df = pd.read_excel(excel_file_path, engine='xlrd')
                    return df
                else:
                    # For .xlsx files, use default engine
                    df = pd.read_excel(excel_file_path)
                    return df

        except Exception as e:
            logger.error(f"Failed to read Excel file {excel_file_path}: {str(e)}")
            raise e

    def _parse_xml_excel(self, xml_file_path: str) -> pd.DataFrame:
        """
        Parse XML-based Excel files (like BNI audit reports) and convert to DataFrame.
        Handles sparse cells (cells with Index attribute indicating position).
        Uses lxml for faster parsing.
        """
        from lxml import etree as ET

        # Parse the XML (lxml is 3-5x faster than ElementTree)
        tree = ET.parse(xml_file_path)
        root = tree.getroot()

        # Define namespace
        ns = {
            'ss': 'urn:schemas-microsoft-com:office:spreadsheet',
            'o': 'urn:schemas-microsoft-com:office:office',
            'x': 'urn:schemas-microsoft-com:office:excel',
            'html': 'http://www.w3.org/TR/REC-html40'
        }

        # Find the worksheet
        worksheet = root.find('.//ss:Worksheet', ns)
        if worksheet is None:
            raise ValueError("No worksheet found in XML file")

        # Find the table
        table = worksheet.find('.//ss:Table', ns)
        if table is None:
            raise ValueError("No table found in worksheet")

        # Extract data from rows
        data_rows = []
        headers = []
        max_cols = 0

        rows = table.findall('.//ss:Row', ns)
        for i, row in enumerate(rows):
            cells = row.findall('.//ss:Cell', ns)
            row_data = []
            col_index = 0

            for cell in cells:
                # Check if cell has an Index attribute (sparse cells)
                index_attr = cell.get(f'{{{ns["ss"]}}}Index')
                if index_attr:
                    # Cell is at specific index (1-based), fill gaps with empty strings
                    target_index = int(index_attr) - 1
                    while col_index < target_index:
                        row_data.append("")
                        col_index += 1

                # Extract cell value
                data_elem = cell.find('.//ss:Data', ns)
                if data_elem is not None:
                    cell_value = data_elem.text if data_elem.text else ""
                else:
                    cell_value = ""
                row_data.append(cell_value)
                col_index += 1

            # Track maximum column count
            max_cols = max(max_cols, len(row_data))

            if i == 0:
                # First row is headers
                headers = row_data
            else:
                # Data rows
                data_rows.append(row_data)

        # Create DataFrame
        if not headers:
            raise ValueError("No headers found in XML file")

        # Pad headers and data rows to match maximum column count
        while len(headers) < max_cols:
            headers.append(f"Column_{len(headers)}")

        for row in data_rows:
            while len(row) < max_cols:
                row.append("")

        df = pd.DataFrame(data_rows, columns=headers)
        logger.info(f"Successfully parsed XML Excel file with {len(df)} rows and {len(df.columns)} columns")

        return df

    def _process_member_data(self, df: pd.DataFrame, chapter: Chapter, report_month: date):
        """
        Process member data from Excel file and return structured member information.
        OPTIMIZED: Uses to_dict('records') instead of iterrows() for 3-5x faster processing.
        """
        members_data = []

        logger.info(f"Excel columns: {list(df.columns)}")

        # OPTIMIZED: Convert to list of dicts (much faster than iterrows)
        for index, row_dict in enumerate(df.to_dict('records')):
            try:
                # Extract member info - be flexible with column names
                first_name = self._extract_dict_value(row_dict, ['First Name', 'FirstName', 'first_name'])
                last_name = self._extract_dict_value(row_dict, ['Last Name', 'LastName', 'last_name'])

                if not first_name or not last_name or first_name == 'nan' or last_name == 'nan':
                    continue  # Skip rows without proper names

                # Use MemberService for member creation
                business_name = self._extract_dict_value(row_dict, ['Business Name', 'BusinessName', 'business_name'], '')
                classification = self._extract_dict_value(row_dict, ['Classification', 'classification'], '')

                member, created = MemberService.get_or_create_member(
                    chapter=chapter,
                    first_name=first_name,
                    last_name=last_name,
                    business_name=business_name,
                    classification=classification,
                    is_active=True
                )

                if created:
                    self.stats['members_created'] += 1
                    logger.info(f"Created new member: {member.full_name}")

                # Extract performance metrics - be flexible with column names
                referrals_given = self._safe_int(self._extract_dict_value(row_dict, ['Referrals Given', 'ReferralsGiven', 'referrals_given']))
                referrals_received = self._safe_int(self._extract_dict_value(row_dict, ['Referrals Received', 'ReferralsReceived', 'referrals_received']))
                one_to_ones = self._safe_int(self._extract_dict_value(row_dict, ['One-to-Ones', 'OneToOnes', 'one_to_ones', 'OTOs', 'otos']))
                tyfcb = self._safe_decimal(self._extract_dict_value(row_dict, ['TYFCB', 'tyfcb', 'TYFCB Amount', 'tyfcb_amount']))

                members_data.append({
                    'member': member,
                    'referrals_given': referrals_given,
                    'referrals_received': referrals_received,
                    'one_to_ones': one_to_ones,
                    'tyfcb': tyfcb
                })

            except Exception as e:
                logger.error(f"Error processing member row {index}: {str(e)}")
                self.errors.append(f"Error processing member row {index}: {str(e)}")
                self.stats['errors'] += 1

        logger.info(f"Processed {len(members_data)} members")
        return members_data

    def _extract_column_value(self, row: pd.Series, possible_columns: list, default=''):
        """
        Extract value from row trying multiple possible column names.
        DEPRECATED: Use _extract_dict_value instead for better performance.
        """
        for col_name in possible_columns:
            if col_name in row.index and not pd.isna(row[col_name]):
                return str(row[col_name]).strip()
        return default

    def _extract_dict_value(self, row_dict: dict, possible_columns: list, default=''):
        """
        Extract value from dict trying multiple possible column names.
        OPTIMIZED version of _extract_column_value for to_dict('records') usage.
        """
        for col_name in possible_columns:
            if col_name in row_dict and not pd.isna(row_dict[col_name]):
                return str(row_dict[col_name]).strip()
        return default

    def _create_chapter_report(self, chapter: Chapter, members_data: list, report_month: date):
        """
        Create or update monthly chapter report with aggregated data.
        """
        # Import here to avoid circular imports
        from bni.models import MonthlyChapterReport

        # Calculate chapter-level aggregations
        total_referrals_given = sum(m['referrals_given'] for m in members_data)
        total_referrals_received = sum(m['referrals_received'] for m in members_data)
        total_one_to_ones = sum(m['one_to_ones'] for m in members_data)
        total_tyfcb = sum(m['tyfcb'] for m in members_data)
        active_member_count = len(members_data)

        # Calculate averages
        avg_referrals_per_member = total_referrals_given / active_member_count if active_member_count > 0 else 0
        avg_one_to_ones_per_member = total_one_to_ones / active_member_count if active_member_count > 0 else 0

        # Create or update chapter report
        chapter_report, created = MonthlyChapterReport.objects.update_or_create(
            chapter=chapter,
            report_month=report_month,
            defaults={
                'total_referrals_given': total_referrals_given,
                'total_referrals_received': total_referrals_received,
                'total_one_to_ones': total_one_to_ones,
                'total_tyfcb': total_tyfcb,
                'active_member_count': active_member_count,
                'avg_referrals_per_member': avg_referrals_per_member,
                'avg_one_to_ones_per_member': avg_one_to_ones_per_member
            }
        )

        if created:
            self.stats['reports_created'] += 1
            logger.info(f"Created chapter report for {chapter.name} - {report_month}")
        else:
            logger.info(f"Updated chapter report for {chapter.name} - {report_month}")

        return chapter_report

    def _create_member_metrics(self, chapter_report, members_data: list, report_month: date):
        """
        Create individual member monthly metrics.
        """
        # Import here to avoid circular imports
        from bni.models import MemberMonthlyMetrics

        for member_data in members_data:
            member = member_data['member']

            # Calculate one-to-one completion rate
            total_possible_otos = chapter_report.active_member_count - 1  # Excluding themselves
            oto_completion_rate = (member_data['one_to_ones'] / total_possible_otos * 100) if total_possible_otos > 0 else 0

            # Create or update member metrics
            member_metrics, created = MemberMonthlyMetrics.objects.update_or_create(
                member=member,
                report_month=report_month,
                defaults={
                    'chapter_report': chapter_report,
                    'referrals_given': member_data['referrals_given'],
                    'referrals_received': member_data['referrals_received'],
                    'one_to_ones_completed': member_data['one_to_ones'],
                    'tyfcb_amount': member_data['tyfcb'],
                    'total_possible_otos': total_possible_otos,
                    'oto_completion_rate': round(oto_completion_rate, 1)
                }
            )

            if created:
                self.stats['metrics_created'] += 1

    def _safe_int(self, value, default=0):
        """
        Safely convert value to integer, handling NaN and empty values.
        """
        try:
            if pd.isna(value) or value == '' or value is None:
                return default
            return int(float(value))
        except (ValueError, TypeError):
            return default

    def _safe_decimal(self, value, default=0):
        """
        Safely convert value to Decimal, handling NaN and empty values.
        """
        try:
            if pd.isna(value) or value == '' or value is None:
                return Decimal(str(default))
            return Decimal(str(float(value)))
        except (ValueError, TypeError, Exception):
            return Decimal(str(default))
