"""
Management command to hash all existing plain text passwords.

Run this ONCE after deploying password hashing changes:
    python manage.py hash_passwords

This command will:
1. Find all chapters with plain text passwords
2. Hash them using bcrypt
3. Update the database
4. Hash the admin password if needed
"""

from django.core.management.base import BaseCommand
from chapters.models import Chapter, AdminSettings
from chapters.password_utils import is_hashed, hash_password


class Command(BaseCommand):
    help = 'Hash all existing plain text passwords in the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be hashed without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        # Hash chapter passwords
        chapters = Chapter.objects.all()
        chapter_count = 0
        chapter_skipped = 0

        self.stdout.write(f"\nProcessing {chapters.count()} chapters...")

        for chapter in chapters:
            if not is_hashed(chapter.password):
                old_password = chapter.password
                if dry_run:
                    self.stdout.write(
                        f"  Would hash: {chapter.name} (password: {old_password[:10]}...)"
                    )
                else:
                    chapter.set_password(old_password)
                    chapter.save()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  ✓ Hashed: {chapter.name} (was: {old_password[:10]}...)"
                        )
                    )
                chapter_count += 1
            else:
                chapter_skipped += 1
                self.stdout.write(f"  - Skipped: {chapter.name} (already hashed)")

        # Hash admin password
        admin_settings = AdminSettings.load()
        admin_hashed = False

        self.stdout.write("\nProcessing admin password...")

        if not is_hashed(admin_settings.admin_password):
            old_password = admin_settings.admin_password
            if dry_run:
                self.stdout.write(
                    f"  Would hash: admin password (password: {old_password[:10]}...)"
                )
            else:
                admin_settings.set_password(old_password)
                admin_settings.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  ✓ Hashed: admin password (was: {old_password[:10]}...)"
                    )
                )
            admin_hashed = True
        else:
            self.stdout.write("  - Skipped: admin password (already hashed)")

        # Summary
        self.stdout.write("\n" + "=" * 60)
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN COMPLETE - No changes made"))
        else:
            self.stdout.write(self.style.SUCCESS("PASSWORD HASHING COMPLETE"))

        self.stdout.write(f"\nChapters:")
        self.stdout.write(f"  - Hashed: {chapter_count}")
        self.stdout.write(f"  - Skipped (already hashed): {chapter_skipped}")
        if admin_hashed:
            self.stdout.write(f"\nAdmin:")
            self.stdout.write(f"  - Hashed: 1")
        else:
            self.stdout.write(f"\nAdmin:")
            self.stdout.write(f"  - Skipped (already hashed): 1")

        if not dry_run and (chapter_count > 0 or admin_hashed):
            self.stdout.write("\n" + self.style.SUCCESS("✓ All passwords are now securely hashed!"))
            self.stdout.write("\nNOTE: The login flow will automatically use the new hashed passwords.")
            self.stdout.write("      No frontend changes are needed.")
