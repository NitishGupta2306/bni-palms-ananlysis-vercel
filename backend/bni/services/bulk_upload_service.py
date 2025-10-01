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

            # OPTIMIZATION: Process in batches using bulk operations
            with transaction.atomic():
                # Step 1: Extract unique chapter names from all rows
                chapter_names = set()
                for idx, row in df.iterrows():
                    chapter_name = str(row['Chapter']).strip() if pd.notna(row['Chapter']) else None
                    if chapter_name:
                        chapter_names.add(chapter_name)

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

                # Step 3: Prepare member data for bulk operations
                members_data = []
                for idx, row in df.iterrows():
                    try:
                        chapter_name = str(row['Chapter']).strip() if pd.notna(row['Chapter']) else None
                        first_name = str(row['First Name']).strip() if pd.notna(row['First Name']) else None
                        last_name = str(row['Last Name']).strip() if pd.notna(row['Last Name']) else None

                        if not chapter_name or not first_name or not last_name:
                            self.warnings.append(f"Row {idx + 1}: Missing required data")
                            continue

                        chapter = all_chapters.get(chapter_name)
                        if not chapter:
                            self.warnings.append(f"Row {idx + 1}: Chapter '{chapter_name}' not found")
                            continue

                        members_data.append({
                            'chapter': chapter,
                            'first_name': first_name,
                            'last_name': last_name,
                            'normalized_name': Member.normalize_name(first_name, last_name),
                        })
                    except Exception as e:
                        error_msg = f"Row {idx + 1}: {str(e)}"
                        logger.error(error_msg)
                        self.errors.append(error_msg)

                # Step 4: Bulk create members (using update_or_create for simplicity)
                for member_data in members_data:
                    try:
                        member, created = Member.objects.update_or_create(
                            chapter=member_data['chapter'],
                            normalized_name=member_data['normalized_name'],
                            defaults={
                                'first_name': member_data['first_name'],
                                'last_name': member_data['last_name'],
                                'business_name': '',
                                'classification': '',
                                'is_active': True,
                            }
                        )
                        if created:
                            self.members_created += 1
                        else:
                            self.members_updated += 1
                    except Exception as e:
                        self.warnings.append(f"Error with member {member_data['first_name']} {member_data['last_name']}: {str(e)}")

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
        """Process a single row from the region summary."""
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
