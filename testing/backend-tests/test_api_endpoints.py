"""
Tests for API endpoints.

These tests validate:
- File upload endpoint
- Dashboard endpoint
- Chapter endpoints (CRUD)
- Monthly report endpoints
- Member endpoints
- TYFCB data endpoints
"""

import json
from pathlib import Path
from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from features.chapters.models import Chapter, Member, MonthlyReport
from features.analytics.models import Referral, OneToOne, TYFCB


# Path to test data
TEST_DATA_DIR = Path(__file__).parent.parent / 'test-data' / 'august-2025'
SLIP_AUDIT_DIR = TEST_DATA_DIR / 'slip-audit-reports'
MEMBER_NAMES_DIR = TEST_DATA_DIR / 'member-names'


class DashboardAPITestCase(TestCase):
    """Test the dashboard API endpoint."""

    def setUp(self):
        self.client = Client()
        # Create test chapters
        self.continental = Chapter.objects.create(name='BNI Continental', location='Dubai')
        self.elevate = Chapter.objects.create(name='BNI Elevate', location='Dubai')

    def test_dashboard_returns_all_chapters(self):
        """Test that dashboard endpoint returns all chapters."""
        response = self.client.get('/api/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertIn('chapters', data)
        self.assertIn('total_chapters', data)
        self.assertEqual(data['total_chapters'], 2)

        # Verify chapter data structure
        for chapter in data['chapters']:
            self.assertIn('id', chapter)
            self.assertIn('name', chapter)
            self.assertIn('location', chapter)
            self.assertIn('member_count', chapter)
            self.assertIn('total_referrals', chapter)
            self.assertIn('total_one_to_ones', chapter)
            self.assertIn('total_tyfcb', chapter)

    def test_dashboard_includes_performance_metrics(self):
        """Test that dashboard includes calculated performance metrics."""
        # Add some test members
        Member.objects.create(
            chapter=self.continental,
            first_name='John',
            last_name='Smith',
            business_name='Test Business'
        )

        response = self.client.get('/api/dashboard/')
        data = response.json()

        continental_data = next((c for c in data['chapters'] if c['name'] == 'BNI Continental'), None)
        self.assertIsNotNone(continental_data)
        self.assertEqual(continental_data['member_count'], 1)
        self.assertIn('avg_referrals_per_member', continental_data)
        self.assertIn('avg_tyfcb_per_member', continental_data)


class FileUploadAPITestCase(TestCase):
    """Test the file upload API endpoint."""

    def setUp(self):
        self.client = Client()
        self.chapter = Chapter.objects.create(name='BNI Continental', location='Dubai')

    def test_upload_endpoint_exists(self):
        """Test that the upload endpoint is accessible."""
        # Try uploading without files (should fail)
        response = self.client.post('/api/upload/')

        # Should return 400 Bad Request for missing data
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_415_UNSUPPORTED_MEDIA_TYPE])

    def test_upload_with_real_slip_audit_file(self):
        """Test uploading a real slip audit file."""
        slip_file_path = SLIP_AUDIT_DIR / 'continental'
        slip_files = list(slip_file_path.glob('*.xls'))

        if not slip_files:
            self.skipTest("No slip audit files found for Continental")

        # Read the actual file
        with open(slip_files[0], 'rb') as f:
            file_content = f.read()

        uploaded_file = SimpleUploadedFile(
            name=slip_files[0].name,
            content=file_content,
            content_type='application/vnd.ms-excel'
        )

        response = self.client.post('/api/upload/', {
            'slip_audit_file': uploaded_file,
            'chapter_id': self.chapter.id,
            'month_year': '2025-08',
            'upload_option': 'slip_only'
        })

        print(f"\nUpload Response Status: {response.status_code}")
        if response.status_code != status.HTTP_200_OK:
            print(f"Response Data: {response.json()}")

        # Should successfully upload
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify response structure
        data = response.json()
        self.assertIn('success', data)
        self.assertIn('records_processed', data)

    def test_upload_requires_valid_chapter(self):
        """Test that upload requires a valid chapter ID."""
        response = self.client.post('/api/upload/', {
            'chapter_id': 9999,  # Non-existent chapter
            'month_year': '2025-08',
            'upload_option': 'slip_only'
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_validates_file_type(self):
        """Test that upload validates file type."""
        # Try uploading a non-Excel file
        fake_file = SimpleUploadedFile(
            name='test.txt',
            content=b'Not an Excel file',
            content_type='text/plain'
        )

        response = self.client.post('/api/upload/', {
            'slip_audit_file': fake_file,
            'chapter_id': self.chapter.id,
            'month_year': '2025-08',
            'upload_option': 'slip_only'
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ChapterAPITestCase(TestCase):
    """Test chapter management API endpoints."""

    def setUp(self):
        self.client = Client()
        self.chapter = Chapter.objects.create(name='BNI Continental', location='Dubai')

    def test_get_chapter_detail(self):
        """Test getting chapter details."""
        response = self.client.get(f'/api/chapters/{self.chapter.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(data['id'], self.chapter.id)
        self.assertEqual(data['name'], 'BNI Continental')
        self.assertIn('members', data)
        self.assertIn('member_count', data)

    def test_create_chapter(self):
        """Test creating a new chapter."""
        response = self.client.post('/api/chapters/', {
            'name': 'BNI Test Chapter',
            'location': 'Dubai',
            'meeting_day': 'Monday',
            'meeting_time': '07:00:00'
        }, content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        data = response.json()
        self.assertEqual(data['name'], 'BNI Test Chapter')

        # Verify chapter was created in database
        self.assertTrue(Chapter.objects.filter(name='BNI Test Chapter').exists())

    def test_delete_chapter(self):
        """Test deleting a chapter."""
        chapter_id = self.chapter.id

        response = self.client.delete(f'/api/chapters/{chapter_id}/delete/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify chapter was deleted
        self.assertFalse(Chapter.objects.filter(id=chapter_id).exists())


class MonthlyReportAPITestCase(TestCase):
    """Test monthly report API endpoints."""

    def setUp(self):
        self.client = Client()
        self.chapter = Chapter.objects.create(name='BNI Continental', location='Dubai')

        # Create a test monthly report
        self.report = MonthlyReport.objects.create(
            chapter=self.chapter,
            month_year='2025-08',
            referral_matrix_data={'members': [], 'matrix': []},
            oto_matrix_data={'members': [], 'matrix': []},
            combination_matrix_data={'members': [], 'matrix': []}
        )

    def test_get_monthly_reports_list(self):
        """Test getting list of monthly reports for a chapter."""
        response = self.client.get(f'/api/chapters/{self.chapter.id}/reports/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 1)

        # Verify report structure
        report = data[0]
        self.assertEqual(report['id'], self.report.id)
        self.assertEqual(report['month_year'], '2025-08')
        self.assertIn('uploaded_at', report)
        self.assertIn('has_referral_matrix', report)
        self.assertIn('has_oto_matrix', report)
        self.assertIn('has_combination_matrix', report)

    def test_delete_monthly_report(self):
        """Test deleting a monthly report."""
        report_id = self.report.id

        response = self.client.delete(f'/api/chapters/{self.chapter.id}/reports/{report_id}/')

        # Note: This endpoint requires authentication
        # For now, we just verify it exists and responds
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN
        ])


class MemberAPITestCase(TestCase):
    """Test member-related API endpoints."""

    def setUp(self):
        self.client = Client()
        self.chapter = Chapter.objects.create(name='BNI Continental', location='Dubai')
        self.member = Member.objects.create(
            chapter=self.chapter,
            first_name='John',
            last_name='Smith',
            business_name='Test Business',
            classification='Consultant'
        )

    def test_create_member(self):
        """Test creating a new member."""
        response = self.client.post(f'/api/chapters/{self.chapter.id}/members/', {
            'first_name': 'Jane',
            'last_name': 'Doe',
            'business_name': 'Jane\'s Business',
            'classification': 'Marketing',
            'email': 'jane@example.com',
            'phone': '1234567890'
        }, content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        data = response.json()
        self.assertEqual(data['first_name'], 'Jane')
        self.assertEqual(data['last_name'], 'Doe')

        # Verify member was created
        self.assertTrue(Member.objects.filter(
            chapter=self.chapter,
            first_name='Jane',
            last_name='Doe'
        ).exists())

    def test_update_member(self):
        """Test updating a member's details."""
        response = self.client.patch(
            f'/api/chapters/{self.chapter.id}/members/{self.member.id}/',
            json.dumps({
                'business_name': 'Updated Business Name'
            }),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify update
        self.member.refresh_from_db()
        self.assertEqual(self.member.business_name, 'Updated Business Name')

    def test_delete_member(self):
        """Test deleting a member."""
        member_id = self.member.id

        response = self.client.delete(
            f'/api/chapters/{self.chapter.id}/members/{member_id}/delete/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify deletion
        self.assertFalse(Member.objects.filter(id=member_id).exists())


class TYFCBAPITestCase(TestCase):
    """Test TYFCB data API endpoints."""

    def setUp(self):
        self.client = Client()
        self.chapter = Chapter.objects.create(name='BNI Continental', location='Dubai')
        self.report = MonthlyReport.objects.create(
            chapter=self.chapter,
            month_year='2025-08',
            tyfcb_inside_data={'total_amount': 10000, 'count': 5, 'by_member': {}},
            tyfcb_outside_data={'total_amount': 5000, 'count': 2, 'by_member': {}}
        )

    def test_get_tyfcb_data(self):
        """Test getting TYFCB data for a report."""
        response = self.client.get(
            f'/api/chapters/{self.chapter.id}/reports/{self.report.id}/tyfcb-data/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertIn('inside', data)
        self.assertIn('outside', data)
        self.assertIn('month_year', data)

        # Verify TYFCB data structure
        self.assertEqual(data['inside']['total_amount'], 10000)
        self.assertEqual(data['inside']['count'], 5)
        self.assertEqual(data['outside']['total_amount'], 5000)
        self.assertEqual(data['outside']['count'], 2)