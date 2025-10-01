"""
Tests for Django models.

These tests validate:
- Chapter model creation and relationships
- Member model name normalization and uniqueness
- MonthlyReport JSON field storage
- MemberMonthlyStats calculations
- Referral, OneToOne, TYFCB model validation
"""

from decimal import Decimal
from datetime import date, datetime
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from features.chapters.models import Chapter, Member, MonthlyReport, MemberMonthlyStats
from features.analytics.models import Referral, OneToOne, TYFCB


class ChapterModelTestCase(TestCase):
    """Test the Chapter model."""

    def test_create_chapter(self):
        """Test creating a basic chapter."""
        chapter = Chapter.objects.create(
            name='BNI Test Chapter',
            location='Dubai',
            meeting_day='Monday',
            meeting_time='07:00:00'
        )

        self.assertEqual(chapter.name, 'BNI Test Chapter')
        self.assertEqual(chapter.location, 'Dubai')
        self.assertEqual(str(chapter), 'BNI Test Chapter')

    def test_chapter_name_unique(self):
        """Test that chapter names must be unique."""
        Chapter.objects.create(name='BNI Continental')

        with self.assertRaises(IntegrityError):
            Chapter.objects.create(name='BNI Continental')

    def test_chapter_member_relationship(self):
        """Test the reverse relationship to members."""
        chapter = Chapter.objects.create(name='BNI Test Chapter')

        Member.objects.create(
            chapter=chapter,
            first_name='John',
            last_name='Smith'
        )
        Member.objects.create(
            chapter=chapter,
            first_name='Jane',
            last_name='Doe'
        )

        self.assertEqual(chapter.members.count(), 2)


class MemberModelTestCase(TestCase):
    """Test the Member model."""

    def setUp(self):
        self.chapter = Chapter.objects.create(name='BNI Test Chapter')

    def test_create_member(self):
        """Test creating a basic member."""
        member = Member.objects.create(
            chapter=self.chapter,
            first_name='John',
            last_name='Smith',
            business_name='Smith Consulting',
            classification='Consultant',
            email='john@example.com',
            phone='1234567890'
        )

        self.assertEqual(member.first_name, 'John')
        self.assertEqual(member.last_name, 'Smith')
        self.assertEqual(member.full_name, 'John Smith')
        self.assertTrue(member.is_active)

    def test_member_name_normalization(self):
        """Test that member names are normalized correctly."""
        test_cases = [
            (('Mr.', 'John', 'Smith'), 'john smith'),
            (('Dr.', 'Jane', 'Doe', 'Jr.'), 'jane doe'),
            (('', 'Sarah', 'Johnson'), 'sarah johnson'),
            (('', 'MICHAEL', 'BROWN'), 'michael brown'),
        ]

        for name_parts, expected_normalized in test_cases:
            # Build the full name
            full_name = ' '.join(filter(None, name_parts))
            normalized = Member.normalize_name(full_name)

            self.assertEqual(
                normalized,
                expected_normalized,
                f"Name normalization failed for '{full_name}'"
            )

    def test_member_normalized_name_set_on_save(self):
        """Test that normalized_name is automatically set on save."""
        member = Member.objects.create(
            chapter=self.chapter,
            first_name='Mr. John',
            last_name='Smith Jr.'
        )

        self.assertEqual(member.normalized_name, 'mr john smith jr')

    def test_member_unique_per_chapter(self):
        """Test that members with same normalized name in same chapter are rejected."""
        Member.objects.create(
            chapter=self.chapter,
            first_name='John',
            last_name='Smith'
        )

        # Try to create duplicate (same normalized name)
        with self.assertRaises(IntegrityError):
            Member.objects.create(
                chapter=self.chapter,
                first_name='John',
                last_name='Smith'
            )

    def test_member_same_name_different_chapters_allowed(self):
        """Test that same name is allowed in different chapters."""
        chapter2 = Chapter.objects.create(name='BNI Another Chapter')

        member1 = Member.objects.create(
            chapter=self.chapter,
            first_name='John',
            last_name='Smith'
        )

        # Should succeed - different chapter
        member2 = Member.objects.create(
            chapter=chapter2,
            first_name='John',
            last_name='Smith'
        )

        self.assertNotEqual(member1.id, member2.id)
        self.assertEqual(member1.normalized_name, member2.normalized_name)


