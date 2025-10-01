"""
BNI Analytics - Legacy Models File

DEPRECATED: All models have been moved to feature-based apps:
- Chapter → chapters.models
- Member → members.models
- MonthlyReport, MemberMonthlyStats → reports.models
- Referral, OneToOne, TYFCB, DataImportSession → analytics.models

This file is kept temporarily for reference during migration.
Once all imports are updated throughout the codebase, this file can be deleted.
"""

# All models commented out to prevent database table conflicts
# Uncomment if needed for reference during migration

# from django.db import models
# from django.contrib.auth.models import User
# from django.core.exceptions import ValidationError


# class Chapter(models.Model):
#     """A BNI chapter."""
#     name = models.CharField(max_length=100, unique=True)
#     location = models.CharField(max_length=200)
#     meeting_day = models.CharField(max_length=20, blank=True)
#     meeting_time = models.TimeField(null=True, blank=True)
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)
#
#     class Meta:
#         ordering = ['name']
#         db_table = 'chapters_chapter'
#
#     def __str__(self):
#         return self.name


# class Member(models.Model):
#     """A chapter member."""
#     user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
#     chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='members')
#     first_name = models.CharField(max_length=50)
#     last_name = models.CharField(max_length=50)
#     normalized_name = models.CharField(max_length=100, db_index=True)
#     business_name = models.CharField(max_length=200, blank=True)
#     classification = models.CharField(max_length=100, blank=True)
#     email = models.EmailField(blank=True)
#     phone = models.CharField(max_length=20, blank=True)
#     is_active = models.BooleanField(default=True)
#     joined_date = models.DateField(null=True, blank=True)
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)
#
#     class Meta:
#         ordering = ['first_name', 'last_name']
#         unique_together = ['chapter', 'normalized_name']
#         db_table = 'chapters_member'
#
#     def __str__(self):
#         return f"{self.first_name} {self.last_name}"
#
#     @property
#     def full_name(self):
#         return f"{self.first_name} {self.last_name}"
#
#     def save(self, *args, **kwargs):
#         if not self.normalized_name:
#             self.normalized_name = self.normalize_name(f"{self.first_name} {self.last_name}")
#         super().save(*args, **kwargs)
#
#     @staticmethod
#     def normalize_name(name):
#         """Normalize name for consistent matching."""
#         if not name:
#             return ""
#
#         # Convert to lowercase and remove extra spaces
#         normalized = ' '.join(name.lower().split())
#
#         # Remove common prefixes/suffixes
#         prefixes = ['mr.', 'mrs.', 'ms.', 'dr.', 'prof.']
#         suffixes = ['jr.', 'sr.', 'ii', 'iii', 'iv']
#
#         parts = normalized.split()
#
#         # Remove prefixes
#         if parts and parts[0] in prefixes:
#             parts = parts[1:]
#
#         # Remove suffixes
#         if parts and parts[-1] in suffixes:
#             parts = parts[:-1]
#
#         return ' '.join(parts)


# class MonthlyReport(models.Model):
#     """Store complete monthly data for a chapter including Excel files and processed matrices."""
#     chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='monthly_reports')
#     month_year = models.CharField(max_length=7, help_text="e.g., '2024-06' for June 2024")
#
#     # File Storage
#     slip_audit_file = models.FileField(upload_to='monthly_reports/slip_audits/')
#     member_names_file = models.FileField(upload_to='monthly_reports/member_names/', null=True, blank=True)
#
#     # Processed Matrix Data (JSON)
#     referral_matrix_data = models.JSONField(default=dict, blank=True)
#     oto_matrix_data = models.JSONField(default=dict, blank=True)
#     combination_matrix_data = models.JSONField(default=dict, blank=True)
#     tyfcb_inside_data = models.JSONField(default=dict, blank=True)
#     tyfcb_outside_data = models.JSONField(default=dict, blank=True)
#
#     # Metadata
#     uploaded_at = models.DateTimeField(auto_now_add=True)
#     processed_at = models.DateTimeField(null=True, blank=True)
#
#     class Meta:
#         unique_together = ['chapter', 'month_year']
#         ordering = ['-month_year']
#         db_table = 'chapters_monthlyreport'
#
#     def __str__(self):
#         return f"{self.chapter.name} - {self.month_year}"


