"""
Tests for matrix comparison service.

Tests the ComparisonService that compares matrices between two monthly reports
to track member performance improvements and declines.
"""
from django.test import TestCase, TransactionTestCase
from pathlib import Path
from django.core.files.uploadedfile import SimpleUploadedFile
from chapters.models import Chapter
from reports.models import MonthlyReport
from bni.services.excel_processor import ExcelProcessorService
from bni.services.comparison_service import ComparisonService


class ComparisonServiceTestCase(TransactionTestCase):
    """Test comparison service with real August 2025 data."""

    fixtures_dir = Path(__file__).parent / 'fixtures'

    def setUp(self):
        """Set up test data for each test."""
        # Create chapter
        self.chapter = Chapter.objects.create(
            name='Test BNI Continental Comparison',
            location='Dubai',
            meeting_day='Monday',
            meeting_time='07:00:00'
        )

    def _process_monthly_report(self, month_year):
        """Helper to process and create a monthly report."""
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
            month_year=month_year
        )

        if not result['success']:
            self.fail(f"File processing failed: {result.get('error')}")

        return MonthlyReport.objects.get(
            chapter=self.chapter,
            month_year=month_year
        )

    def test_compare_same_reports(self):
        """Test comparing a report with itself (should show no changes)."""
        # Create one report
        report = self._process_monthly_report('2025-08')

        # Compare with itself
        comparison = ComparisonService.compare_monthly_reports(report, report)

        # Verify structure
        self.assertIn('referral_comparison', comparison)
        self.assertIn('oto_comparison', comparison)
        self.assertIn('combination_comparison', comparison)
        self.assertIn('overall_insights', comparison)

        # All changes should be zero
        ref_summary = comparison['referral_comparison']['summary']
        self.assertEqual(ref_summary['improved'], 0)
        self.assertEqual(ref_summary['declined'], 0)
        self.assertEqual(ref_summary['average_change'], 0.0)

        oto_summary = comparison['oto_comparison']['summary']
        self.assertEqual(oto_summary['improved'], 0)
        self.assertEqual(oto_summary['declined'], 0)
        self.assertEqual(oto_summary['average_change'], 0.0)

    def test_compare_different_chapters_raises_error(self):
        """Test that comparing reports from different chapters raises ValueError."""
        # Create two different chapters
        chapter1 = self.chapter
        chapter2 = Chapter.objects.create(
            name='Different Chapter',
            location='Abu Dhabi'
        )

        # Create reports for each
        report1 = self._process_monthly_report('2025-08')

        # Switch chapter for second report
        self.chapter = chapter2
        report2 = self._process_monthly_report('2025-09')

        # Should raise ValueError
        with self.assertRaises(ValueError) as context:
            ComparisonService.compare_monthly_reports(report1, report2)

        self.assertIn('different chapters', str(context.exception))

    def test_referral_matrix_comparison_structure(self):
        """Test the structure of referral matrix comparison."""
        # Create two reports (same data for simplicity)
        report1 = self._process_monthly_report('2025-07')
        report2 = self._process_monthly_report('2025-08')

        # Compare referral matrices
        comparison = ComparisonService.compare_referral_matrices(
            report2.referral_matrix_data,
            report1.referral_matrix_data
        )

        # Verify structure
        self.assertIn('members', comparison)
        self.assertIn('current_matrix', comparison)
        self.assertIn('previous_matrix', comparison)
        self.assertIn('member_changes', comparison)
        self.assertIn('summary', comparison)

        # Verify summary structure
        summary = comparison['summary']
        self.assertIn('total_members', summary)
        self.assertIn('improved', summary)
        self.assertIn('declined', summary)
        self.assertIn('no_change', summary)
        self.assertIn('new_members', summary)
        self.assertIn('top_improvements', summary)
        self.assertIn('top_declines', summary)
        self.assertIn('average_change', summary)
        self.assertIn('improvement_rate', summary)

        # Verify member_changes structure
        if comparison['members']:
            first_member = comparison['members'][0]
            member_change = comparison['member_changes'][first_member]

            self.assertIn('current_total', member_change)
            self.assertIn('previous_total', member_change)
            self.assertIn('change', member_change)
            self.assertIn('current_unique', member_change)
            self.assertIn('previous_unique', member_change)
            self.assertIn('unique_change', member_change)
            self.assertIn('direction', member_change)
            self.assertIn('status', member_change)
            self.assertIn('is_new_member', member_change)

            # Verify direction is a valid arrow
            self.assertIn(member_change['direction'], ['↗️', '↘️', '➡️'])

            # Verify status is valid
            self.assertIn(member_change['status'], ['improved', 'declined', 'no_change'])

    def test_oto_matrix_comparison_structure(self):
        """Test the structure of one-to-one matrix comparison."""
        report1 = self._process_monthly_report('2025-07')
        report2 = self._process_monthly_report('2025-08')

        comparison = ComparisonService.compare_oto_matrices(
            report2.oto_matrix_data,
            report1.oto_matrix_data
        )

        # Verify structure (same as referral)
        self.assertIn('members', comparison)
        self.assertIn('member_changes', comparison)
        self.assertIn('summary', comparison)

    def test_combination_matrix_comparison_structure(self):
        """Test the structure of combination matrix comparison."""
        report1 = self._process_monthly_report('2025-07')
        report2 = self._process_monthly_report('2025-08')

        comparison = ComparisonService.compare_combination_matrices(
            report2.combination_matrix_data,
            report1.combination_matrix_data
        )

        # Verify structure
        self.assertIn('members', comparison)
        self.assertIn('member_changes', comparison)
        self.assertIn('summary', comparison)

        # Verify member_changes structure for combination
        if comparison['members']:
            first_member = comparison['members'][0]
            member_change = comparison['member_changes'][first_member]

            self.assertIn('current_counts', member_change)
            self.assertIn('previous_counts', member_change)
            self.assertIn('changes', member_change)
            self.assertIn('improvement_score', member_change)
            self.assertIn('direction', member_change)
            self.assertIn('status', member_change)

            # Verify counts have all categories
            for counts in [member_change['current_counts'], member_change['previous_counts']]:
                self.assertIn('neither', counts)
                self.assertIn('oto_only', counts)
                self.assertIn('referral_only', counts)
                self.assertIn('both', counts)

    def test_overall_insights_structure(self):
        """Test the structure of overall insights."""
        report1 = self._process_monthly_report('2025-07')
        report2 = self._process_monthly_report('2025-08')

        comparison = ComparisonService.compare_monthly_reports(report2, report1)
        insights = comparison['overall_insights']

        # Verify insights structure
        self.assertIn('referrals', insights)
        self.assertIn('one_to_ones', insights)
        self.assertIn('overall', insights)

        # Verify referrals insights
        ref_insights = insights['referrals']
        self.assertIn('improved', ref_insights)
        self.assertIn('declined', ref_insights)
        self.assertIn('average_change', ref_insights)
        self.assertIn('improvement_rate', ref_insights)
        self.assertIn('top_improvers', ref_insights)

        # Verify one_to_ones insights
        oto_insights = insights['one_to_ones']
        self.assertIn('improved', oto_insights)
        self.assertIn('declined', oto_insights)
        self.assertIn('average_change', oto_insights)
        self.assertIn('improvement_rate', oto_insights)
        self.assertIn('top_improvers', oto_insights)

        # Verify overall insights
        overall = insights['overall']
        self.assertIn('total_members', overall)
        self.assertIn('new_members', overall)
        self.assertIn('combination_improvement_rate', overall)
        self.assertIn('most_improved_metric', overall)
        self.assertIn(overall['most_improved_metric'], ['referrals', 'one_to_ones', 'equal'])

    def test_summary_calculations(self):
        """Test that summary calculations are correct."""
        report1 = self._process_monthly_report('2025-07')
        report2 = self._process_monthly_report('2025-08')

        comparison = ComparisonService.compare_referral_matrices(
            report2.referral_matrix_data,
            report1.referral_matrix_data
        )

        summary = comparison['summary']
        member_changes = comparison['member_changes']

        # Verify counts
        total = summary['total_members']
        improved = summary['improved']
        declined = summary['declined']
        no_change = summary['no_change']

        # Total should equal sum of categories
        self.assertEqual(total, improved + declined + no_change)

        # Verify counts match member_changes
        actual_improved = sum(1 for data in member_changes.values() if data['status'] == 'improved')
        actual_declined = sum(1 for data in member_changes.values() if data['status'] == 'declined')
        actual_no_change = sum(1 for data in member_changes.values() if data['status'] == 'no_change')

        self.assertEqual(improved, actual_improved)
        self.assertEqual(declined, actual_declined)
        self.assertEqual(no_change, actual_no_change)

        # Improvement rate should be percentage
        self.assertGreaterEqual(summary['improvement_rate'], 0)
        self.assertLessEqual(summary['improvement_rate'], 100)

    def test_top_improvements_and_declines(self):
        """Test that top improvements and declines are sorted correctly."""
        report1 = self._process_monthly_report('2025-07')
        report2 = self._process_monthly_report('2025-08')

        comparison = ComparisonService.compare_referral_matrices(
            report2.referral_matrix_data,
            report1.referral_matrix_data
        )

        summary = comparison['summary']

        # Top improvements should be sorted descending by change
        top_improvements = summary['top_improvements']
        for i in range(len(top_improvements) - 1):
            self.assertGreaterEqual(
                top_improvements[i]['change'],
                top_improvements[i + 1]['change']
            )
            # All should be positive
            self.assertGreater(top_improvements[i]['change'], 0)

        # Top declines should be sorted ascending by change (most negative first)
        top_declines = summary['top_declines']
        for i in range(len(top_declines) - 1):
            self.assertLessEqual(
                top_declines[i]['change'],
                top_declines[i + 1]['change']
            )
            # All should be negative
            self.assertLess(top_declines[i]['change'], 0)

    def test_missing_matrix_data(self):
        """Test handling of missing or empty matrix data."""
        # Test with None data
        result = ComparisonService.compare_referral_matrices(None, None)
        self.assertIn('error', result)

        # Test with empty dict
        result = ComparisonService.compare_referral_matrices({}, {})
        self.assertIn('error', result)

        # Test with missing keys
        result = ComparisonService.compare_referral_matrices(
            {'members': []},
            {'members': []}
        )
        # Should not error, just return empty results
        self.assertEqual(len(result['member_changes']), 0)

    def test_new_member_handling(self):
        """Test that new members are properly identified in comparison."""
        # For this test, we'd need to manually create reports with different members
        # This is a simplified version
        report1 = self._process_monthly_report('2025-07')
        report2 = self._process_monthly_report('2025-08')

        comparison = ComparisonService.compare_referral_matrices(
            report2.referral_matrix_data,
            report1.referral_matrix_data
        )

        # Since we're using the same data, there should be no new members
        new_member_count = sum(
            1 for data in comparison['member_changes'].values()
            if data.get('is_new_member', False)
        )
        self.assertEqual(new_member_count, 0)

    def test_comparison_response_format(self):
        """Test the complete response format from compare_monthly_reports."""
        report1 = self._process_monthly_report('2025-07')
        report2 = self._process_monthly_report('2025-08')

        comparison = ComparisonService.compare_monthly_reports(report2, report1)

        # Verify top-level keys
        expected_keys = [
            'current_report',
            'previous_report',
            'referral_comparison',
            'oto_comparison',
            'combination_comparison',
            'overall_insights'
        ]
        for key in expected_keys:
            self.assertIn(key, comparison)

        # Verify report metadata
        self.assertEqual(comparison['current_report']['id'], report2.id)
        self.assertEqual(comparison['current_report']['month_year'], '2025-08')
        self.assertEqual(comparison['previous_report']['id'], report1.id)
        self.assertEqual(comparison['previous_report']['month_year'], '2025-07')

        # Verify each comparison has required structure
        for comparison_type in ['referral_comparison', 'oto_comparison', 'combination_comparison']:
            comp_data = comparison[comparison_type]
            self.assertIn('members', comp_data)
            self.assertIn('member_changes', comp_data)
            self.assertIn('summary', comp_data)