class MonthlyReportModelTestCase(TestCase):
    """Test the MonthlyReport model."""

    def setUp(self):
        self.chapter = Chapter.objects.create(name='BNI Test Chapter')

    def test_create_monthly_report(self):
        """Test creating a monthly report."""
        report = MonthlyReport.objects.create(
            chapter=self.chapter,
            month_year='2025-08'
        )

        self.assertEqual(report.chapter, self.chapter)
        self.assertEqual(report.month_year, '2025-08')
        self.assertIsNotNone(report.uploaded_at)

    def test_monthly_report_json_fields(self):
        """Test JSON field storage."""
        matrix_data = {
            'members': ['John Smith', 'Jane Doe'],
            'matrix': [[0, 5], [3, 0]]
        }

        report = MonthlyReport.objects.create(
            chapter=self.chapter,
            month_year='2025-08',
            referral_matrix_data=matrix_data,
            oto_matrix_data=matrix_data,
            combination_matrix_data=matrix_data
        )

        # Refresh from database
        report.refresh_from_db()

        self.assertEqual(report.referral_matrix_data, matrix_data)
        self.assertEqual(report.oto_matrix_data['members'], ['John Smith', 'Jane Doe'])

    def test_monthly_report_unique_per_chapter_month(self):
        """Test that only one report per chapter per month is allowed."""
        MonthlyReport.objects.create(
            chapter=self.chapter,
            month_year='2025-08'
        )

        # Try to create duplicate
        with self.assertRaises(IntegrityError):
            MonthlyReport.objects.create(
                chapter=self.chapter,
                month_year='2025-08'
            )

    def test_monthly_report_tyfcb_json_fields(self):
        """Test TYFCB JSON field storage."""
        tyfcb_data = {
            'total_amount': 10000,
            'count': 5,
            'by_member': {
                'John Smith': 5000,
                'Jane Doe': 5000
            }
        }

        report = MonthlyReport.objects.create(
            chapter=self.chapter,
            month_year='2025-08',
            tyfcb_inside_data=tyfcb_data,
            tyfcb_outside_data=tyfcb_data
        )

        report.refresh_from_db()

        self.assertEqual(report.tyfcb_inside_data['total_amount'], 10000)
        self.assertEqual(report.tyfcb_outside_data['count'], 5)


class ReferralModelTestCase(TestCase):
    """Test the Referral model."""

    def setUp(self):
        self.chapter = Chapter.objects.create(name='BNI Test Chapter')
        self.giver = Member.objects.create(
            chapter=self.chapter,
            first_name='John',
            last_name='Smith'
        )
        self.receiver = Member.objects.create(
            chapter=self.chapter,
            first_name='Jane',
            last_name='Doe'
        )

    def test_create_referral(self):
        """Test creating a referral."""
        referral = Referral.objects.create(
            giver=self.giver,
            receiver=self.receiver,
            date_given=date(2025, 8, 1),
            detail='Test referral'
        )

        self.assertEqual(referral.giver, self.giver)
        self.assertEqual(referral.receiver, self.receiver)
        self.assertEqual(str(referral), f'{self.giver.full_name} -> {self.receiver.full_name}')

    def test_referral_unique_constraint(self):
        """Test that the same referral on the same day is prevented."""
        Referral.objects.create(
            giver=self.giver,
            receiver=self.receiver,
            date_given=date(2025, 8, 1)
        )

        # Try to create duplicate
        with self.assertRaises(IntegrityError):
            Referral.objects.create(
                giver=self.giver,
                receiver=self.receiver,
                date_given=date(2025, 8, 1)
            )

    def test_referral_different_date_allowed(self):
        """Test that same giver/receiver on different dates is allowed."""
        Referral.objects.create(
            giver=self.giver,
            receiver=self.receiver,
            date_given=date(2025, 8, 1)
        )

        # Different date - should succeed
        referral2 = Referral.objects.create(
            giver=self.giver,
            receiver=self.receiver,
            date_given=date(2025, 8, 2)
        )

        self.assertIsNotNone(referral2.id)

    def test_referral_cannot_self_reference(self):
        """Test that a member cannot give referral to themselves."""
        referral = Referral(
            giver=self.giver,
            receiver=self.giver,
            date_given=date(2025, 8, 1)
        )

        with self.assertRaises(ValidationError):
            referral.clean()


class OneToOneModelTestCase(TestCase):
    """Test the OneToOne model."""

    def setUp(self):
        self.chapter = Chapter.objects.create(name='BNI Test Chapter')
        self.member1 = Member.objects.create(
            chapter=self.chapter,
            first_name='John',
            last_name='Smith'
        )
        self.member2 = Member.objects.create(
            chapter=self.chapter,
            first_name='Jane',
            last_name='Doe'
        )

    def test_create_one_to_one(self):
        """Test creating a one-to-one meeting."""
        oto = OneToOne.objects.create(
            member1=self.member1,
            member2=self.member2,
            date=date(2025, 8, 1),
            duration_minutes=60
        )

        self.assertEqual(oto.member1, self.member1)
        self.assertEqual(oto.member2, self.member2)
        self.assertEqual(oto.duration_minutes, 60)

    def test_one_to_one_other_member_property(self):
        """Test the other_member property."""
        oto = OneToOne.objects.create(
            member1=self.member1,
            member2=self.member2,
            date=date(2025, 8, 1)
        )

        # From member1's perspective
        self.assertEqual(oto.other_member(self.member1), self.member2)

        # From member2's perspective
        self.assertEqual(oto.other_member(self.member2), self.member1)

    def test_one_to_one_cannot_self_reference(self):
        """Test that a member cannot have one-to-one with themselves."""
        oto = OneToOne(
            member1=self.member1,
            member2=self.member1,
            date=date(2025, 8, 1)
        )

        with self.assertRaises(ValidationError):
            oto.clean()

    def test_one_to_one_unique_constraint(self):
        """Test that the same meeting on the same day is prevented."""
        OneToOne.objects.create(
            member1=self.member1,
            member2=self.member2,
            date=date(2025, 8, 1)
        )

        # Try to create duplicate
        with self.assertRaises(IntegrityError):
            OneToOne.objects.create(
                member1=self.member1,
                member2=self.member2,
                date=date(2025, 8, 1)
            )


