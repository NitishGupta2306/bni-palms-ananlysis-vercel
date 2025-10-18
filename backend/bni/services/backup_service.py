"""
Backup service for BNI PALMS Analytics.

Handles database backups, file backups, and backup rotation.
"""

import os
import gzip
import shutil
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from django.conf import settings
from django.core.management import call_command
from io import StringIO

logger = logging.getLogger(__name__)


class BackupService:
    """Service for creating and managing backups."""

    def __init__(self, backup_dir: Optional[str] = None):
        """
        Initialize backup service.

        Args:
            backup_dir: Directory to store backups. Defaults to settings.BACKUP_DIR
        """
        self.backup_dir = Path(backup_dir or getattr(settings, 'BACKUP_DIR', 'backups'))
        self.backup_dir.mkdir(parents=True, exist_ok=True)

        # Retention settings
        self.keep_daily = getattr(settings, 'BACKUP_KEEP_DAILY', 7)
        self.keep_weekly = getattr(settings, 'BACKUP_KEEP_WEEKLY', 4)
        self.keep_monthly = getattr(settings, 'BACKUP_KEEP_MONTHLY', 3)

    def create_database_backup(self) -> Dict[str, any]:
        """
        Create a database backup.

        Returns:
            Dict with backup info (path, size, timestamp)
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'db_backup_{timestamp}.json'
        backup_path = self.backup_dir / backup_filename
        compressed_path = self.backup_dir / f'{backup_filename}.gz'

        try:
            # Create database dump using Django's dumpdata
            logger.info(f"Creating database backup: {backup_filename}")

            # Export all data to JSON
            out = StringIO()
            call_command(
                'dumpdata',
                '--natural-foreign',
                '--natural-primary',
                '--indent=2',
                '--exclude=contenttypes',
                '--exclude=auth.permission',
                '--exclude=sessions',
                stdout=out
            )

            # Write to file
            with open(backup_path, 'w') as f:
                f.write(out.getvalue())

            # Compress the backup
            with open(backup_path, 'rb') as f_in:
                with gzip.open(compressed_path, 'wb', compresslevel=9) as f_out:
                    shutil.copyfileobj(f_in, f_out)

            # Remove uncompressed file
            backup_path.unlink()

            # Get file size
            file_size = compressed_path.stat().st_size

            logger.info(
                f"Database backup created successfully: {compressed_path.name} "
                f"({file_size / 1024 / 1024:.2f} MB)"
            )

            return {
                'success': True,
                'type': 'database',
                'path': str(compressed_path),
                'filename': compressed_path.name,
                'size': file_size,
                'size_mb': round(file_size / 1024 / 1024, 2),
                'timestamp': timestamp,
                'compressed': True
            }

        except Exception as e:
            logger.error(f"Database backup failed: {str(e)}", exc_info=True)
            # Clean up partial backup
            if backup_path.exists():
                backup_path.unlink()
            if compressed_path.exists():
                compressed_path.unlink()

            return {
                'success': False,
                'type': 'database',
                'error': str(e),
                'timestamp': timestamp
            }

    def create_media_backup(self) -> Dict[str, any]:
        """
        Create a backup of uploaded media files.

        Returns:
            Dict with backup info
        """
        media_root = Path(settings.MEDIA_ROOT)
        if not media_root.exists():
            logger.warning("MEDIA_ROOT does not exist, skipping media backup")
            return {
                'success': False,
                'type': 'media',
                'error': 'MEDIA_ROOT does not exist',
                'timestamp': datetime.now().strftime('%Y%m%d_%H%M%S')
            }

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'media_backup_{timestamp}'
        backup_path = self.backup_dir / backup_filename

        try:
            logger.info(f"Creating media backup: {backup_filename}")

            # Create tar.gz archive of media files
            shutil.make_archive(
                str(backup_path),
                'gztar',
                root_dir=media_root.parent,
                base_dir=media_root.name
            )

            compressed_path = Path(f"{backup_path}.tar.gz")
            file_size = compressed_path.stat().st_size

            logger.info(
                f"Media backup created successfully: {compressed_path.name} "
                f"({file_size / 1024 / 1024:.2f} MB)"
            )

            return {
                'success': True,
                'type': 'media',
                'path': str(compressed_path),
                'filename': compressed_path.name,
                'size': file_size,
                'size_mb': round(file_size / 1024 / 1024, 2),
                'timestamp': timestamp,
                'compressed': True
            }

        except Exception as e:
            logger.error(f"Media backup failed: {str(e)}", exc_info=True)
            return {
                'success': False,
                'type': 'media',
                'error': str(e),
                'timestamp': timestamp
            }

    def create_full_backup(self) -> Dict[str, any]:
        """
        Create full backup (database + media).

        Returns:
            Dict with backup results
        """
        logger.info("Starting full backup...")

        results = {
            'timestamp': datetime.now().isoformat(),
            'backups': []
        }

        # Database backup
        db_backup = self.create_database_backup()
        results['backups'].append(db_backup)

        # Media backup
        media_backup = self.create_media_backup()
        results['backups'].append(media_backup)

        # Calculate totals
        results['total_size'] = sum(
            b.get('size', 0) for b in results['backups'] if b['success']
        )
        results['total_size_mb'] = round(results['total_size'] / 1024 / 1024, 2)
        results['success_count'] = sum(1 for b in results['backups'] if b['success'])
        results['fail_count'] = sum(1 for b in results['backups'] if not b['success'])
        results['all_success'] = results['fail_count'] == 0

        logger.info(
            f"Full backup completed: {results['success_count']} successful, "
            f"{results['fail_count']} failed, "
            f"total size: {results['total_size_mb']} MB"
        )

        return results

    def cleanup_old_backups(self) -> Dict[str, any]:
        """
        Remove old backups based on retention policy.

        Retention:
        - Keep all backups from last 7 days (daily)
        - Keep weekly backups for last 4 weeks
        - Keep monthly backups for last 3 months
        - Delete everything older

        Returns:
            Dict with cleanup results
        """
        logger.info("Starting backup cleanup...")

        now = datetime.now()
        daily_cutoff = now - timedelta(days=self.keep_daily)
        weekly_cutoff = now - timedelta(weeks=self.keep_weekly)
        monthly_cutoff = now - timedelta(days=self.keep_monthly * 30)

        deleted_files = []
        kept_files = []
        errors = []

        # Get all backup files
        backup_files = list(self.backup_dir.glob('*backup_*.gz')) + \
                      list(self.backup_dir.glob('*backup_*.tar.gz'))

        for backup_file in backup_files:
            try:
                # Extract timestamp from filename
                # Format: db_backup_YYYYMMDD_HHMMSS.json.gz or media_backup_YYYYMMDD_HHMMSS.tar.gz
                parts = backup_file.stem.split('_')
                if len(parts) >= 3:
                    date_str = parts[-2]  # YYYYMMDD
                    file_date = datetime.strptime(date_str, '%Y%m%d')

                    # Determine if we should keep this backup
                    age_days = (now - file_date).days

                    if file_date >= daily_cutoff:
                        # Keep all daily backups
                        kept_files.append(backup_file.name)
                    elif file_date >= weekly_cutoff and file_date.weekday() == 6:  # Sunday
                        # Keep weekly backups (Sundays)
                        kept_files.append(backup_file.name)
                    elif file_date >= monthly_cutoff and file_date.day == 1:  # First of month
                        # Keep monthly backups
                        kept_files.append(backup_file.name)
                    else:
                        # Delete old backup
                        backup_file.unlink()
                        deleted_files.append({
                            'filename': backup_file.name,
                            'age_days': age_days
                        })
                        logger.info(f"Deleted old backup: {backup_file.name} (age: {age_days} days)")

            except Exception as e:
                errors.append({
                    'filename': backup_file.name,
                    'error': str(e)
                })
                logger.error(f"Error processing backup {backup_file.name}: {str(e)}")

        result = {
            'timestamp': now.isoformat(),
            'deleted_count': len(deleted_files),
            'kept_count': len(kept_files),
            'error_count': len(errors),
            'deleted_files': deleted_files,
            'errors': errors
        }

        logger.info(
            f"Backup cleanup completed: {len(deleted_files)} deleted, "
            f"{len(kept_files)} kept, {len(errors)} errors"
        )

        return result

    def list_backups(self) -> List[Dict]:
        """
        List all available backups.

        Returns:
            List of backup info dicts
        """
        backups = []

        # Find all backup files
        backup_files = sorted(
            list(self.backup_dir.glob('*backup_*.gz')) + \
            list(self.backup_dir.glob('*backup_*.tar.gz')),
            key=lambda f: f.stat().st_mtime,
            reverse=True
        )

        for backup_file in backup_files:
            try:
                stat = backup_file.stat()
                # Extract type from filename
                if backup_file.name.startswith('db_'):
                    backup_type = 'database'
                elif backup_file.name.startswith('media_'):
                    backup_type = 'media'
                else:
                    backup_type = 'unknown'

                backups.append({
                    'filename': backup_file.name,
                    'type': backup_type,
                    'path': str(backup_file),
                    'size': stat.st_size,
                    'size_mb': round(stat.st_size / 1024 / 1024, 2),
                    'created': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'age_days': (datetime.now() - datetime.fromtimestamp(stat.st_mtime)).days
                })
            except Exception as e:
                logger.error(f"Error reading backup {backup_file.name}: {str(e)}")

        return backups

    def restore_database_backup(self, backup_filename: str) -> Dict[str, any]:
        """
        Restore database from a backup file.

        Args:
            backup_filename: Name of backup file to restore

        Returns:
            Dict with restore results
        """
        backup_path = self.backup_dir / backup_filename

        if not backup_path.exists():
            return {
                'success': False,
                'error': f'Backup file not found: {backup_filename}'
            }

        try:
            logger.warning(f"Starting database restore from: {backup_filename}")

            # Decompress if needed
            if backup_path.suffix == '.gz':
                temp_path = self.backup_dir / f'temp_{datetime.now().timestamp()}.json'
                with gzip.open(backup_path, 'rb') as f_in:
                    with open(temp_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                restore_file = temp_path
            else:
                restore_file = backup_path

            # Load data using Django's loaddata
            call_command('loaddata', str(restore_file))

            # Clean up temp file
            if restore_file != backup_path:
                restore_file.unlink()

            logger.info(f"Database restored successfully from: {backup_filename}")

            return {
                'success': True,
                'backup_file': backup_filename,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Database restore failed: {str(e)}", exc_info=True)
            if 'temp_path' in locals() and temp_path.exists():
                temp_path.unlink()

            return {
                'success': False,
                'error': str(e),
                'backup_file': backup_filename
            }
