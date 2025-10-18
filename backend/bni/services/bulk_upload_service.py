"""
Bulk Upload Service for Regional PALMS Summary Reports

This service processes Regional PALMS Summary reports that contain
multiple chapters and their members. It automatically creates or updates
chapters and members found in the report.
"""
import logging
from typing import Dict, Any
from django.db import transaction
from chapters.models import Chapter
from members.models import Member
from bni.services.excel_processor import ExcelProcessorService
from bni.services.chapter_service import ChapterService
from bni.services.member_service import MemberService

logger = logging.getLogger(__name__)


class BulkUploadService:
    """Service for processing Regional PALMS Summary reports."""

    def __init__(self):
        self.errors = []
        self.warnings = []
        self.chapters_created = 0
        self.chapters_updated = 0
        self.members_created = 0
        self.members_updated = 0

    def process_region_summary(self, file) -> Dict[str, Any]:
        """
        Process a Regional PALMS Summary report with optimized bulk operations.

        OPTIMIZED for Vercel serverless - uses batch operations instead of
        individual queries for each row.

        Args:
            file: Uploaded file object (InMemoryUploadedFile or TemporaryUploadedFile)

        Returns:
            Dictionary with processing results
        """
        try:
            import pandas as pd

            # Read the Excel file using existing XML parser
            processor = ExcelProcessorService(None)

            # Handle different file types
            if hasattr(file, 'temporary_file_path'):
                # TemporaryUploadedFile
                from pathlib import Path
                df = processor._parse_xml_excel(file.temporary_file_path())
            else:
                # InMemoryUploadedFile - save temporarily
                import tempfile
                import os

                with tempfile.NamedTemporaryFile(delete=False, suffix='.xls') as temp_file:
                    for chunk in file.chunks():
                        temp_file.write(chunk)
                    temp_file.flush()

                    try:
                        df = processor._parse_xml_excel(temp_file.name)
                    finally:
                        os.unlink(temp_file.name)

            # Validate required columns
            required_columns = ['Chapter', 'First Name', 'Last Name']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return {
                    'success': False,
                    'error': f'Missing required columns: {", ".join(missing_columns)}',
                    'chapters_created': 0,
                    'chapters_updated': 0,
                    'members_created': 0,
                    'members_updated': 0,
                    'errors': [f'Missing columns: {missing_columns}'],
                    'warnings': []
                }

            # OPTIMIZATION: Use vectorized pandas operations (10x faster than iterrows)
            with transaction.atomic():
                # Step 1: Extract unique chapter names using vectorized operations
                df['Chapter'] = df['Chapter'].astype(str).str.strip()
                chapter_names = set(df['Chapter'].dropna().unique())
                chapter_names.discard('nan')  # Remove string 'nan' if present

                # Step 2: Bulk create/get chapters (single query)
                existing_chapters = {c.name: c for c in Chapter.objects.filter(name__in=chapter_names)}
                chapters_to_create = []
                for name in chapter_names:
                    if name not in existing_chapters:
                        chapters_to_create.append(Chapter(name=name, location='Dubai'))

                if chapters_to_create:
                    Chapter.objects.bulk_create(chapters_to_create, ignore_conflicts=True)
                    self.chapters_created = len(chapters_to_create)

                # Refresh chapter dict after creation
                all_chapters = {c.name: c for c in Chapter.objects.filter(name__in=chapter_names)}

                # Step 3: Prepare member data using vectorized operations
                # Clean and prepare all columns at once
                df['First Name'] = df['First Name'].astype(str).str.strip()
                df['Last Name'] = df['Last Name'].astype(str).str.strip()

                # Filter out invalid rows
                valid_mask = (
                    (df['Chapter'] != 'nan') &
                    (df['First Name'] != 'nan') &
                    (df['Last Name'] != 'nan') &
                    df['Chapter'].notna() &
                    df['First Name'].notna() &
                    df['Last Name'].notna()
                )
                valid_df = df[valid_mask].copy()

                # Create normalized names vectorized
                valid_df['normalized_name'] = (valid_df['First Name'] + ' ' + valid_df['Last Name']).apply(
                    lambda x: Member.normalize_name(x)
                )

                # Convert to list of dicts (much faster than iterrows)
                members_data = []
                for row_dict in valid_df.to_dict('records'):
                    chapter = all_chapters.get(row_dict['Chapter'])
                    if chapter:
                        members_data.append({
                            'chapter': chapter,
                            'first_name': row_dict['First Name'],
                            'last_name': row_dict['Last Name'],
                            'normalized_name': row_dict['normalized_name'],
                        })

                # Step 4: Bulk create/update members
                # Get all existing members for these chapters in one query
                chapter_ids = [md['chapter'].id for md in members_data]
                existing_members = {
                    (m.chapter_id, m.normalized_name): m
                    for m in Member.objects.filter(chapter_id__in=chapter_ids)
                }

                members_to_create = []
                members_to_update = []

                for member_data in members_data:
                    key = (member_data['chapter'].id, member_data['normalized_name'])

                    if key in existing_members:
                        # Update existing member
                        existing_member = existing_members[key]
                        existing_member.first_name = member_data['first_name']
                        existing_member.last_name = member_data['last_name']
                        members_to_update.append(existing_member)
                        self.members_updated += 1
                    else:
                        # Create new member
                        members_to_create.append(Member(
                            chapter=member_data['chapter'],
                            first_name=member_data['first_name'],
                            last_name=member_data['last_name'],
                            normalized_name=member_data['normalized_name'],
                            business_name='',
                            classification='',
                            is_active=True,
                        ))
                        self.members_created += 1

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

            return {
                'success': len(self.errors) == 0,
                'chapters_created': self.chapters_created,
                'chapters_updated': len(chapter_names) - self.chapters_created,
                'members_created': self.members_created,
                'members_updated': self.members_updated,
                'total_processed': len(df),
                'errors': self.errors,
                'warnings': self.warnings,
            }

        except Exception as e:
            logger.exception("Error processing region summary")
            return {
                'success': False,
                'error': f'Processing failed: {str(e)}',
                'chapters_created': 0,
                'chapters_updated': 0,
                'members_created': 0,
                'members_updated': 0,
                'errors': [str(e)],
                'warnings': []
            }

    def _process_row(self, row) -> None:
        """
        Process a single row from the region summary.

        DEPRECATED: This method is no longer used. The process_region_summary method
        now uses vectorized bulk operations with transaction.atomic() wrapping (line 86)
        for better performance and data integrity.
        """
        import pandas as pd

        # Extract chapter name
        chapter_name = str(row['Chapter']).strip() if pd.notna(row['Chapter']) else None
        if not chapter_name:
            self.warnings.append(f"Skipping row with missing chapter name")
            return

        # Use ChapterService for chapter creation
        try:
            chapter, created = ChapterService.get_or_create_chapter(
                name=chapter_name,
                location='Dubai',  # Default location
                meeting_day='',
                meeting_time=None,
            )

            if created:
                self.chapters_created += 1
            else:
                self.chapters_updated += 1

        except Exception as e:
            self.warnings.append(f"Error creating chapter {chapter_name}: {str(e)}")
            return

        # Extract member info
        first_name = str(row['First Name']).strip() if pd.notna(row['First Name']) else None
        last_name = str(row['Last Name']).strip() if pd.notna(row['Last Name']) else None

        if not first_name or not last_name:
            self.warnings.append(f"Skipping member with missing name in {chapter_name}")
            return

        # Use MemberService for member creation
        try:
            member, created = MemberService.get_or_create_member(
                chapter=chapter,
                first_name=first_name,
                last_name=last_name,
                business_name='',
                classification='',
                is_active=True,
            )

            if created:
                self.members_created += 1
            else:
                # Try to update if names differ
                member, updated = MemberService.update_member(
                    member.id,
                    first_name=first_name,
                    last_name=last_name,
                )
                if updated:
                    self.members_updated += 1
                else:
                    # Count as updated even if no changes (to track processing)
                    self.members_updated += 1

        except Exception as e:
            self.warnings.append(f"Error creating member {first_name} {last_name}: {str(e)}")
