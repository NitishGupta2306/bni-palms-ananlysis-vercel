"""
Chapter models for BNI Analytics.
"""

from django.db import models
from django.utils import timezone
from datetime import timedelta
from .password_utils import hash_password, verify_password


class Chapter(models.Model):
    """A BNI chapter."""

    name = models.CharField(max_length=100, unique=True)
    location = models.CharField(max_length=200)
    meeting_day = models.CharField(max_length=20, blank=True)
    meeting_time = models.TimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Authentication fields
    password = models.CharField(max_length=255, default="chapter123")  # Increased for bcrypt hash (60 chars)
    failed_login_attempts = models.IntegerField(default=0)
    lockout_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["name"]
        db_table = "chapters_chapter"

    def __str__(self):
        return self.name

    def is_locked_out(self):
        """Check if chapter is currently locked out."""
        if self.lockout_until and self.lockout_until > timezone.now():
            return True
        return False

    def increment_failed_attempts(self):
        """Increment failed login attempts and lock out if needed."""
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            self.lockout_until = timezone.now() + timedelta(minutes=15)
        self.save()

    def reset_failed_attempts(self):
        """Reset failed login attempts after successful login."""
        self.failed_login_attempts = 0
        self.lockout_until = None
        self.save()

    def set_password(self, raw_password: str):
        """
        Set the password for this chapter (hashed).

        Args:
            raw_password: Plain text password to hash and store
        """
        self.password = hash_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        """
        Check if the provided password matches the stored password.

        Args:
            raw_password: Plain text password to verify

        Returns:
            True if password matches, False otherwise

        Note:
            All passwords should now be bcrypt hashed. Legacy plaintext support
            was removed after migration period (completed 2025-10-18).
        """
        return verify_password(raw_password, self.password)


class AdminSettings(models.Model):
    """Singleton model for admin authentication settings."""

    admin_password = models.CharField(
        max_length=255,
        help_text="Bcrypt hashed admin password. Set via management command or admin panel."
    )  # Increased for bcrypt hash (60 chars)
    failed_admin_attempts = models.IntegerField(default=0)
    admin_lockout_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Admin Settings"
        verbose_name_plural = "Admin Settings"

    def save(self, *args, **kwargs):
        """Ensure only one instance exists (singleton pattern)."""
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Prevent deletion of singleton instance."""
        pass

    @classmethod
    def load(cls):
        """Load the singleton instance, creating it if it doesn't exist."""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def is_locked_out(self):
        """Check if admin is currently locked out."""
        if self.admin_lockout_until and self.admin_lockout_until > timezone.now():
            return True
        return False

    def increment_failed_attempts(self):
        """Increment failed admin login attempts and lock out if needed."""
        self.failed_admin_attempts += 1
        if self.failed_admin_attempts >= 5:
            self.admin_lockout_until = timezone.now() + timedelta(minutes=15)
        self.save()

    def reset_failed_attempts(self):
        """Reset failed admin login attempts after successful login."""
        self.failed_admin_attempts = 0
        self.admin_lockout_until = None
        self.save()

    def set_password(self, raw_password: str):
        """
        Set the admin password (hashed).

        Args:
            raw_password: Plain text password to hash and store
        """
        self.admin_password = hash_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        """
        Check if the provided password matches the stored admin password.

        Args:
            raw_password: Plain text password to verify

        Returns:
            True if password matches, False otherwise

        Note:
            All passwords should now be bcrypt hashed. Legacy plaintext support
            was removed after migration period (completed 2025-10-18).
        """
        return verify_password(raw_password, self.admin_password)
