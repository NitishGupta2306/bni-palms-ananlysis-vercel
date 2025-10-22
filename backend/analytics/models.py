"""
Analytics models for BNI Analytics - Referrals, OneToOne meetings, TYFCB.
"""
from django.db import models
from django.core.exceptions import ValidationError
from members.models import Member


class Referral(models.Model):
    """A referral given from one member to another."""
    giver = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='referrals_given', db_index=True)
    receiver = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='referrals_received', db_index=True)
    date_given = models.DateField(auto_now_add=True, db_index=True)
    week_of = models.DateField(null=True, blank=True, db_index=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_given']
        indexes = [
            # Composite index for giver queries filtered by date
            models.Index(fields=['giver', 'date_given'], name='referral_giver_date_idx'),
            # Composite index for receiver queries filtered by date
            models.Index(fields=['receiver', 'date_given'], name='referral_receiver_date_idx'),
        ]
        db_table = 'analytics_referral'

    def __str__(self):
        return f"{self.giver} -> {self.receiver} ({self.date_given})"

    def clean(self):
        """
        Validate referral data before saving.

        Ensures that:
        - A member cannot refer to themselves
        - Referrals are within the same chapter

        Raises:
            ValidationError: If validation rules are violated
        """
        if self.giver == self.receiver:
            raise ValidationError("A member cannot refer to themselves")
        if self.giver and self.receiver and self.giver.chapter != self.receiver.chapter:
            raise ValidationError("Referrals must be within the same chapter")


class OneToOne(models.Model):
    """A one-to-one meeting between two members."""
    member1 = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='one_to_ones_as_member1', db_index=True)
    member2 = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='one_to_ones_as_member2', db_index=True)
    meeting_date = models.DateField(auto_now_add=True, db_index=True)
    week_of = models.DateField(null=True, blank=True, db_index=True)
    location = models.CharField(max_length=200, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-meeting_date']
        verbose_name = "One-to-One Meeting"
        verbose_name_plural = "One-to-One Meetings"
        indexes = [
            # Composite index for member1 queries filtered by date
            models.Index(fields=['member1', 'meeting_date'], name='oto_member1_date_idx'),
            # Composite index for member2 queries filtered by date
            models.Index(fields=['member2', 'meeting_date'], name='oto_member2_date_idx'),
        ]
        db_table = 'analytics_onetoone'

    def __str__(self):
        return f"{self.member1} <-> {self.member2} ({self.meeting_date})"

    def clean(self):
        """
        Validate one-to-one meeting data before saving.

        Ensures that:
        - A member cannot meet with themselves
        - Meetings are within the same chapter

        Raises:
            ValidationError: If validation rules are violated
        """
        if self.member1 == self.member2:
            raise ValidationError("A member cannot have a one-to-one meeting with themselves")
        if self.member1 and self.member2 and self.member1.chapter != self.member2.chapter:
            raise ValidationError("One-to-one meetings must be within the same chapter")

    @property
    def other_member(self):
        """Get the other member in this one-to-one meeting."""
        return self.member2 if hasattr(self, '_current_member') and self._current_member == self.member1 else self.member1


class TYFCB(models.Model):
    """Thank You For Closed Business - tracks business value generated."""
    receiver = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='tyfcbs_received', db_index=True)
    giver = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='tyfcbs_given', null=True, blank=True, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=3, default='AED')
    within_chapter = models.BooleanField(default=True, db_index=True)
    date_closed = models.DateField(auto_now_add=True, db_index=True)
    week_of = models.DateField(null=True, blank=True, db_index=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_closed']
        verbose_name = "TYFCB"
        verbose_name_plural = "TYFCBs"
        indexes = [
            # Composite index for receiver queries filtered by chapter status
            models.Index(fields=['receiver', 'within_chapter'], name='tyfcb_receiver_chapter_idx'),
            # Composite index for receiver queries filtered by date
            models.Index(fields=['receiver', 'date_closed'], name='tyfcb_receiver_date_idx'),
        ]
        db_table = 'analytics_tyfcb'

    def __str__(self):
        giver_name = self.giver.full_name if self.giver else "External"
        return f"{giver_name} -> {self.receiver} (AED {self.amount})"

    def clean(self):
        """
        Validate TYFCB data before saving.

        Ensures that:
        - A member cannot give TYFCB to themselves
        - Amount is non-negative
        - TYFCBs are within the same chapter

        Raises:
            ValidationError: If validation rules are violated
        """
        if self.giver and self.giver == self.receiver:
            raise ValidationError("A member cannot give TYFCB to themselves")
        if self.amount < 0:
            raise ValidationError("TYFCB amount cannot be negative")
        if self.giver and self.receiver and self.giver.chapter != self.receiver.chapter:
            raise ValidationError("TYFCBs must be within the same chapter")