class ComparisonAPITestCase(TestCase):
    """Test comparison API endpoints."""

    def setUp(self):
        """Set up test data."""
        # Create chapter
        self.chapter = Chapter.objects.create(
            name='Test Chapter API',
            location='Dubai'
        )

        # Create two monthly reports with sample matrix data
        self.report1 = MonthlyReport.objects.create(
            chapter=self.chapter,
            month_year='2025-07',
            referral_matrix_data={
                'members': ['Alice', 'Bob', 'Charlie'],
                'matrix': [[0, 1, 0], [2, 0, 1], [0, 0, 0]]
            },
            oto_matrix_data={
                'members': ['Alice', 'Bob', 'Charlie'],
                'matrix': [[0, 1, 0], [1, 0, 1], [0, 1, 0]]
            },
            combination_matrix_data={
                'members': ['Alice', 'Bob', 'Charlie'],
                'matrix': [[0, 3, 1], [3, 0, 3], [1, 3, 0]]
            }
        )

        self.report2 = MonthlyReport.objects.create(
            chapter=self.chapter,
            month_year='2025-08',
            referral_matrix_data={
                'members': ['Alice', 'Bob', 'Charlie'],
                'matrix': [[0, 2, 1], [3, 0, 2], [1, 1, 0]]
            },
            oto_matrix_data={
                'members': ['Alice', 'Bob', 'Charlie'],
                'matrix': [[0, 2, 1], [2, 0, 2], [1, 2, 0]]
            },
            combination_matrix_data={
                'members': ['Alice', 'Bob', 'Charlie'],
                'matrix': [[0, 3, 3], [3, 0, 3], [3, 3, 0]]
            }
        )

    def test_compare_referral_matrices_api(self):
        """Test GET /api/chapters/{id}/reports/{report_id}/compare/{prev_id}/referrals/"""
        url = f'/api/chapters/{self.chapter.id}/reports/{self.report2.id}/compare/{self.report1.id}/referrals/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn('current_report', data)
        self.assertIn('previous_report', data)
        self.assertIn('comparison', data)

        # Verify comparison data
        comparison = data['comparison']
        self.assertIn('member_changes', comparison)
        self.assertIn('summary', comparison)

    def test_compare_oto_matrices_api(self):
        """Test GET /api/chapters/{id}/reports/{report_id}/compare/{prev_id}/one-to-ones/"""
        url = f'/api/chapters/{self.chapter.id}/reports/{self.report2.id}/compare/{self.report1.id}/one-to-ones/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn('comparison', data)

    def test_compare_combination_matrices_api(self):
        """Test GET /api/chapters/{id}/reports/{report_id}/compare/{prev_id}/combination/"""
        url = f'/api/chapters/{self.chapter.id}/reports/{self.report2.id}/compare/{self.report1.id}/combination/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn('comparison', data)

    def test_compare_reports_api(self):
        """Test GET /api/chapters/{id}/reports/{report_id}/compare/{prev_id}/"""
        url = f'/api/chapters/{self.chapter.id}/reports/{self.report2.id}/compare/{self.report1.id}/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json()

        # Verify comprehensive comparison data
        self.assertIn('referral_comparison', data)
        self.assertIn('oto_comparison', data)
        self.assertIn('combination_comparison', data)
        self.assertIn('overall_insights', data)

    def test_compare_nonexistent_reports(self):
        """Test comparing with non-existent report IDs."""
        url = f'/api/chapters/{self.chapter.id}/reports/{self.report2.id}/compare/99999/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, 404)
        data = response.json()
        self.assertIn('error', data)

    def test_compare_reports_different_chapters(self):
        """Test that comparing reports from different chapters fails."""
        # Create another chapter with a report
        other_chapter = Chapter.objects.create(
            name='Other Chapter',
            location='Abu Dhabi'
        )
        other_report = MonthlyReport.objects.create(
            chapter=other_chapter,
            month_year='2025-08',
            referral_matrix_data={'members': [], 'matrix': []},
            oto_matrix_data={'members': [], 'matrix': []},
            combination_matrix_data={'members': [], 'matrix': []}
        )

        # Try to compare with report from different chapter
        url = f'/api/chapters/{self.chapter.id}/reports/{self.report2.id}/compare/{other_report.id}/'
        response = self.client.get(url)

        # Should return 404 since other_report doesn't belong to this chapter
        self.assertEqual(response.status_code, 404)
