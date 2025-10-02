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
from openpyxl import load_workbook

from chapters.models import Chapter
from members.models import Member
from reports.models import MonthlyReport
from analytics.models import Referral, OneToOne, TYFCB
from bni.services.chapter_service import ChapterService
from bni.services.member_service import MemberService

logger = logging.getLogger(__name__)


class ExcelProcessorService:
    """Service for processing BNI Excel files and extracting data."""
    
    # Column mappings for NEW BNI Slip Audit Report format (no metadata rows)
    # Row 0: Headers (From, To, Slip Type, Inside/Outside, $ if TYFCB, Qty if CEU, Detail)
    # Row 1+: Data
    COLUMN_MAPPINGS = {
        'giver_name': 0,       # Column A - From
        'receiver_name': 1,     # Column B - To
        'slip_type': 2,         # Column C - Slip Type
        'inside_outside': 3,    # Column D - Inside/Outside
        'tyfcb_amount': 4,      # Column E - $ if TYFCB
        'qty_ceu': 5,           # Column F - Qty if CEU
        'detail': 6,            # Column G - Detail
    }
    
    SLIP_TYPES = {
        'referral': ['referral', 'ref'],
        'one_to_one': ['one to one', 'oto', '1to1', '1-to-1', 'one-to-one'],
        'tyfcb': ['tyfcb', 'thank you for closed business', 'closed business']
    }
    
    def __init__(self, chapter: Chapter):
        self.chapter = chapter
        self.errors = []
        self.warnings = []
        
    def process_excel_file(self, file_path: Union[str, Path], 
                          week_of_date: Optional[date] = None) -> Dict:
        """
        Process a BNI Excel file and extract referrals, one-to-ones, and TYFCBs.
        
        Args:
            file_path: Path to the Excel file
            week_of_date: Optional date to associate with the data
            
        Returns:
            Dictionary with processing results
        """
        file_path = Path(file_path)
        self.errors = []
        self.warnings = []
        
        try:
            # Read Excel file
            df = self._read_excel_file(file_path)
            if df is None:
                return self._create_error_result("Failed to read Excel file")
            
            # Get or create members lookup
            members_lookup = self._get_members_lookup()
            
            # Process the data
            results = self._process_dataframe(df, members_lookup, week_of_date)

            return {
                'success': len(self.errors) == 0,
                'referrals_created': results['referrals_created'],
                'one_to_ones_created': results['one_to_ones_created'],
                'tyfcbs_created': results['tyfcbs_created'],
                'total_processed': results['total_processed'],
                'errors': self.errors,
                'warnings': self.warnings,
            }
            
        except Exception as e:
            logger.exception(f"Error processing Excel file {file_path}")
            return self._create_error_result(f"Processing failed: {str(e)}")
    
    def _read_excel_file(self, file_path: Path) -> Optional[pd.DataFrame]:
        """Read Excel file with fallback for different formats."""
        try:
            # Check if it's an XML-based .xls file by reading the first line
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    first_line = f.readline().strip()
                
                if first_line.startswith('<?xml'):
                    # Handle XML-based .xls files (BNI audit reports)
                    logger.info(f"Detected XML-based .xls file: {file_path}")
                    df = self._parse_xml_excel(str(file_path))
                else:
                    # Handle standard Excel files
                    if file_path.suffix.lower() == '.xls':
                        # Try xlrd for binary .xls files
                        df = pd.read_excel(file_path, engine='xlrd', dtype=str)
                    else:
                        # For .xlsx files, use default engine
                        df = pd.read_excel(file_path, dtype=str)
                        
            except UnicodeDecodeError:
                # If we can't read as text, it's probably binary Excel
                if file_path.suffix.lower() == '.xls':
                    df = pd.read_excel(file_path, engine='xlrd', dtype=str)
                else:
                    df = pd.read_excel(file_path, dtype=str)
            
            # Basic validation
            if df.empty:
                self.errors.append("Excel file is empty")
                return None
                
            # Ensure we have enough columns
            if df.shape[1] < 3:
                self.errors.append("Excel file must have at least 3 columns")
                return None
                
            return df
            
        except Exception as e:
            self.errors.append(f"Failed to read Excel file: {str(e)}")
            return None
    
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
    
    def _get_members_lookup(self) -> Dict[str, Member]:
        """Create a lookup dictionary for chapter members by normalized name. OPTIMIZED with .only() to reduce data transfer."""
        # Only fetch required fields to minimize network transfer from Supabase
        members = Member.objects.filter(
            chapter=self.chapter,
            is_active=True
        ).only('id', 'first_name', 'last_name', 'normalized_name', 'chapter_id')

        lookup = {}

        for member in members:
            # Add by normalized name
            lookup[member.normalized_name] = member

            # Also add variations for fuzzy matching
            full_name = f"{member.first_name} {member.last_name}".lower().strip()
            lookup[full_name] = member

            # Add first name only for common cases
            if member.first_name.lower() not in lookup:
                lookup[member.first_name.lower()] = member

        return lookup
    
    def _find_member_by_name(self, name: str, lookup: Dict[str, Member]) -> Optional[Member]:
        """Find a member by name using fuzzy matching."""
        if not name or pd.isna(name):
            return None
            
        name = str(name).strip()
        if not name:
            return None
        
        # Try exact normalized match first
        normalized = Member.normalize_name(name)
        if normalized in lookup:
            return lookup[normalized]
        
        # Try variations
        variations = [
            name.lower(),
            ' '.join(name.lower().split()),
        ]
        
        for variation in variations:
            if variation in lookup:
                return lookup[variation]
        
        # Log unmatched names for debugging
        self.warnings.append(f"Could not find member: '{name}'")
        return None
    
    def _normalize_slip_type(self, slip_type: str) -> Optional[str]:
        """Normalize slip type to standard format."""
        if not slip_type or pd.isna(slip_type):
            return None
            
        slip_type = str(slip_type).lower().strip()
        
        for standard_type, variations in self.SLIP_TYPES.items():
            if any(variation in slip_type for variation in variations):
                return standard_type
        
        return None
    
    def _process_dataframe(self, df: pd.DataFrame, members_lookup: Dict[str, Member],
                          week_of_date: Optional[date]) -> Dict:
        """Process DataFrame and create database records using bulk operations."""
        results = {
            'referrals_created': 0,
            'one_to_ones_created': 0,
            'tyfcbs_created': 0,
            'total_processed': 0,
        }

        # Collect objects for bulk insert
        referrals_to_create = []
        one_to_ones_to_create = []
        tyfcbs_to_create = []

        # Validate file format by checking column names
        # The _parse_xml_excel method already uses row 0 as headers
        if len(df) > 0 and hasattr(df, 'columns'):
            cols_str = ' '.join([str(c).lower() for c in df.columns])

            # Reject old format (has title like "Slips Audit Report")
            if 'slip' in df.columns[0].lower() or 'audit' in df.columns[0].lower():
                error_msg = "OLD format files are not supported. Please use files without metadata rows."
                logger.error(error_msg)
                self.errors.append(error_msg)
                results['success'] = False
                results['error'] = error_msg
                return results

            # Validate new format has expected columns
            if 'from' not in cols_str or 'slip type' not in cols_str:
                error_msg = f"Invalid file format. Expected columns 'From' and 'Slip Type', got: {list(df.columns)}"
                logger.error(error_msg)
                self.errors.append(error_msg)
                results['success'] = False
                results['error'] = error_msg
                return results

            logger.info(f"Validated NEW format with columns: {list(df.columns)}")

        # No need to skip rows - headers already used as column names
        skip_rows = 0

        # First pass: validate and prepare objects
        for idx, row in df.iterrows():
            try:
                # Skip header/metadata rows based on detected format
                if idx < skip_rows:
                    continue

                # Extract data from row
                giver_name = self._get_cell_value(row, self.COLUMN_MAPPINGS['giver_name'])
                receiver_name = self._get_cell_value(row, self.COLUMN_MAPPINGS['receiver_name'])
                slip_type = self._get_cell_value(row, self.COLUMN_MAPPINGS['slip_type'])

                if not slip_type:
                    continue

                normalized_slip_type = self._normalize_slip_type(slip_type)
                if not normalized_slip_type:
                    self.warnings.append(f"Row {idx + 1}: Unknown slip type '{slip_type}'")
                    continue

                results['total_processed'] += 1

                # Prepare objects based on slip type
                if normalized_slip_type == 'referral':
                    obj = self._prepare_referral(row, idx, giver_name, receiver_name,
                                                members_lookup, week_of_date)
                    if obj:
                        referrals_to_create.append(obj)

                elif normalized_slip_type == 'one_to_one':
                    obj = self._prepare_one_to_one(row, idx, giver_name, receiver_name,
                                                  members_lookup, week_of_date)
                    if obj:
                        one_to_ones_to_create.append(obj)

                elif normalized_slip_type == 'tyfcb':
                    obj = self._prepare_tyfcb(row, idx, giver_name, receiver_name,
                                             members_lookup, week_of_date)
                    if obj:
                        tyfcbs_to_create.append(obj)

            except Exception as e:
                self.errors.append(f"Row {idx + 1}: {str(e)}")
                continue

        # Bulk insert all objects
        with transaction.atomic():
            if referrals_to_create:
                Referral.objects.bulk_create(referrals_to_create, ignore_conflicts=True)
                results['referrals_created'] = len(referrals_to_create)

            if one_to_ones_to_create:
                OneToOne.objects.bulk_create(one_to_ones_to_create, ignore_conflicts=True)
                results['one_to_ones_created'] = len(one_to_ones_to_create)

            if tyfcbs_to_create:
                TYFCB.objects.bulk_create(tyfcbs_to_create, ignore_conflicts=True)
                results['tyfcbs_created'] = len(tyfcbs_to_create)

        # Add success flag and error message if any
        results['success'] = len(self.errors) == 0
        if self.errors:
            results['error'] = f"{len(self.errors)} errors occurred: {'; '.join(self.errors[:3])}"  # Show first 3 errors
        results['warnings'] = self.warnings
        return results
    
    def _get_cell_value(self, row: pd.Series, column_index: int) -> Optional[str]:
        """Safely get cell value from row."""
        try:
            if column_index >= len(row) or pd.isna(row.iloc[column_index]):
                return None
            return str(row.iloc[column_index]).strip()
        except (IndexError, AttributeError):
            return None

    def _prepare_referral(self, row: pd.Series, row_idx: int, giver_name: str,
                         receiver_name: str, members_lookup: Dict[str, Member],
                         week_of_date: Optional[date]) -> Optional[Referral]:
        """Prepare a referral object for bulk insert."""
        if not all([giver_name, receiver_name]):
            self.warnings.append(f"Row {row_idx + 1}: Referral missing giver or receiver name")
            return None

        giver = self._find_member_by_name(giver_name, members_lookup)
        receiver = self._find_member_by_name(receiver_name, members_lookup)

        if not giver:
            self.warnings.append(f"Row {row_idx + 1}: Could not find giver '{giver_name}'")
            return None

        if not receiver:
            self.warnings.append(f"Row {row_idx + 1}: Could not find receiver '{receiver_name}'")
            return None

        if giver == receiver:
            self.warnings.append(f"Row {row_idx + 1}: Self-referral detected, skipping")
            return None

        return Referral(
            giver=giver,
            receiver=receiver,
            date_given=week_of_date or timezone.now().date(),
            week_of=week_of_date
        )

    def _prepare_one_to_one(self, row: pd.Series, row_idx: int, giver_name: str,
                           receiver_name: str, members_lookup: Dict[str, Member],
                           week_of_date: Optional[date]) -> Optional[OneToOne]:
        """Prepare a one-to-one object for bulk insert."""
        if not all([giver_name, receiver_name]):
            self.warnings.append(f"Row {row_idx + 1}: One-to-one missing member names")
            return None

        member1 = self._find_member_by_name(giver_name, members_lookup)
        member2 = self._find_member_by_name(receiver_name, members_lookup)

        if not member1:
            self.warnings.append(f"Row {row_idx + 1}: Could not find member '{giver_name}'")
            return None

        if not member2:
            self.warnings.append(f"Row {row_idx + 1}: Could not find member '{receiver_name}'")
            return None

        if member1 == member2:
            self.warnings.append(f"Row {row_idx + 1}: Self-meeting detected, skipping")
            return None

        return OneToOne(
            member1=member1,
            member2=member2,
            meeting_date=week_of_date or timezone.now().date(),
            week_of=week_of_date
        )

    def _prepare_tyfcb(self, row: pd.Series, row_idx: int, giver_name: str,
                      receiver_name: str, members_lookup: Dict[str, Member],
                      week_of_date: Optional[date]) -> Optional[TYFCB]:
        """Prepare a TYFCB object for bulk insert."""
        if not receiver_name:
            self.warnings.append(f"Row {row_idx + 1}: TYFCB missing receiver name")
            return None

        receiver = self._find_member_by_name(receiver_name, members_lookup)
        if not receiver:
            self.warnings.append(f"Row {row_idx + 1}: Could not find receiver '{receiver_name}'")
            return None

        giver = None
        if giver_name:
            giver = self._find_member_by_name(giver_name, members_lookup)

        # Extract amount
        amount_str = self._get_cell_value(row, self.COLUMN_MAPPINGS['tyfcb_amount'])
        amount = self._parse_currency_amount(amount_str)

        if amount <= 0:
            self.warnings.append(f"Row {row_idx + 1}: Invalid TYFCB amount: {amount_str}")
            return None

        # Extract detail/description
        detail = self._get_cell_value(row, self.COLUMN_MAPPINGS['detail'])

        # Determine if inside or outside chapter
        # TYFCB is OUTSIDE if detail has a value (chapter name), INSIDE if detail is empty
        within_chapter = not bool(detail and detail.strip())

        return TYFCB(
            receiver=receiver,
            giver=giver,
            amount=Decimal(str(amount)),
            within_chapter=within_chapter,
            date_closed=week_of_date or timezone.now().date(),
            description=detail or "",
            week_of=week_of_date
        )

    def _process_referral(self, row: pd.Series, row_idx: int, giver_name: str, 
                         receiver_name: str, members_lookup: Dict[str, Member],
                         week_of_date: Optional[date]) -> bool:
        """Process a referral record."""
        if not all([giver_name, receiver_name]):
            self.warnings.append(f"Row {row_idx + 1}: Referral missing giver or receiver name")
            return False
        
        giver = self._find_member_by_name(giver_name, members_lookup)
        receiver = self._find_member_by_name(receiver_name, members_lookup)
        
        if not giver:
            self.warnings.append(f"Row {row_idx + 1}: Could not find giver '{giver_name}'")
            return False
        
        if not receiver:
            self.warnings.append(f"Row {row_idx + 1}: Could not find receiver '{receiver_name}'")
            return False
        
        if giver == receiver:
            self.warnings.append(f"Row {row_idx + 1}: Self-referral detected, skipping")
            return False
        
        # Create referral directly (migration applied, no unique constraint)
        try:
            Referral.objects.create(
                giver=giver,
                receiver=receiver,
                date_given=week_of_date or timezone.now().date(),
                week_of=week_of_date
            )
            return True
        except Exception as e:
            self.errors.append(f"Row {row_idx + 1}: Referral creation error: {e}")
            return False
    
    def _process_one_to_one(self, row: pd.Series, row_idx: int, giver_name: str,
                           receiver_name: str, members_lookup: Dict[str, Member],
                           week_of_date: Optional[date]) -> bool:
        """Process a one-to-one meeting record."""
        if not all([giver_name, receiver_name]):
            self.warnings.append(f"Row {row_idx + 1}: One-to-one missing member names")
            return False
        
        member1 = self._find_member_by_name(giver_name, members_lookup)
        member2 = self._find_member_by_name(receiver_name, members_lookup)
        
        if not member1:
            self.warnings.append(f"Row {row_idx + 1}: Could not find member '{giver_name}'")
            return False
        
        if not member2:
            self.warnings.append(f"Row {row_idx + 1}: Could not find member '{receiver_name}'")
            return False
        
        if member1 == member2:
            self.warnings.append(f"Row {row_idx + 1}: Self-meeting detected, skipping")
            return False
        
        # Create one-to-one (duplicates already cleared at start)
        try:
            OneToOne.objects.create(
                member1=member1,
                member2=member2,
                meeting_date=week_of_date or timezone.now().date(),
                week_of=week_of_date
            )
            return True
        except Exception as e:
            self.errors.append(f"Row {row_idx + 1}: One-to-one creation error: {e}")
            return False
    
    def _process_tyfcb(self, row: pd.Series, row_idx: int, giver_name: str,
                      receiver_name: str, members_lookup: Dict[str, Member],
                      week_of_date: Optional[date]) -> bool:
        """Process a TYFCB record."""
        if not receiver_name:
            self.warnings.append(f"Row {row_idx + 1}: TYFCB missing receiver name")
            return False
        
        receiver = self._find_member_by_name(receiver_name, members_lookup)
        if not receiver:
            self.warnings.append(f"Row {row_idx + 1}: Could not find receiver '{receiver_name}'")
            return False
        
        # Giver is optional for TYFCB
        giver = None
        if giver_name:
            giver = self._find_member_by_name(giver_name, members_lookup)
        
        # Extract amount
        amount_str = self._get_cell_value(row, self.COLUMN_MAPPINGS['tyfcb_amount'])
        amount = self._parse_currency_amount(amount_str)

        if amount <= 0:
            self.warnings.append(f"Row {row_idx + 1}: Invalid TYFCB amount: {amount_str}")
            return False

        # Determine if inside or outside chapter based on Inside/Outside column
        inside_outside = self._get_cell_value(row, self.COLUMN_MAPPINGS['inside_outside'])
        within_chapter = bool(inside_outside and inside_outside.lower().strip() == 'inside')

        # Extract detail/description
        detail = self._get_cell_value(row, self.COLUMN_MAPPINGS['detail'])
        
        # Create TYFCB (duplicates already cleared at start)
        try:
            TYFCB.objects.create(
                receiver=receiver,
                giver=giver,
                amount=Decimal(str(amount)),
                within_chapter=within_chapter,
                date_closed=week_of_date or timezone.now().date(),
                description=detail or "",
                week_of=week_of_date
            )
            return True
        except Exception as e:
            self.errors.append(f"Row {row_idx + 1}: TYFCB creation error: {e}")
            return False
    
    def _parse_currency_amount(self, amount_str: Optional[str]) -> float:
        """Parse currency amount from string."""
        if not amount_str or pd.isna(amount_str):
            return 0.0
        
        try:
            # Remove currency symbols and commas
            cleaned = str(amount_str).replace('$', '').replace(',', '').strip()
            return float(cleaned) if cleaned else 0.0
        except (ValueError, TypeError):
            return 0.0
    
    def _create_error_result(self, error_message: str) -> Dict:
        """Create error result dictionary."""
        return {
            'success': False,
            'error': error_message,
            'referrals_created': 0,
            'one_to_ones_created': 0,
            'tyfcbs_created': 0,
            'total_processed': 0,
            'errors': [error_message],
            'warnings': [],
        }
    
    def process_monthly_reports_batch(self, slip_audit_files: list, member_names_file, month_year: str) -> Dict:
        """
        Process multiple slip audit files and compile them into a single MonthlyReport.

        Args:
            slip_audit_files: List of Excel files with slip audit data (one per week)
            member_names_file: Optional file with member names
            month_year: Month in format '2024-06'

        Returns:
            Dictionary with processing results from all files combined
        """
        try:
            with transaction.atomic():
                # CRITICAL: Clear ALL analytics data for this chapter BEFORE processing
                # We aggregate 4-5 weekly files into monthly matrices, so we need a clean slate
                # Otherwise old data contaminates new month's aggregations
                from analytics.models import Referral, OneToOne, TYFCB

                logger.info(f"Clearing ALL analytics for {self.chapter.name} to ensure clean aggregation")
                deleted_refs = Referral.objects.filter(giver__chapter=self.chapter).delete()
                deleted_otos = OneToOne.objects.filter(member1__chapter=self.chapter).delete()
                deleted_tyfcbs = TYFCB.objects.filter(receiver__chapter=self.chapter).delete()
                logger.info(f"Deleted {deleted_refs[0]} referrals, {deleted_otos[0]} OTOs, {deleted_tyfcbs[0]} TYFCBs")

                # Delete existing monthly report for this month (if any)
                existing_reports = MonthlyReport.objects.filter(
                    chapter=self.chapter,
                    month_year=month_year
                )
                if existing_reports.exists():
                    logger.info(f"Deleting existing report for {month_year}")
                    existing_reports.delete()

                # Create new MonthlyReport
                slip_filenames = [f.name if hasattr(f, 'name') else 'slip_audit.xls' for f in slip_audit_files]
                member_filename = member_names_file.name if member_names_file and hasattr(member_names_file, 'name') else None

                monthly_report = MonthlyReport.objects.create(
                    chapter=self.chapter,
                    month_year=month_year,
                    slip_audit_file=', '.join(slip_filenames),  # Store all filenames
                    member_names_file=member_filename,
                )

                # Process member_names_file first if provided
                members_created = 0
                members_updated = 0
                if member_names_file:
                    result = self._process_member_names_file(member_names_file)
                    members_created = result['created']
                    members_updated = result['updated']

                # OPTIMIZATION: Get member lookup once and reuse for all slip files (saves N queries)
                logger.info(f"Fetching member lookup for {self.chapter.name}")
                members_lookup = self._get_members_lookup()

                # Process all slip audit files and accumulate results
                total_referrals = 0
                total_one_to_ones = 0
                total_tyfcbs = 0
                total_processed = 0

                for slip_file in slip_audit_files:
                    logger.info(f"Processing file: {slip_file.name}")
                    result = self._process_single_slip_file(slip_file, members_lookup)

                    # Check if result is valid
                    if not result:
                        raise Exception(f"Failed to process {slip_file.name}: No result returned")

                    if not result.get('success', False):
                        # If any file fails, rollback everything
                        error_msg = result.get('error', 'Unknown error')
                        raise Exception(f"Failed to process {slip_file.name}: {error_msg}")

                    total_referrals += result['referrals_created']
                    total_one_to_ones += result['one_to_ones_created']
                    total_tyfcbs += result['tyfcbs_created']
                    total_processed += result['total_processed']

                # Generate and cache matrices after all data is saved
                monthly_report.processed_at = timezone.now()
                monthly_report.save()
                self._generate_and_cache_matrices(monthly_report)

                return {
                    'success': True,
                    'monthly_report_id': monthly_report.id,
                    'month_year': monthly_report.month_year,
                    'files_processed': len(slip_audit_files),
                    'members_created': members_created,
                    'members_updated': members_updated,
                    'referrals_created': total_referrals,
                    'one_to_ones_created': total_one_to_ones,
                    'tyfcbs_created': total_tyfcbs,
                    'total_processed': total_processed,
                    'errors': self.errors,
                    'warnings': self.warnings,
                }

        except Exception as e:
            logger.exception(f"Error processing monthly reports batch for {self.chapter}")
            return self._create_error_result(f"Processing failed: {str(e)}")

    def _process_member_names_file(self, member_names_file) -> Dict:
        """Process member names file and return counts. OPTIMIZED with vectorized pandas and bulk operations."""
        import tempfile
        import os

        # Read member names file
        if hasattr(member_names_file, 'temporary_file_path'):
            member_names_path = member_names_file.temporary_file_path()
            member_df = self._parse_xml_excel(member_names_path)
        else:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.xls') as temp_file:
                for chunk in member_names_file.chunks():
                    temp_file.write(chunk)
                temp_file.flush()

                try:
                    member_df = self._parse_xml_excel(temp_file.name)
                finally:
                    os.unlink(temp_file.name)

        # VECTORIZED: Clean and filter data using pandas operations
        if 'First Name' not in member_df.columns or 'Last Name' not in member_df.columns:
            return {'created': 0, 'updated': 0}

        # Clean data vectorized
        member_df['First Name'] = member_df['First Name'].astype(str).str.strip()
        member_df['Last Name'] = member_df['Last Name'].astype(str).str.strip()

        # Filter out invalid rows
        valid_mask = (
            (member_df['First Name'] != 'nan') &
            (member_df['Last Name'] != 'nan') &
            member_df['First Name'].notna() &
            member_df['Last Name'].notna() &
            (member_df['First Name'].str.len() > 0) &
            (member_df['Last Name'].str.len() > 0)
        )
        valid_df = member_df[valid_mask].copy()

        # Create normalized names vectorized
        valid_df['normalized_name'] = (valid_df['First Name'] + ' ' + valid_df['Last Name']).apply(
            lambda x: Member.normalize_name(x)
        )

        # Get existing members in one query
        existing_members = {
            m.normalized_name: m
            for m in Member.objects.filter(chapter=self.chapter)
        }

        members_to_create = []
        members_to_update = []

        # Convert to list of dicts (faster than iterrows)
        for row_dict in valid_df.to_dict('records'):
            first_name = row_dict['First Name']
            last_name = row_dict['Last Name']
            normalized_name = row_dict['normalized_name']

            if normalized_name in existing_members:
                # Update existing member
                existing_member = existing_members[normalized_name]
                existing_member.first_name = first_name
                existing_member.last_name = last_name
                members_to_update.append(existing_member)
            else:
                # Create new member
                members_to_create.append(Member(
                    chapter=self.chapter,
                    first_name=first_name,
                    last_name=last_name,
                    normalized_name=normalized_name,
                    business_name='',
                    classification='',
                    is_active=True,
                ))

        # Bulk create new members
        if members_to_create:
            Member.objects.bulk_create(members_to_create, ignore_conflicts=True)

        # Bulk update existing members
        if members_to_update:
            Member.objects.bulk_update(
                members_to_update,
                ['first_name', 'last_name'],
                batch_size=100
            )

        return {'created': len(members_to_create), 'updated': len(members_to_update)}

    def _process_single_slip_file(self, slip_audit_file, members_lookup=None) -> Dict:
        """Process a single slip audit file and return results. OPTIMIZED to accept cached member lookup."""
        import tempfile
        import os

        try:
            # Handle both InMemoryUploadedFile and TemporaryUploadedFile
            if hasattr(slip_audit_file, 'temporary_file_path'):
                temp_file_path = slip_audit_file.temporary_file_path()
                df = self._read_excel_file(Path(temp_file_path))
            else:
                with tempfile.NamedTemporaryFile(delete=False, suffix='.xls') as temp_file:
                    for chunk in slip_audit_file.chunks():
                        temp_file.write(chunk)
                        temp_file.flush()

                    try:
                        df = self._read_excel_file(Path(temp_file.name))
                    finally:
                        os.unlink(temp_file.name)

            if df is None:
                return {'success': False, 'error': 'Failed to read Excel file',
                        'referrals_created': 0, 'one_to_ones_created': 0,
                        'tyfcbs_created': 0, 'total_processed': 0}

            # Get members lookup (use cached if provided, otherwise fetch)
            if members_lookup is None:
                members_lookup = self._get_members_lookup()

            # Process the data
            result = self._process_dataframe(df, members_lookup, None)

            # Ensure result has all required keys
            if not result:
                return {'success': False, 'error': 'No result from dataframe processing',
                        'referrals_created': 0, 'one_to_ones_created': 0,
                        'tyfcbs_created': 0, 'total_processed': 0}

            return result

        except Exception as e:
            logger.exception(f"Error processing slip file: {str(e)}")
            return {'success': False, 'error': str(e),
                    'referrals_created': 0, 'one_to_ones_created': 0,
                    'tyfcbs_created': 0, 'total_processed': 0}

    def process_monthly_report(self, slip_audit_file, member_names_file, month_year: str) -> Dict:
        """
        Process files and create a MonthlyReport with processed matrix data.
        
        Args:
            slip_audit_file: Excel file with slip audit data
            member_names_file: Optional file with member names
            month_year: Month in format '2024-06'
            
        Returns:
            Dictionary with processing results
        """
        try:
            with transaction.atomic():
                # Create or get MonthlyReport (store just filename, not file object)
                slip_filename = slip_audit_file.name if hasattr(slip_audit_file, 'name') else 'slip_audit.xls'
                member_filename = member_names_file.name if member_names_file and hasattr(member_names_file, 'name') else None

                monthly_report, created = MonthlyReport.objects.get_or_create(
                    chapter=self.chapter,
                    month_year=month_year,
                    defaults={
                        'slip_audit_file': slip_filename,
                        'member_names_file': member_filename,
                    }
                )

                if not created:
                    # Update existing report
                    monthly_report.slip_audit_file = slip_filename
                    if member_filename:
                        monthly_report.member_names_file = member_filename

                # Process member_names_file first if provided to create/update members
                members_created = 0
                members_updated = 0
                if member_names_file:
                    import tempfile
                    import os

                    # Read member names file
                    if hasattr(member_names_file, 'temporary_file_path'):
                        member_names_path = member_names_file.temporary_file_path()
                        member_df = self._parse_xml_excel(member_names_path)
                    else:
                        with tempfile.NamedTemporaryFile(delete=False, suffix='.xls') as temp_file:
                            for chunk in member_names_file.chunks():
                                temp_file.write(chunk)
                            temp_file.flush()

                            try:
                                member_df = self._parse_xml_excel(temp_file.name)
                            finally:
                                os.unlink(temp_file.name)

                    # Process members from member_names file
                    for index, row in member_df.iterrows():
                        try:
                            # Extract member names directly from row
                            if 'First Name' in row and 'Last Name' in row:
                                first_name = row['First Name']
                                last_name = row['Last Name']
                            else:
                                continue  # Skip if columns don't exist

                            # Check for valid names
                            if pd.isna(first_name) or pd.isna(last_name):
                                continue  # Skip rows without proper names

                            first_name_str = str(first_name).strip()
                            last_name_str = str(last_name).strip()

                            if not first_name_str or not last_name_str:
                                continue

                            # Create or get member using MemberService
                            member, created = MemberService.get_or_create_member(
                                chapter=self.chapter,
                                first_name=first_name_str,
                                last_name=last_name_str,
                                business_name='',
                                classification='',
                                is_active=True
                            )

                            if created:
                                members_created += 1
                                logger.info(f"Created member: {member.full_name}")
                            else:
                                members_updated += 1

                        except Exception as e:
                            logger.error(f"Error processing member row {index}: {str(e)}")
                            self.warnings.append(f"Error processing member row {index}: {str(e)}")

                # Process the slip audit file
                # Handle both InMemoryUploadedFile and TemporaryUploadedFile
                if hasattr(slip_audit_file, 'temporary_file_path'):
                    # TemporaryUploadedFile - use temporary file path
                    temp_file_path = slip_audit_file.temporary_file_path()
                    df = self._read_excel_file(Path(temp_file_path))
                else:
                    # InMemoryUploadedFile - save to temporary file first
                    import tempfile
                    import os

                    with tempfile.NamedTemporaryFile(delete=False, suffix='.xls') as temp_file:
                        for chunk in slip_audit_file.chunks():
                            temp_file.write(chunk)
                            temp_file.flush()

                        try:
                            df = self._read_excel_file(Path(temp_file.name))
                        finally:
                            # Clean up temporary file
                            os.unlink(temp_file.name)
                if df is None:
                    return self._create_error_result("Failed to read Excel file")

                # Get members lookup (after processing member names)
                members_lookup = self._get_members_lookup()
                
                # Process the data and create individual records
                processing_result = self._process_dataframe(df, members_lookup, None)

                # Generate and cache matrices after data is saved
                monthly_report.processed_at = timezone.now()
                monthly_report.save()

                # Generate matrices now (fast enough after optimization)
                self._generate_and_cache_matrices(monthly_report)
                
                return {
                    'success': True,
                    'monthly_report_id': monthly_report.id,
                    'month_year': monthly_report.month_year,
                    'members_created': members_created,
                    'members_updated': members_updated,
                    'referrals_created': processing_result['referrals_created'],
                    'one_to_ones_created': processing_result['one_to_ones_created'],
                    'tyfcbs_created': processing_result['tyfcbs_created'],
                    'total_processed': processing_result['total_processed'],
                    'errors': self.errors,
                    'warnings': self.warnings,
                }
                
        except Exception as e:
            logger.exception(f"Error processing monthly report for {self.chapter}")
            return self._create_error_result(f"Processing failed: {str(e)}")

    def _generate_and_cache_matrices(self, monthly_report):
        """Generate matrices and cache them in the MonthlyReport. Always regenerates to ensure fresh data."""
        logger.info(f"Generating matrices for {monthly_report}")

        from bni.services.matrix_generator import MatrixGenerator

        # Get data
        members = list(Member.objects.filter(chapter=self.chapter, is_active=True))
        referrals = list(Referral.objects.filter(giver__chapter=self.chapter))
        one_to_ones = list(OneToOne.objects.filter(member1__chapter=self.chapter))
        tyfcbs = list(TYFCB.objects.filter(receiver__chapter=self.chapter))

        generator = MatrixGenerator(members)

        # Generate matrices once and reuse
        ref_matrix = generator.generate_referral_matrix(referrals)
        oto_matrix = generator.generate_one_to_one_matrix(one_to_ones)

        # Cache matrices
        monthly_report.referral_matrix_data = {
            'members': [m.full_name for m in members],
            'matrix': ref_matrix.values.tolist(),
        }

        monthly_report.oto_matrix_data = {
            'members': [m.full_name for m in members],
            'matrix': oto_matrix.values.tolist(),
        }

        # Pass pre-generated matrices to avoid regeneration
        monthly_report.combination_matrix_data = {
            'members': [m.full_name for m in members],
            'matrix': generator.generate_combination_matrix(
                referrals, one_to_ones, ref_matrix, oto_matrix
            ).values.tolist(),
            'legend': {'0': 'Neither', '1': 'One-to-One Only', '2': 'Referral Only', '3': 'Both'}
        }

        # Cache TYFCB data - OPTIMIZED with pre-grouping (O(N+M) instead of O(N*M))
        from collections import defaultdict

        inside_tyfcbs = [t for t in tyfcbs if t.within_chapter]
        outside_tyfcbs = [t for t in tyfcbs if not t.within_chapter]

        # Pre-group inside TYFCBs by receiver (single pass)
        inside_by_member = defaultdict(float)
        for t in inside_tyfcbs:
            inside_by_member[t.receiver.full_name] += float(t.amount)

        # Pre-group outside TYFCBs by receiver (single pass)
        outside_by_member = defaultdict(float)
        for t in outside_tyfcbs:
            outside_by_member[t.receiver.full_name] += float(t.amount)

        monthly_report.tyfcb_inside_data = {
            'total_amount': sum(float(t.amount) for t in inside_tyfcbs),
            'count': len(inside_tyfcbs),
            'by_member': {m.full_name: inside_by_member.get(m.full_name, 0.0) for m in members}
        }

        monthly_report.tyfcb_outside_data = {
            'total_amount': sum(float(t.amount) for t in outside_tyfcbs),
            'count': len(outside_tyfcbs),
            'by_member': {m.full_name: outside_by_member.get(m.full_name, 0.0) for m in members}
        }

        monthly_report.save()
        logger.info(f"Matrices cached successfully for {monthly_report}")



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
        """
        members_data = []
        
        logger.info(f"Excel columns: {list(df.columns)}")
        
        for index, row in df.iterrows():
            try:
                # Extract member info - be flexible with column names
                first_name = self._extract_column_value(row, ['First Name', 'FirstName', 'first_name'])
                last_name = self._extract_column_value(row, ['Last Name', 'LastName', 'last_name'])
                
                if not first_name or not last_name or first_name == 'nan' or last_name == 'nan':
                    continue  # Skip rows without proper names
                
                # Use MemberService for member creation
                business_name = self._extract_column_value(row, ['Business Name', 'BusinessName', 'business_name'], '')
                classification = self._extract_column_value(row, ['Classification', 'classification'], '')

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
                referrals_given = self._safe_int(self._extract_column_value(row, ['Referrals Given', 'ReferralsGiven', 'referrals_given']))
                referrals_received = self._safe_int(self._extract_column_value(row, ['Referrals Received', 'ReferralsReceived', 'referrals_received']))
                one_to_ones = self._safe_int(self._extract_column_value(row, ['One-to-Ones', 'OneToOnes', 'one_to_ones', 'OTOs', 'otos']))
                tyfcb = self._safe_decimal(self._extract_column_value(row, ['TYFCB', 'tyfcb', 'TYFCB Amount', 'tyfcb_amount']))
                
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
        """
        for col_name in possible_columns:
            if col_name in row.index and not pd.isna(row[col_name]):
                return str(row[col_name]).strip()
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