# class MemberMonthlyStats(models.Model):
#     """Individual member statistics for each monthly report."""
#     member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='monthly_stats')
#     monthly_report = models.ForeignKey(MonthlyReport, on_delete=models.CASCADE, related_name='member_stats')
#
#     # Basic Stats
#     referrals_given = models.IntegerField(default=0)
#     referrals_received = models.IntegerField(default=0)
#     one_to_ones_completed = models.IntegerField(default=0)
#     tyfcb_inside_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
#     tyfcb_outside_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
#
#     # Missing Lists (JSON arrays of member IDs)
#     missing_otos = models.JSONField(default=list, blank=True, help_text="Member IDs they haven't done OTOs with")
#     missing_referrals_given_to = models.JSONField(default=list, blank=True, help_text="Member IDs they haven't given referrals to")
#     missing_referrals_received_from = models.JSONField(default=list, blank=True, help_text="Member IDs they haven't received referrals from")
#     priority_connections = models.JSONField(default=list, blank=True, help_text="Members appearing in multiple missing lists")
#
#     class Meta:
#         unique_together = ['member', 'monthly_report']
#         ordering = ['member__first_name']
#         db_table = 'chapters_membermonthlystats'
#
#     def __str__(self):
#         return f"{self.member.full_name} - {self.monthly_report.month_year}"
#
#     def calculate_missing_lists(self, all_chapter_members):
#         """Calculate the missing interaction lists for this member."""
#         # Get all chapter member IDs except self
#         other_member_ids = set(all_chapter_members.exclude(id=self.member.id).values_list('id', flat=True))
#
#         # Get interactions
#         referrals_given = set(Referral.objects.filter(
#             giver=self.member
#         ).values_list('receiver_id', flat=True))
#
#         referrals_received = set(Referral.objects.filter(
#             receiver=self.member
#         ).values_list('giver_id', flat=True))
#
#         otos_done = set()
#         for oto in OneToOne.objects.filter(models.Q(member1=self.member) | models.Q(member2=self.member)):
#             other_member = oto.member2 if oto.member1 == self.member else oto.member1
#             otos_done.add(other_member.id)
#
#         # Calculate missing lists
#         self.missing_otos = list(other_member_ids - otos_done)
#         self.missing_referrals_given_to = list(other_member_ids - referrals_given)
#         self.missing_referrals_received_from = list(other_member_ids - referrals_received)
#
#         # Calculate priority connections (appear in multiple missing lists)
#         missing_sets = [
#             set(self.missing_otos),
#             set(self.missing_referrals_given_to),
#             set(self.missing_referrals_received_from)
#         ]
#
#         priority_members = set()
#         for i, set1 in enumerate(missing_sets):
#             for j, set2 in enumerate(missing_sets):
#                 if i < j:  # Avoid duplicate comparisons
#                     priority_members.update(set1 & set2)
#
#         self.priority_connections = list(priority_members)


# class Referral(models.Model):
#     """A referral given from one member to another."""
#     giver = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='referrals_given')
#     receiver = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='referrals_received')
#     date_given = models.DateField(auto_now_add=True)
#     week_of = models.DateField(null=True, blank=True)
#     notes = models.TextField(blank=True)
#     created_at = models.DateTimeField(auto_now_add=True)
#
#     class Meta:
#         ordering = ['-date_given']
#         unique_together = ['giver', 'receiver', 'date_given']
#         db_table = 'analytics_referral'
#
#     def __str__(self):
#         return f"{self.giver} -> {self.receiver} ({self.date_given})"
#
#     def clean(self):
#         if self.giver == self.receiver:
#             raise ValidationError("A member cannot refer to themselves")
#         if self.giver and self.receiver and self.giver.chapter != self.receiver.chapter:
#             raise ValidationError("Referrals must be within the same chapter")