class TYFCBModelTestCase(TestCase):
    """Test the TYFCB model."""

    def setUp(self):
        self.chapter = Chapter.objects.create(name='BNI Test Chapter')
        self.giver = Member.objects.create(
            chapter=self.chapter,
            first_name='John',
            last_name='Smith'
        )
        self.receiver = Member.objects.create(
            chapter=self.chapter,
            first_name='Jane',
            last_name='Doe'
        )

    def test_create_tyfcb(self):
        """Test creating a TYFCB."""
        tyfcb = TYFCB.objects.create(
            giver=self.giver,
            receiver=self.receiver,
            amount=Decimal('5000.00'),
            currency='AED',
            date=date(2025, 8, 1),
            detail='Closed business'
        )

        self.assertEqual(tyfcb.giver, self.giver)
        self.assertEqual(tyfcb.receiver, self.receiver)
        self.assertEqual(tyfcb.amount, Decimal('5000.00'))
        self.assertEqual(tyfcb.currency, 'AED')

    def test_tyfcb_null_giver_allowed(self):
        """Test that TYFCB can have null giver (outside chapter)."""
        tyfcb = TYFCB.objects.create(
            giver=None,
            receiver=self.receiver,
            amount=Decimal('3000.00'),
            date=date(2025, 8, 1),
            detail='External business'
        )

        self.assertIsNone(tyfcb.giver)
        self.assertEqual(tyfcb.receiver, self.receiver)

    def test_tyfcb_decimal_precision(self):
        """Test that TYFCB amount maintains decimal precision."""
        tyfcb = TYFCB.objects.create(
            giver=self.giver,
            receiver=self.receiver,
            amount=Decimal('1234.56'),
            date=date(2025, 8, 1)
        )

        tyfcb.refresh_from_db()
        self.assertEqual(tyfcb.amount, Decimal('1234.56'))

    def test_tyfcb_different_currencies(self):
        """Test TYFCB with different currencies."""
        tyfcb_aed = TYFCB.objects.create(
            giver=self.giver,
            receiver=self.receiver,
            amount=Decimal('5000.00'),
            currency='AED',
            date=date(2025, 8, 1)
        )

        tyfcb_usd = TYFCB.objects.create(
            giver=self.giver,
            receiver=self.receiver,
            amount=Decimal('1000.00'),
            currency='USD',
            date=date(2025, 8, 2)
        )

        self.assertEqual(tyfcb_aed.currency, 'AED')
        self.assertEqual(tyfcb_usd.currency, 'USD')


class MemberMonthlyStatsTestCase(TestCase):
    """Test the MemberMonthlyStats model."""

    def setUp(self):
        self.chapter = Chapter.objects.create(name='BNI Test Chapter')
        self.member = Member.objects.create(
            chapter=self.chapter,
            first_name='John',
            last_name='Smith'
        )
        self.report = MonthlyReport.objects.create(
            chapter=self.chapter,
            month_year='2025-08'
        )

    def test_create_member_monthly_stats(self):
        """Test creating member monthly stats."""
        stats = MemberMonthlyStats.objects.create(
            member=self.member,
            monthly_report=self.report,
            referrals_given=10,
            referrals_received=8,
            one_to_ones_completed=15,
            tyfcb_inside_amount=Decimal('5000.00'),
            tyfcb_outside_amount=Decimal('2000.00')
        )

        self.assertEqual(stats.referrals_given, 10)
        self.assertEqual(stats.referrals_received, 8)
        self.assertEqual(stats.one_to_ones_completed, 15)

    def test_member_monthly_stats_json_arrays(self):
        """Test JSON array fields for missing interactions."""
        stats = MemberMonthlyStats.objects.create(
            member=self.member,
            monthly_report=self.report,
            referrals_given=0,
            referrals_received=0,
            one_to_ones_completed=0,
            missing_otos=[1, 2, 3],
            missing_referrals_given_to=[4, 5],
            missing_referrals_received_from=[6, 7, 8],
            priority_connections=[1, 4, 6]
        )

        stats.refresh_from_db()

        self.assertEqual(len(stats.missing_otos), 3)
        self.assertEqual(len(stats.missing_referrals_given_to), 2)
        self.assertEqual(len(stats.priority_connections), 3)

    def test_member_monthly_stats_unique_per_member_report(self):
        """Test that only one stats entry per member per report."""
        MemberMonthlyStats.objects.create(
            member=self.member,
            monthly_report=self.report,
            referrals_given=5
        )

        # Try to create duplicate
        with self.assertRaises(IntegrityError):
            MemberMonthlyStats.objects.create(
                member=self.member,
                monthly_report=self.report,
                referrals_given=10
            )