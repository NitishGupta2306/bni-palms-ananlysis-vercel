"""
Django management command for database and media backups.

Usage:
    python manage.py backup --db              # Database backup only
    python manage.py backup --media           # Media backup only
    python manage.py backup --full            # Full backup (default)
    python manage.py backup --cleanup         # Cleanup old backups
    python manage.py backup --list            # List all backups
    python manage.py backup --restore <file>  # Restore from backup
"""

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from bni.services.backup_service import BackupService
import sys


class Command(BaseCommand):
    help = 'Create and manage database and media backups'

    def add_arguments(self, parser):
        parser.add_argument(
            '--db',
            action='store_true',
            help='Create database backup only',
        )
        parser.add_argument(
            '--media',
            action='store_true',
            help='Create media backup only',
        )
        parser.add_argument(
            '--full',
            action='store_true',
            help='Create full backup (database + media)',
        )
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Clean up old backups based on retention policy',
        )
        parser.add_argument(
            '--list',
            action='store_true',
            help='List all available backups',
        )
        parser.add_argument(
            '--restore',
            type=str,
            help='Restore database from backup file',
        )
        parser.add_argument(
            '--backup-dir',
            type=str,
            help='Custom backup directory (default: settings.BACKUP_DIR)',
        )

    def handle(self, *args, **options):
        backup_dir = options.get('backup_dir')
        backup_service = BackupService(backup_dir=backup_dir)

        # List backups
        if options['list']:
            self._list_backups(backup_service)
            return

        # Cleanup old backups
        if options['cleanup']:
            self._cleanup_backups(backup_service)
            return

        # Restore backup
        if options['restore']:
            self._restore_backup(backup_service, options['restore'])
            return

        # Create backups
        if options['db']:
            self._create_database_backup(backup_service)
        elif options['media']:
            self._create_media_backup(backup_service)
        else:
            # Default to full backup
            self._create_full_backup(backup_service)

    def _create_database_backup(self, backup_service):
        """Create database backup."""
        self.stdout.write(self.style.WARNING('Creating database backup...'))

        result = backup_service.create_database_backup()

        if result['success']:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Database backup created: {result['filename']} "
                    f"({result['size_mb']} MB)"
                )
            )
        else:
            self.stdout.write(
                self.style.ERROR(f"✗ Database backup failed: {result['error']}")
            )
            sys.exit(1)

    def _create_media_backup(self, backup_service):
        """Create media backup."""
        self.stdout.write(self.style.WARNING('Creating media backup...'))

        result = backup_service.create_media_backup()

        if result['success']:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Media backup created: {result['filename']} "
                    f"({result['size_mb']} MB)"
                )
            )
        else:
            self.stdout.write(
                self.style.ERROR(f"✗ Media backup failed: {result['error']}")
            )
            sys.exit(1)

    def _create_full_backup(self, backup_service):
        """Create full backup (database + media)."""
        self.stdout.write(self.style.WARNING('Creating full backup...'))

        results = backup_service.create_full_backup()

        # Display results
        self.stdout.write('')
        for backup in results['backups']:
            if backup['success']:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ {backup['type'].capitalize()} backup: "
                        f"{backup['filename']} ({backup['size_mb']} MB)"
                    )
                )
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f"✗ {backup['type'].capitalize()} backup failed: "
                        f"{backup['error']}"
                    )
                )

        # Summary
        self.stdout.write('')
        if results['all_success']:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Full backup completed successfully! "
                    f"Total size: {results['total_size_mb']} MB"
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"⚠ Backup completed with errors: "
                    f"{results['success_count']} successful, "
                    f"{results['fail_count']} failed"
                )
            )
            sys.exit(1)

    def _cleanup_backups(self, backup_service):
        """Cleanup old backups."""
        self.stdout.write(self.style.WARNING('Cleaning up old backups...'))

        result = backup_service.cleanup_old_backups()

        if result['error_count'] > 0:
            self.stdout.write(
                self.style.ERROR(
                    f"✗ Cleanup completed with {result['error_count']} errors"
                )
            )
            for error in result['errors']:
                self.stdout.write(
                    self.style.ERROR(
                        f"  - {error['filename']}: {error['error']}"
                    )
                )

        if result['deleted_count'] > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Deleted {result['deleted_count']} old backup(s)"
                )
            )
            for deleted in result['deleted_files']:
                self.stdout.write(
                    f"  - {deleted['filename']} (age: {deleted['age_days']} days)"
                )
        else:
            self.stdout.write(
                self.style.SUCCESS('✓ No old backups to delete')
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Kept {result['kept_count']} backup(s) based on retention policy"
            )
        )

    def _list_backups(self, backup_service):
        """List all backups."""
        backups = backup_service.list_backups()

        if not backups:
            self.stdout.write(self.style.WARNING('No backups found'))
            return

        self.stdout.write(self.style.SUCCESS(f'Found {len(backups)} backup(s):'))
        self.stdout.write('')

        for backup in backups:
            backup_type = backup['type'].capitalize().ljust(10)
            size = f"{backup['size_mb']} MB".ljust(10)
            age = f"{backup['age_days']} days ago".ljust(15)

            self.stdout.write(
                f"  [{backup_type}] {backup['filename']:<40} "
                f"{size} {age}"
            )

    def _restore_backup(self, backup_service, backup_filename):
        """Restore database from backup."""
        self.stdout.write(
            self.style.WARNING(
                f"⚠ WARNING: This will OVERWRITE the current database!"
            )
        )
        self.stdout.write(f"Backup file: {backup_filename}")
        self.stdout.write('')

        # Ask for confirmation
        confirm = input("Type 'yes' to confirm restoration: ")
        if confirm.lower() != 'yes':
            self.stdout.write(self.style.ERROR('Restoration cancelled'))
            return

        self.stdout.write(self.style.WARNING('Restoring database...'))

        result = backup_service.restore_database_backup(backup_filename)

        if result['success']:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Database restored successfully from {backup_filename}"
                )
            )
        else:
            self.stdout.write(
                self.style.ERROR(
                    f"✗ Database restoration failed: {result['error']}"
                )
            )
            sys.exit(1)
