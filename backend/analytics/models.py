"""
Analytics models for BNI Analytics - Referrals, OneToOne meetings, TYFCB.
"""
from django.db import models
from django.core.exceptions import ValidationError
from members.models import Member


class Referral(models.Model):
    """A referral given from one member to another."""
    giver = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='referrals_given')
    receiver = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='referrals_received')
    date_given = models.DateField(auto_now_add=True)
    week_of = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_given']
        db_table = 'analytics_referral'

    def __str__(self):
        return f"{self.giver} -> {self.receiver} ({self.date_given})"

    def clean(self):
        if self.giver == self.receiver:
            raise ValidationError("A member cannot refer to themselves")
        if self.giver and self.receiver and self.giver.chapter != self.receiver.chapter:
            raise ValidationError("Referrals must be within the same chapter")


class OneToOne(models.Model):
    """A one-to-one meeting between two members."""
    member1 = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='one_to_ones_as_member1')
    member2 = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='one_to_ones_as_member2')
    meeting_date = models.DateField(auto_now_add=True)
    week_of = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-meeting_date']
        verbose_name = "One-to-One Meeting"
        verbose_name_plural = "One-to-One Meetings"
        db_table = 'analytics_onetoone'

    def __str__(self):
        return f"{self.member1} <-> {self.member2} ({self.meeting_date})"

    def clean(self):
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
    receiver = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='tyfcbs_received')
    giver = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='tyfcbs_given', null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=3, default='AED')
    within_chapter = models.BooleanField(default=True)
    date_closed = models.DateField(auto_now_add=True)
    week_of = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_closed']
        verbose_name = "TYFCB"
        verbose_name_plural = "TYFCBs"
        db_table = 'analytics_tyfcb'

    def __str__(self):
        giver_name = self.giver.full_name if self.giver else "External"
        return f"{giver_name} -> {self.receiver} (AED {self.amount})"

    def clean(self):
        if self.giver and self.giver == self.receiver:
            raise ValidationError("A member cannot give TYFCB to themselves")
        if self.amount < 0:
            raise ValidationError("TYFCB amount cannot be negative")
        if self.giver and self.receiver and self.giver.chapter != self.receiver.chapter:
            raise ValidationError("TYFCBs must be within the same chapter")


