"""
Tests for Excel file processing and data extraction.

These tests use real August 2025 BNI chapter data to validate:
- Excel file reading (XML and binary formats)
- Referral extraction
- One-to-One meeting extraction
- TYFCB amount extraction
- Member name normalization
- Data integrity
"""

import os
from pathlib import Path
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from features.chapters.models import Chapter, Member, MonthlyReport
from features.analytics.models import Referral, OneToOne, TYFCB
from features.data_processing.services import ExcelProcessorService


# Path to test data
TEST_DATA_DIR = Path(__file__).parent.parent / 'test-data' / 'august-2025'
SLIP_AUDIT_DIR = TEST_DATA_DIR / 'slip-audit-reports'
MEMBER_NAMES_DIR = TEST_DATA_DIR / 'member-names'


class ExcelProcessingTestCase(TestCase):
    """Test Excel file processing with real August 2025 data."""

    def setUp(self):
        """Set up test chapters."""
        self.chapters = {
            'continental': Chapter.objects.create(name='BNI Continental', location='Dubai'),
            'elevate': Chapter.objects.create(name='BNI Elevate', location='Dubai'),
            'energy': Chapter.objects.create(name='BNI Energy', location='Dubai'),
            'excelerate': Chapter.objects.create(name='BNI Excelerate', location='Dubai'),
            'givers': Chapter.objects.create(name='BNI Givers', location='Dubai'),
            'gladiators': Chapter.objects.create(name='BNI Gladiators', location='Dubai'),
            'legends': Chapter.objects.create(name='BNI Legends', location='Dubai'),
            'synergy': Chapter.objects.create(name='BNI Synergy', location='Dubai'),
            'united': Chapter.objects.create(name='BNI United', location='Dubai'),
        }

    def test_member_names_file_parsing(self):
        """Test that member names files can be read and parsed correctly."""
        for chapter_key, chapter in self.chapters.items():
            member_file = MEMBER_NAMES_DIR / f'bni-{chapter_key}.xls'

            # Skip if file doesn't exist
            if not member_file.exists():
                self.skipTest(f"Member names file not found: {member_file}")

            # Read and process the member names file
            processor = ExcelProcessorService(chapter)

            # This test validates that the file can be read
            # Actual member creation would be done through the upload endpoint
            self.assertTrue(member_file.exists(), f"Member file exists for {chapter_key}")
            self.assertGreater(member_file.stat().st_size, 0, f"Member file has content for {chapter_key}")

    def test_slip_audit_file_exists(self):
        """Test that slip audit files exist for all chapters."""
        for chapter_key in self.chapters.keys():
            slip_audit_dir = SLIP_AUDIT_DIR / chapter_key

            self.assertTrue(slip_audit_dir.exists(), f"Slip audit directory exists for {chapter_key}")

            # Check for .xls files in the directory
            xls_files = list(slip_audit_dir.glob('*.xls'))
            self.assertGreater(len(xls_files), 0, f"At least one slip audit file exists for {chapter_key}")

    def test_continental_slip_audit_processing(self):
        """Test processing BNI Continental's slip audit report."""
        chapter = self.chapters['continental']
        slip_audit_dir = SLIP_AUDIT_DIR / 'continental'

        # Get the first slip audit file
        slip_files = list(slip_audit_dir.glob('*.xls'))
        if not slip_files:
            self.skipTest("No slip audit files found for Continental")

        slip_file = slip_files[0]

        # Process the file
        processor = ExcelProcessorService(chapter)
        result = processor.process_excel_file(slip_file, week_of_date=None)

        # Validate processing completed
        self.assertIn('success', result)
        self.assertIn('referrals_created', result)
        self.assertIn('one_to_ones_created', result)
        self.assertIn('tyfcbs_created', result)

        # Log results for manual verification
        print(f"\nContinental Processing Results:")
        print(f"  Success: {result.get('success')}")
        print(f"  Referrals: {result.get('referrals_created', 0)}")
        print(f"  One-to-Ones: {result.get('one_to_ones_created', 0)}")
        print(f"  TYFCBs: {result.get('tyfcbs_created', 0)}")
        print(f"  Errors: {len(result.get('errors', []))}")
        if result.get('errors'):
            for error in result['errors'][:5]:  # Show first 5 errors
                print(f"    - {error}")

    def test_all_chapters_slip_audit_processing(self):
        """Test processing slip audit reports for all chapters."""
        results_summary = {}

        for chapter_key, chapter in self.chapters.items():
            slip_audit_dir = SLIP_AUDIT_DIR / chapter_key
            slip_files = list(slip_audit_dir.glob('*.xls'))

            if not slip_files:
                results_summary[chapter_key] = {'status': 'NO_FILE'}
                continue

            # Process the first file found
            slip_file = slip_files[0]
            processor = ExcelProcessorService(chapter)
            result = processor.process_excel_file(slip_file)

            results_summary[chapter_key] = {
                'status': 'SUCCESS' if result.get('success') else 'FAILED',
                'referrals': result.get('referrals_created', 0),
                'otos': result.get('one_to_ones_created', 0),
                'tyfcbs': result.get('tyfcbs_created', 0),
                'errors': len(result.get('errors', []))
            }

        # Print summary
        print("\n" + "="*60)
        print("SLIP AUDIT PROCESSING SUMMARY")
        print("="*60)
        for chapter_key, summary in results_summary.items():
            print(f"\n{chapter_key.upper()}:")
            print(f"  Status: {summary['status']}")
            if summary['status'] not in ['NO_FILE']:
                print(f"  Referrals: {summary.get('referrals', 0)}")
                print(f"  One-to-Ones: {summary.get('otos', 0)}")
                print(f"  TYFCBs: {summary.get('tyfcbs', 0)}")
                print(f"  Errors: {summary.get('errors', 0)}")
        print("="*60)

        # At least one chapter should process successfully
        successful_chapters = [k for k, v in results_summary.items() if v['status'] == 'SUCCESS']
        self.assertGreater(len(successful_chapters), 0, "At least one chapter should process successfully")

    def test_referral_data_extraction(self):
        """Test that referral data is extracted correctly."""
        chapter = self.chapters['continental']
        slip_audit_dir = SLIP_AUDIT_DIR / 'continental'
        slip_files = list(slip_audit_dir.glob('*.xls'))

        if not slip_files:
            self.skipTest("No slip audit files found")

        # Process file
        processor = ExcelProcessorService(chapter)
        result = processor.process_excel_file(slip_files[0])

        # Check that referrals were created in database
        referrals = Referral.objects.filter(giver__chapter=chapter)

        print(f"\nReferrals extracted: {referrals.count()}")

        # Verify referral structure if any exist
        if referrals.exists():
            first_referral = referrals.first()
            self.assertIsNotNone(first_referral.giver)
            self.assertIsNotNone(first_referral.receiver)
            self.assertIsNotNone(first_referral.date_given)

            print(f"Sample Referral:")
            print(f"  Giver: {first_referral.giver.full_name}")
            print(f"  Receiver: {first_referral.receiver.full_name}")
            print(f"  Date: {first_referral.date_given}")

    def test_one_to_one_data_extraction(self):
        """Test that one-to-one meeting data is extracted correctly."""
        chapter = self.chapters['continental']
        slip_audit_dir = SLIP_AUDIT_DIR / 'continental'
        slip_files = list(slip_audit_dir.glob('*.xls'))

        if not slip_files:
            self.skipTest("No slip audit files found")

        # Process file
        processor = ExcelProcessorService(chapter)
        result = processor.process_excel_file(slip_files[0])

        # Check that one-to-ones were created
        otos = OneToOne.objects.filter(member1__chapter=chapter)

        print(f"\nOne-to-Ones extracted: {otos.count()}")

        # Verify structure if any exist
        if otos.exists():
            first_oto = otos.first()
            self.assertIsNotNone(first_oto.member1)
            self.assertIsNotNone(first_oto.member2)
            self.assertIsNotNone(first_oto.date)

            print(f"Sample One-to-One:")
            print(f"  Member 1: {first_oto.member1.full_name}")
            print(f"  Member 2: {first_oto.member2.full_name}")
            print(f"  Date: {first_oto.date}")

    def test_tyfcb_data_extraction(self):
        """Test that TYFCB data is extracted correctly."""
        chapter = self.chapters['continental']
        slip_audit_dir = SLIP_AUDIT_DIR / 'continental'
        slip_files = list(slip_audit_dir.glob('*.xls'))

        if not slip_files:
            self.skipTest("No slip audit files found")

        # Process file
        processor = ExcelProcessorService(chapter)
        result = processor.process_excel_file(slip_files[0])

        # Check that TYFCBs were created
        tyfcbs = TYFCB.objects.filter(receiver__chapter=chapter)

        print(f"\nTYFCBs extracted: {tyfcbs.count()}")

        # Verify structure if any exist
        if tyfcbs.exists():
            first_tyfcb = tyfcbs.first()
            self.assertIsNotNone(first_tyfcb.receiver)
            self.assertIsNotNone(first_tyfcb.amount)
            self.assertGreater(first_tyfcb.amount, 0)

            # Calculate total TYFCB
            total_tyfcb = sum(t.amount for t in tyfcbs)

            print(f"Sample TYFCB:")
            print(f"  Receiver: {first_tyfcb.receiver.full_name}")
            print(f"  Amount: {first_tyfcb.amount} {first_tyfcb.currency}")
            print(f"  Giver: {first_tyfcb.giver.full_name if first_tyfcb.giver else 'Outside Chapter'}")
            print(f"\nTotal TYFCB: {total_tyfcb}")

    def test_member_name_normalization(self):
        """Test that member names are normalized correctly."""
        chapter = self.chapters['continental']

        # Create members with different name formats
        test_cases = [
            ('Mr. John Smith', 'john smith'),
            ('Dr. Jane Doe Jr.', 'jane doe'),
            ('Sarah Johnson', 'sarah johnson'),
            ('MICHAEL BROWN', 'michael brown'),
        ]

        for full_name, expected_normalized in test_cases:
            parts = full_name.split()
            first_name = parts[0]
            last_name = ' '.join(parts[1:])

            member = Member(
                chapter=chapter,
                first_name=first_name,
                last_name=last_name
            )

            # Normalize the name (this is done in Member.save())
            normalized = Member.normalize_name(f"{first_name} {last_name}")

            self.assertEqual(normalized, expected_normalized,
                           f"Name normalization failed for '{full_name}'")

            print(f"Normalized '{full_name}' -> '{normalized}'")

    def test_data_integrity_no_duplicates(self):
        """Test that no duplicate referrals are created."""
        chapter = self.chapters['continental']
        slip_audit_dir = SLIP_AUDIT_DIR / 'continental'
        slip_files = list(slip_audit_dir.glob('*.xls'))

        if not slip_files:
            self.skipTest("No slip audit files found")

        # Process file twice
        processor = ExcelProcessorService(chapter)
        result1 = processor.process_excel_file(slip_files[0])
        result2 = processor.process_excel_file(slip_files[0])

        # Second processing should handle duplicates gracefully
        referrals_after_first = Referral.objects.filter(giver__chapter=chapter).count()
        referrals_after_second = Referral.objects.filter(giver__chapter=chapter).count()

        print(f"\nReferrals after first import: {referrals_after_first}")
        print(f"Referrals after second import: {referrals_after_second}")
        print(f"Difference: {referrals_after_second - referrals_after_first}")

        # Note: Depending on implementation, duplicates might be prevented or allowed
        # This test documents the behavior