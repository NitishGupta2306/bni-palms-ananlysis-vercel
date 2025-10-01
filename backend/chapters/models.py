"""
Chapter models for BNI Analytics.
"""
from django.db import models


class Chapter(models.Model):
    """A BNI chapter."""
    name = models.CharField(max_length=100, unique=True)
    location = models.CharField(max_length=200)
    meeting_day = models.CharField(max_length=20, blank=True)
    meeting_time = models.TimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        db_table = 'chapters_chapter'

    def __str__(self):
        return self.name