class BNIGrowthAnalysisService:
    """
    Service for calculating growth metrics and trends between current and last month.
    """
    
    @staticmethod
    def get_chapter_growth_metrics(chapter_id: int):
        """
        Get growth metrics for a chapter comparing current vs last month.
        """
        try:
            from bni.models import MonthlyChapterReport
            
            chapter = Chapter.objects.get(id=chapter_id)
            
            # Get the two most recent monthly reports
            recent_reports = MonthlyChapterReport.objects.filter(
                chapter=chapter
            ).order_by('-report_month')[:2]
            
            if len(recent_reports) < 2:
                return {
                    'chapter': chapter.name,
                    'has_comparison': False,
                    'message': 'Need at least 2 months of data for comparison'
                }
            
            current_report = recent_reports[0]
            previous_report = recent_reports[1]
            
            # Calculate growth metrics
            growth_data = current_report.calculate_growth(previous_report)
            
            return {
                'chapter': chapter.name,
                'has_comparison': True,
                'current_month': current_report.report_month,
                'previous_month': previous_report.report_month,
                'current_metrics': {
                    'total_referrals_given': current_report.total_referrals_given,
                    'total_one_to_ones': current_report.total_one_to_ones,
                    'total_tyfcb': float(current_report.total_tyfcb),
                    'active_member_count': current_report.active_member_count,
                    'performance_score': current_report.performance_score
                },
                'previous_metrics': {
                    'total_referrals_given': previous_report.total_referrals_given,
                    'total_one_to_ones': previous_report.total_one_to_ones,
                    'total_tyfcb': float(previous_report.total_tyfcb),
                    'active_member_count': previous_report.active_member_count,
                    'performance_score': previous_report.performance_score
                },
                'growth': growth_data
            }
            
        except Chapter.DoesNotExist:
            return {'error': f'Chapter with ID {chapter_id} not found'}
        except Exception as e:
            logger.error(f"Error calculating growth for chapter {chapter_id}: {str(e)}")
            return {'error': str(e)}
    
    @staticmethod
    def get_member_growth_metrics(member_id: int):
        """
        Get growth metrics for an individual member comparing current vs last month.
        """
        try:
            from bni.models import MemberMonthlyMetrics
            
            member = Member.objects.get(id=member_id)
            
            # Get the two most recent monthly metrics
            recent_metrics = MemberMonthlyMetrics.objects.filter(
                member=member
            ).order_by('-report_month')[:2]
            
            if len(recent_metrics) < 2:
                return {
                    'member': member.full_name,
                    'chapter': member.chapter.name,
                    'has_comparison': False,
                    'message': 'Need at least 2 months of data for comparison'
                }
            
            current_metrics = recent_metrics[0]
            previous_metrics = recent_metrics[1]
            
            # Calculate growth metrics
            growth_data = current_metrics.calculate_growth(previous_metrics)
            
            return {
                'member': member.full_name,
                'chapter': member.chapter.name,
                'has_comparison': True,
                'current_month': current_metrics.report_month,
                'previous_month': previous_metrics.report_month,
                'current_metrics': {
                    'referrals_given': current_metrics.referrals_given,
                    'referrals_received': current_metrics.referrals_received,
                    'one_to_ones_completed': current_metrics.one_to_ones_completed,
                    'tyfcb_amount': float(current_metrics.tyfcb_amount),
                    'performance_score': current_metrics.performance_score,
                    'oto_completion_rate': current_metrics.oto_completion_rate
                },
                'previous_metrics': {
                    'referrals_given': previous_metrics.referrals_given,
                    'referrals_received': previous_metrics.referrals_received,
                    'one_to_ones_completed': previous_metrics.one_to_ones_completed,
                    'tyfcb_amount': float(previous_metrics.tyfcb_amount),
                    'performance_score': previous_metrics.performance_score,
                    'oto_completion_rate': previous_metrics.oto_completion_rate
                },
                'growth': growth_data
            }
            
        except Member.DoesNotExist:
            return {'error': f'Member with ID {member_id} not found'}
        except Exception as e:
            logger.error(f"Error calculating growth for member {member_id}: {str(e)}")
            return {'error': str(e)}