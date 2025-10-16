#!/usr/bin/env python
"""
Script to set default passwords for all chapters and admin settings
"""

import os
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from chapters.models import Chapter, AdminSettings


def set_default_passwords():
    # Set admin password
    admin_settings = AdminSettings.load()
    admin_settings.admin_password = "admin123"
    admin_settings.failed_admin_attempts = 0
    admin_settings.admin_lockout_until = None
    admin_settings.save()
    print(f"✓ Admin password set to: admin123")

    # Set chapter passwords
    chapters = Chapter.objects.all()
    chapter_count = 0

    for chapter in chapters:
        chapter.password = "chapter123"
        chapter.failed_login_attempts = 0
        chapter.lockout_until = None
        chapter.save()
        chapter_count += 1
        print(f"✓ Chapter '{chapter.name}' password set to: chapter123")

    print(
        f"\n✓ Successfully set default passwords for {chapter_count} chapters and admin"
    )
    print(f"  - Admin password: admin123")
    print(f"  - All chapter passwords: chapter123")


if __name__ == "__main__":
    set_default_passwords()
