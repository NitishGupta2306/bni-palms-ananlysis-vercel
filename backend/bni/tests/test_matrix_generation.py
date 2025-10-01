"""
Automated tests for matrix generation using real August 2025 data.

These tests verify that the matrix generation algorithms produce correct
outputs by comparing against known expected results from processed files.
"""
import json
import os
from pathlib import Path
from django.test import TestCase, TransactionTestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from chapters.models import Chapter
from members.models import Member
from reports.models import MonthlyReport
from analytics.models import Referral, OneToOne, TYFCB
from bni.services.excel_processor import ExcelProcessorService
from bni.services.matrix_generator import MatrixGenerator


class MatrixGenerationTestCase(TransactionTestCase):
    """Test matrix generation with real August 2025 Continental chapter data."""

    fixtures_dir = Path(__file__).parent / 'fixtures'

    @classmethod
    def setUpClass(cls):
        """Load expected matrices once for all tests."""
        super().setUpClass()

        # Load expected matrices
        expected_file = cls.fixtures_dir / 'expected_matrices_continental_aug2025.json'
        with open(expected_file, 'r') as f:
            cls.expected_data = json.load(f)

    def setUp(self):
        """Set up test data for each test."""
        # Create a fresh chapter for testing
        self.chapter = Chapter.objects.create(
            name='Test BNI Continental',
            location='Dubai',
            meeting_day='Monday',
            meeting_time='07:00:00'
        )

    def test_full_excel_processing_and_matrix_generation(self):
        """Test complete workflow: Excel processing → Matrix generation → Validation."""
        # Read the actual Excel files
        slip_audit_path = self.fixtures_dir / 'continental_slip_audit_aug2025.xls'
        member_names_path = self.fixtures_dir / 'continental_members_aug2025.xls'

        with open(slip_audit_path, 'rb') as f:
            slip_audit_file = SimpleUploadedFile(
                name='continental_slip_audit.xls',
                content=f.read(),
                content_type='application/vnd.ms-excel'
            )

        with open(member_names_path, 'rb') as f:
            member_names_file = SimpleUploadedFile(
                name='continental_members.xls',
                content=f.read(),
                content_type='application/vnd.ms-excel'
            )

        # Process using ExcelProcessorService
        processor = ExcelProcessorService(self.chapter)
        result = processor.process_monthly_report(
            slip_audit_file=slip_audit_file,
            member_names_file=member_names_file,
            month_year='2025-08'
        )

        # Verify processing was successful
        self.assertTrue(result['success'], f"Processing failed: {result.get('error', 'Unknown error')}")

        # Get the generated monthly report
        monthly_report = MonthlyReport.objects.get(
            chapter=self.chapter,
            month_year='2025-08'
        )

        # Verify the report was created
        self.assertIsNotNone(monthly_report)
        self.assertIsNotNone(monthly_report.processed_at)

        # Test member count
        generated_members = monthly_report.referral_matrix_data['members']
        expected_members = self.expected_data['members']

        self.assertEqual(
            len(generated_members),
            len(expected_members),
            f"Member count mismatch: got {len(generated_members)}, expected {len(expected_members)}"
        )

        # Sort both lists for comparison (order might differ)
        self.assertEqual(
            sorted(generated_members),
            sorted(expected_members),
            "Member lists don't match"
        )

    def test_referral_matrix_correctness(self):
        """Test that Referral Matrix matches expected output."""
        # Process the files first
        self._process_files()

        # Get the generated report
        monthly_report = MonthlyReport.objects.get(
            chapter=self.chapter,
            month_year='2025-08'
        )

        generated_matrix = monthly_report.referral_matrix_data['matrix']
        expected_matrix = self.expected_data['referral_matrix']['matrix']

        # Compare matrix dimensions
        self.assertEqual(
            len(generated_matrix),
            len(expected_matrix),
            f"Referral matrix row count mismatch"
        )

        # Compare matrix content
        for i, (gen_row, exp_row) in enumerate(zip(generated_matrix, expected_matrix)):
            self.assertEqual(
                gen_row,
                exp_row,
                f"Referral matrix row {i} mismatch"
            )

        # Count non-zero entries
        gen_nonzero = sum(1 for row in generated_matrix for val in row if val > 0)
        exp_nonzero = sum(1 for row in expected_matrix for val in row if val > 0)

        self.assertEqual(
            gen_nonzero,
            exp_nonzero,
            f"Referral matrix non-zero entry count mismatch: got {gen_nonzero}, expected {exp_nonzero}"
        )

    def test_one_to_one_matrix_correctness(self):
        """Test that One-to-One Matrix matches expected output."""
        # Process the files first
        self._process_files()

        # Get the generated report
        monthly_report = MonthlyReport.objects.get(
            chapter=self.chapter,
            month_year='2025-08'
        )

        generated_matrix = monthly_report.oto_matrix_data['matrix']
        expected_matrix = self.expected_data['one_to_one_matrix']['matrix']

        # Compare matrix dimensions
        self.assertEqual(
            len(generated_matrix),
            len(expected_matrix),
            f"One-to-One matrix row count mismatch"
        )

        # Compare matrix content
        for i, (gen_row, exp_row) in enumerate(zip(generated_matrix, expected_matrix)):
            self.assertEqual(
                gen_row,
                exp_row,
                f"One-to-One matrix row {i} mismatch"
            )

        # Count non-zero entries
        gen_nonzero = sum(1 for row in generated_matrix for val in row if val > 0)
        exp_nonzero = sum(1 for row in expected_matrix for val in row if val > 0)

        self.assertEqual(
            gen_nonzero,
            exp_nonzero,
            f"One-to-One matrix non-zero entry count mismatch: got {gen_nonzero}, expected {exp_nonzero}"
        )

        # Test symmetry (one-to-one meetings should be bidirectional)
        for i in range(len(generated_matrix)):
            for j in range(len(generated_matrix[i])):
                self.assertEqual(
                    generated_matrix[i][j],
                    generated_matrix[j][i],
                    f"One-to-One matrix not symmetric at ({i}, {j})"
                )

    def test_combination_matrix_correctness(self):
        """Test that Combination Matrix matches expected output."""
        # Process the files first
        self._process_files()

        # Get the generated report
        monthly_report = MonthlyReport.objects.get(
            chapter=self.chapter,
            month_year='2025-08'
        )

        generated_matrix = monthly_report.combination_matrix_data['matrix']
        expected_matrix = self.expected_data['combination_matrix']['matrix']

        # Compare matrix dimensions
        self.assertEqual(
            len(generated_matrix),
            len(expected_matrix),
            f"Combination matrix row count mismatch"
        )

        # Compare matrix content
        for i, (gen_row, exp_row) in enumerate(zip(generated_matrix, expected_matrix)):
            self.assertEqual(
                gen_row,
                exp_row,
                f"Combination matrix row {i} mismatch"
            )

        # Test value constraints (should only contain 0, 1, 2, 3)
        for i, row in enumerate(generated_matrix):
            for j, val in enumerate(row):
                self.assertIn(
                    val,
                    [0, 1, 2, 3],
                    f"Combination matrix has invalid value {val} at ({i}, {j})"
                )

        # Count each combination type
        gen_counts = {0: 0, 1: 0, 2: 0, 3: 0}
        exp_counts = {0: 0, 1: 0, 2: 0, 3: 0}

        for row in generated_matrix:
            for val in row:
                gen_counts[val] += 1

        for row in expected_matrix:
            for val in row:
                exp_counts[val] += 1

        self.assertEqual(
            gen_counts,
            exp_counts,
            f"Combination matrix value distribution mismatch"
        )

    def test_combination_matrix_logic(self):
        """Test the logic of combination matrix values."""
        # Process the files first
        self._process_files()

        # Get the generated report
        monthly_report = MonthlyReport.objects.get(
            chapter=self.chapter,
            month_year='2025-08'
        )

        ref_matrix = monthly_report.referral_matrix_data['matrix']
        oto_matrix = monthly_report.oto_matrix_data['matrix']
        combo_matrix = monthly_report.combination_matrix_data['matrix']

        # Verify combination logic for each cell
        for i in range(len(combo_matrix)):
            for j in range(len(combo_matrix[i])):
                if i == j:
                    # Diagonal should be 0 (no self-relationships)
                    continue

                has_referral = ref_matrix[i][j] > 0
                has_oto = oto_matrix[i][j] > 0
                combo_val = combo_matrix[i][j]

                # Verify the logic:
                # 0 = Neither, 1 = OTO only, 2 = Referral only, 3 = Both
                if has_referral and has_oto:
                    self.assertEqual(combo_val, 3, f"Should be 'Both' at ({i}, {j})")
                elif has_referral:
                    self.assertEqual(combo_val, 2, f"Should be 'Referral only' at ({i}, {j})")
                elif has_oto:
                    self.assertEqual(combo_val, 1, f"Should be 'OTO only' at ({i}, {j})")
                else:
                    self.assertEqual(combo_val, 0, f"Should be 'Neither' at ({i}, {j})")

    def test_matrix_generator_directly(self):
        """Test MatrixGenerator class directly with known data."""
        # Process the files to create data
        self._process_files()

        # Get members and interactions
        members = list(Member.objects.filter(chapter=self.chapter, is_active=True))
        referrals = list(Referral.objects.filter(giver__chapter=self.chapter))
        one_to_ones = list(OneToOne.objects.filter(member1__chapter=self.chapter))

        # Create generator
        generator = MatrixGenerator(members)

        # Generate matrices
        ref_df = generator.generate_referral_matrix(referrals)
        oto_df = generator.generate_one_to_one_matrix(one_to_ones)
        combo_df = generator.generate_combination_matrix(referrals, one_to_ones)

        # Verify dimensions
        self.assertEqual(ref_df.shape[0], len(members), "Referral matrix row count incorrect")
        self.assertEqual(ref_df.shape[1], len(members), "Referral matrix column count incorrect")

        self.assertEqual(oto_df.shape[0], len(members), "One-to-One matrix row count incorrect")
        self.assertEqual(oto_df.shape[1], len(members), "One-to-One matrix column count incorrect")

        self.assertEqual(combo_df.shape[0], len(members), "Combination matrix row count incorrect")
        self.assertEqual(combo_df.shape[1], len(members), "Combination matrix column count incorrect")

        # Verify member names match
        expected_names = sorted([m.full_name for m in members])
        self.assertEqual(sorted(ref_df.index.tolist()), expected_names)
        self.assertEqual(sorted(ref_df.columns.tolist()), expected_names)

    def test_data_statistics(self):
        """Test that processing produces expected data counts."""
        # Process the files
        result = self._process_files()

        # Verify counts are reasonable (should have data)
        self.assertGreater(
            result['referrals_created'],
            0,
            "Should have created referrals"
        )

        self.assertGreater(
            result['one_to_ones_created'],
            0,
            "Should have created one-to-ones"
        )

        self.assertGreater(
            result['tyfcbs_created'],
            0,
            "Should have created TYFCBs"
        )

        # Verify member count
        member_count = Member.objects.filter(chapter=self.chapter, is_active=True).count()
        self.assertEqual(
            member_count,
            self.expected_data['member_count'],
            f"Member count mismatch: got {member_count}, expected {self.expected_data['member_count']}"
        )

    # Helper methods

    def _process_files(self):
        """Helper to process Excel files and return result."""
        slip_audit_path = self.fixtures_dir / 'continental_slip_audit_aug2025.xls'
        member_names_path = self.fixtures_dir / 'continental_members_aug2025.xls'

        with open(slip_audit_path, 'rb') as f:
            slip_audit_file = SimpleUploadedFile(
                name='continental_slip_audit.xls',
                content=f.read(),
                content_type='application/vnd.ms-excel'
            )

        with open(member_names_path, 'rb') as f:
            member_names_file = SimpleUploadedFile(
                name='continental_members.xls',
                content=f.read(),
                content_type='application/vnd.ms-excel'
            )

        processor = ExcelProcessorService(self.chapter)
        result = processor.process_monthly_report(
            slip_audit_file=slip_audit_file,
            member_names_file=member_names_file,
            month_year='2025-08'
        )

        if not result['success']:
            self.fail(f"File processing failed: {result.get('error')}")

        return result