# class OneToOne(models.Model):
#     """A one-to-one meeting between two members."""
#     member1 = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='one_to_ones_as_member1')
#     member2 = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='one_to_ones_as_member2')
#     meeting_date = models.DateField(auto_now_add=True)
#     week_of = models.DateField(null=True, blank=True)
#     location = models.CharField(max_length=200, blank=True)
#     duration_minutes = models.PositiveIntegerField(null=True, blank=True)
#     notes = models.TextField(blank=True)
#     created_at = models.DateTimeField(auto_now_add=True)
#
#     class Meta:
#         ordering = ['-meeting_date']
#         verbose_name = "One-to-One Meeting"
#         verbose_name_plural = "One-to-One Meetings"
#         db_table = 'analytics_onetoone'
#
#     def __str__(self):
#         return f"{self.member1} <-> {self.member2} ({self.meeting_date})"
#
#     def clean(self):
#         if self.member1 == self.member2:
#             raise ValidationError("A member cannot have a one-to-one meeting with themselves")
#         if self.member1 and self.member2 and self.member1.chapter != self.member2.chapter:
#             raise ValidationError("One-to-one meetings must be within the same chapter")
#
#     @property
#     def other_member(self):
#         """Get the other member in this one-to-one meeting."""
#         return self.member2 if hasattr(self, '_current_member') and self._current_member == self.member1 else self.member1


# class TYFCB(models.Model):
#     """Thank You For Closed Business - tracks business value generated."""
#     receiver = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='tyfcbs_received')
#     giver = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='tyfcbs_given', null=True, blank=True)
#     amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
#     currency = models.CharField(max_length=3, default='AED')
#     within_chapter = models.BooleanField(default=True)
#     date_closed = models.DateField(auto_now_add=True)
#     week_of = models.DateField(null=True, blank=True)
#     description = models.TextField(blank=True)
#     created_at = models.DateTimeField(auto_now_add=True)
#
#     class Meta:
#         ordering = ['-date_closed']
#         verbose_name = "TYFCB"
#         verbose_name_plural = "TYFCBs"
#         db_table = 'analytics_tyfcb'
#
#     def __str__(self):
#         giver_name = self.giver.full_name if self.giver else "External"
#         return f"{giver_name} -> {self.receiver} (AED {self.amount})"
#
#     def clean(self):
#         if self.giver and self.giver == self.receiver:
#             raise ValidationError("A member cannot give TYFCB to themselves")
#         if self.amount < 0:
#             raise ValidationError("TYFCB amount cannot be negative")
#         if self.giver and self.receiver and self.giver.chapter != self.receiver.chapter:
#             raise ValidationError("TYFCBs must be within the same chapter")


# class DataImportSession(models.Model):
#     """Track data import sessions for auditing."""
#     chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE)
#     file_name = models.CharField(max_length=255)
#     file_size = models.PositiveIntegerField()
#     imported_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
#     import_date = models.DateTimeField(auto_now_add=True)
#     records_processed = models.PositiveIntegerField(default=0)
#     referrals_created = models.PositiveIntegerField(default=0)
#     one_to_ones_created = models.PositiveIntegerField(default=0)
#     tyfcbs_created = models.PositiveIntegerField(default=0)
#     errors_count = models.PositiveIntegerField(default=0)
#     success = models.BooleanField(default=True)
#     error_details = models.JSONField(default=list, blank=True)
#
#     class Meta:
#         ordering = ['-import_date']
#         db_table = 'analytics_dataimportsession'
#
#     def __str__(self):
#         status = "✓" if self.success else "✗"
#         return f"{status} {self.file_name} - {self.import_date.strftime('%Y-%m-%d %H:%M')}"
