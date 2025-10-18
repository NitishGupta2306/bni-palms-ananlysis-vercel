"""
Report models for BNI Analytics.
"""

from django.db import models
from chapters.models import Chapter
from members.models import Member


class MonthlyReport(models.Model):
    """Store complete monthly data for a chapter including Excel files and processed matrices."""

    chapter = models.ForeignKey(
        Chapter, on_delete=models.CASCADE, related_name="monthly_reports", db_index=True
    )
    month_year = models.CharField(
        max_length=7, help_text="e.g., '2024-06' for June 2024", db_index=True
    )

    # File Storage (just store filename for reference, process in memory)
    slip_audit_file = models.CharField(max_length=255, blank=True)
    member_names_file = models.CharField(max_length=255, blank=True, null=True)

    # Week Tracking - NEW
    week_of_date = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        help_text="The week this audit represents (e.g., 2025-01-28)",
    )
    audit_period_start = models.DateField(
        null=True, blank=True, help_text="Start date of audit period"
    )
    audit_period_end = models.DateField(
        null=True, blank=True, help_text="End date of audit period"
    )

    # PALMS Sheet Requirements - NEW
    require_palms_sheets = models.BooleanField(
        default=False,
        help_text="Whether PALMS data sheets are required for this report",
    )
    uploaded_file_names = models.JSONField(
        default=list, blank=True, help_text="List of all uploaded files with metadata"
    )

    # Processed Matrix Data (JSON)
    referral_matrix_data = models.JSONField(default=dict, blank=True)
    oto_matrix_data = models.JSONField(default=dict, blank=True)
    combination_matrix_data = models.JSONField(default=dict, blank=True)
    tyfcb_inside_data = models.JSONField(default=dict, blank=True)
    tyfcb_outside_data = models.JSONField(default=dict, blank=True)

    # Metadata
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["chapter", "month_year"]
        ordering = ["-month_year"]
        indexes = [
            # Note: report_chapter_month_idx already exists from migration 0003
            models.Index(fields=['week_of_date'], name='report_week_idx'),
        ]
        db_table = "chapters_monthlyreport"

    def __str__(self):
        return f"{self.chapter.name} - {self.month_year}"


class MemberMonthlyStats(models.Model):
    """Individual member statistics for each monthly report."""

    member = models.ForeignKey(
        Member, on_delete=models.CASCADE, related_name="monthly_stats", db_index=True
    )
    monthly_report = models.ForeignKey(
        MonthlyReport, on_delete=models.CASCADE, related_name="member_stats", db_index=True
    )

    # Basic Stats
    referrals_given = models.IntegerField(default=0)
    referrals_received = models.IntegerField(default=0)
    one_to_ones_completed = models.IntegerField(default=0)
    tyfcb_inside_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )
    tyfcb_outside_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )

    # Missing Lists (JSON arrays of member IDs)
    missing_otos = models.JSONField(
        default=list, blank=True, help_text="Member IDs they haven't done OTOs with"
    )
    missing_referrals_given_to = models.JSONField(
        default=list, blank=True, help_text="Member IDs they haven't given referrals to"
    )
    missing_referrals_received_from = models.JSONField(
        default=list,
        blank=True,
        help_text="Member IDs they haven't received referrals from",
    )
    priority_connections = models.JSONField(
        default=list,
        blank=True,
        help_text="Members appearing in multiple missing lists",
    )

    class Meta:
        unique_together = ["member", "monthly_report"]
        ordering = ["member__first_name"]
        # Note: stats_member_report_idx already exists from migration 0003 (fields are member, monthly_report)
        # No additional indexes needed since the existing index covers common query patterns
        db_table = "chapters_membermonthlystats"

    def __str__(self):
        return f"{self.member.full_name} - {self.monthly_report.month_year}"

    def calculate_missing_lists(self, all_chapter_members):
        """Calculate the missing interaction lists for this member."""
        from analytics.models import Referral, OneToOne

        # Get all chapter member IDs except self
        other_member_ids = set(
            all_chapter_members.exclude(id=self.member.id).values_list("id", flat=True)
        )

        # Get interactions
        referrals_given = set(
            Referral.objects.filter(giver=self.member).values_list(
                "receiver_id", flat=True
            )
        )

        referrals_received = set(
            Referral.objects.filter(receiver=self.member).values_list(
                "giver_id", flat=True
            )
        )

        otos_done = set()
        for oto in OneToOne.objects.filter(
            models.Q(member1=self.member) | models.Q(member2=self.member)
        ):
            other_member = oto.member2 if oto.member1 == self.member else oto.member1
            otos_done.add(other_member.id)

        # Calculate missing lists
        self.missing_otos = list(other_member_ids - otos_done)
        self.missing_referrals_given_to = list(other_member_ids - referrals_given)
        self.missing_referrals_received_from = list(
            other_member_ids - referrals_received
        )

        # Calculate priority connections (appear in multiple missing lists)
        missing_sets = [
            set(self.missing_otos),
            set(self.missing_referrals_given_to),
            set(self.missing_referrals_received_from),
        ]

        priority_members = set()
        for i, set1 in enumerate(missing_sets):
            for j, set2 in enumerate(missing_sets):
                if i < j:  # Avoid duplicate comparisons
                    priority_members.update(set1 & set2)

        self.priority_connections = list(priority_members)