class MatrixAPITestCase(TestCase):
    """Test matrix API endpoints."""

    fixtures_dir = Path(__file__).parent / 'fixtures'

    def setUp(self):
        """Set up test data."""
        # Create chapter
        self.chapter = Chapter.objects.create(
            name='Test Continental API',
            location='Dubai'
        )

        # Create a monthly report with matrices
        self.monthly_report = MonthlyReport.objects.create(
            chapter=self.chapter,
            month_year='2025-08',
            referral_matrix_data={
                'members': ['Alice', 'Bob', 'Charlie'],
                'matrix': [[0, 2, 1], [1, 0, 3], [0, 1, 0]]
            },
            oto_matrix_data={
                'members': ['Alice', 'Bob', 'Charlie'],
                'matrix': [[0, 1, 1], [1, 0, 1], [1, 1, 0]]
            },
            combination_matrix_data={
                'members': ['Alice', 'Bob', 'Charlie'],
                'matrix': [[0, 3, 3], [3, 0, 3], [1, 3, 0]],
                'legend': {'0': 'Neither', '1': 'OTO only', '2': 'Referral only', '3': 'Both'}
            }
        )

    def test_get_referral_matrix_api(self):
        """Test GET /api/chapters/{id}/reports/{report_id}/referral-matrix/"""
        from django.urls import reverse

        url = f'/api/chapters/{self.chapter.id}/reports/{self.monthly_report.id}/referral-matrix/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn('members', data)
        self.assertIn('matrix', data)
        self.assertIn('totals', data)

        self.assertEqual(data['members'], ['Alice', 'Bob', 'Charlie'])

    def test_get_one_to_one_matrix_api(self):
        """Test GET /api/chapters/{id}/reports/{report_id}/one-to-one-matrix/"""
        url = f'/api/chapters/{self.chapter.id}/reports/{self.monthly_report.id}/one-to-one-matrix/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn('members', data)
        self.assertIn('matrix', data)
        self.assertIn('totals', data)

    def test_get_combination_matrix_api(self):
        """Test GET /api/chapters/{id}/reports/{report_id}/combination-matrix/"""
        url = f'/api/chapters/{self.chapter.id}/reports/{self.monthly_report.id}/combination-matrix/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn('members', data)
        self.assertIn('matrix', data)
        self.assertIn('summaries', data)
        self.assertIn('legend', data)
