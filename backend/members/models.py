"""
Member models for BNI Analytics.
"""
from django.db import models
from chapters.models import Chapter


class Member(models.Model):
    """A chapter member."""
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='members')
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    normalized_name = models.CharField(max_length=100, db_index=True)
    business_name = models.CharField(max_length=200, blank=True)
    classification = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    joined_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['first_name', 'last_name']
        unique_together = ['chapter', 'normalized_name']
        db_table = 'chapters_member'

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def save(self, *args, **kwargs):
        if not self.normalized_name:
            self.normalized_name = self.normalize_name(f"{self.first_name} {self.last_name}")
        super().save(*args, **kwargs)

    @staticmethod
    def normalize_name(name):
        """Normalize name for consistent matching."""
        if not name:
            return ""

        # Convert to lowercase and remove extra spaces
        normalized = ' '.join(name.lower().split())

        # Remove common prefixes/suffixes
        prefixes = ['mr.', 'mrs.', 'ms.', 'dr.', 'prof.']
        suffixes = ['jr.', 'sr.', 'ii', 'iii', 'iv']

        parts = normalized.split()

        # Remove prefixes
        if parts and parts[0] in prefixes:
            parts = parts[1:]

        # Remove suffixes
        if parts and parts[-1] in suffixes:
            parts = parts[:-1]

        return ' '.join(parts)
