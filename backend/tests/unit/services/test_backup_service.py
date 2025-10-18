"""
Unit tests for BackupService.

Tests backup creation, restoration, cleanup, and listing functionality.
"""

import pytest
import os
import gzip
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from bni.services.backup_service import BackupService


@pytest.mark.unit
@pytest.mark.service
class TestBackupService:
    """Test suite for BackupService class."""

    def test_init_creates_backup_directory(self, tmp_path):
        """Test that BackupService creates backup directory if it doesn't exist."""
        backup_dir = tmp_path / "backups"
        assert not backup_dir.exists()

        service = BackupService(backup_dir=str(backup_dir))

        assert backup_dir.exists()
        assert service.backup_dir == backup_dir

    def test_init_uses_default_retention_settings(self, sample_backup_dir):
        """Test that default retention settings are applied."""
        service = BackupService(backup_dir=sample_backup_dir)

        assert service.keep_daily == 7
        assert service.keep_weekly == 4
        assert service.keep_monthly == 3

    @patch("bni.services.backup_service.call_command")
    def test_create_database_backup_success(self, mock_call_command, sample_backup_dir):
        """Test successful database backup creation."""
        # Mock dumpdata command output
        mock_call_command.return_value = None

        service = BackupService(backup_dir=sample_backup_dir)
        result = service.create_database_backup()

        # Verify result structure
        assert result["success"] is True
        assert result["type"] == "database"
        assert "path" in result
        assert "filename" in result
        assert "size" in result
        assert "size_mb" in result
        assert "timestamp" in result
        assert result["compressed"] is True

        # Verify file was created
        backup_file = Path(result["path"])
        assert backup_file.exists()
        assert backup_file.suffix == ".gz"

    @patch("bni.services.backup_service.call_command")
    def test_create_database_backup_handles_errors(self, mock_call_command, sample_backup_dir):
        """Test database backup handles errors gracefully."""
        # Mock call_command to raise an exception
        mock_call_command.side_effect = Exception("Database error")

        service = BackupService(backup_dir=sample_backup_dir)
        result = service.create_database_backup()

        assert result["success"] is False
        assert result["type"] == "database"
        assert "error" in result
        assert "Database error" in result["error"]

    @patch("os.path.exists")
    @patch("shutil.make_archive")
    def test_create_media_backup_success(self, mock_make_archive, mock_exists, sample_backup_dir):
        """Test successful media backup creation."""
        mock_exists.return_value = True
        mock_make_archive.return_value = f"{sample_backup_dir}/media_backup_test"

        # Create a fake backup file
        backup_path = Path(sample_backup_dir) / "media_backup_test.tar.gz"
        backup_path.write_text("fake backup")

        service = BackupService(backup_dir=sample_backup_dir)
        result = service.create_media_backup()

        assert result["success"] is True
        assert result["type"] == "media"
        assert result["compressed"] is True

    def test_create_media_backup_handles_missing_media_root(self, sample_backup_dir):
        """Test media backup handles missing MEDIA_ROOT."""
        with patch("bni.services.backup_service.settings") as mock_settings:
            mock_settings.MEDIA_ROOT = "/nonexistent/path"

            service = BackupService(backup_dir=sample_backup_dir)
            result = service.create_media_backup()

            assert result["success"] is False
            assert result["type"] == "media"
            assert "error" in result

    @patch("bni.services.backup_service.BackupService.create_database_backup")
    @patch("bni.services.backup_service.BackupService.create_media_backup")
    def test_create_full_backup(self, mock_media, mock_db, sample_backup_dir):
        """Test full backup creates both database and media backups."""
        # Mock successful backups
        mock_db.return_value = {
            "success": True,
            "type": "database",
            "size": 1024 * 1024,  # 1 MB
        }
        mock_media.return_value = {
            "success": True,
            "type": "media",
            "size": 2 * 1024 * 1024,  # 2 MB
        }

        service = BackupService(backup_dir=sample_backup_dir)
        result = service.create_full_backup()

        # Verify both backups were called
        mock_db.assert_called_once()
        mock_media.assert_called_once()

        # Verify result structure
        assert "backups" in result
        assert len(result["backups"]) == 2
        assert result["total_size"] == 3 * 1024 * 1024  # 3 MB
        assert result["total_size_mb"] == 3.0
        assert result["success_count"] == 2
        assert result["fail_count"] == 0
        assert result["all_success"] is True

    def test_cleanup_old_backups_removes_old_files(self, sample_backup_dir):
        """Test cleanup removes backups older than retention policy."""
        service = BackupService(backup_dir=sample_backup_dir)

        # Create fake backup files with different ages
        backup_dir = Path(sample_backup_dir)
        now = datetime.now()

        # Create old backup (should be deleted)
        old_date = now - timedelta(days=30)
        old_backup = backup_dir / f"db_backup_{old_date.strftime('%Y%m%d')}_120000.json.gz"
        old_backup.write_text("old backup")

        # Create recent backup (should be kept)
        recent_date = now - timedelta(days=3)
        recent_backup = backup_dir / f"db_backup_{recent_date.strftime('%Y%m%d')}_120000.json.gz"
        recent_backup.write_text("recent backup")

        result = service.cleanup_old_backups()

        # Old backup should be deleted
        assert not old_backup.exists()
        # Recent backup should be kept
        assert recent_backup.exists()

        # Verify result
        assert result["deleted_count"] == 1
        assert result["kept_count"] == 1

    def test_list_backups_returns_all_backups(self, sample_backup_dir):
        """Test list_backups returns all backup files with metadata."""
        service = BackupService(backup_dir=sample_backup_dir)

        # Create fake backups
        backup_dir = Path(sample_backup_dir)
        db_backup = backup_dir / "db_backup_20240101_120000.json.gz"
        db_backup.write_text("database backup")
        media_backup = backup_dir / "media_backup_20240101_120000.tar.gz"
        media_backup.write_text("media backup")

        backups = service.list_backups()

        assert len(backups) == 2
        # Verify structure
        for backup in backups:
            assert "filename" in backup
            assert "type" in backup
            assert "path" in backup
            assert "size" in backup
            assert "size_mb" in backup
            assert "created" in backup
            assert "age_days" in backup

        # Verify types
        types = {b["type"] for b in backups}
        assert "database" in types
        assert "media" in types

    @patch("bni.services.backup_service.call_command")
    def test_restore_database_backup_success(self, mock_call_command, sample_backup_dir):
        """Test successful database restoration."""
        service = BackupService(backup_dir=sample_backup_dir)

        # Create a fake backup file
        backup_dir = Path(sample_backup_dir)
        backup_file = backup_dir / "db_backup_20240101_120000.json.gz"
        with gzip.open(backup_file, "wt") as f:
            f.write('{"test": "data"}')

        result = service.restore_database_backup(backup_file.name)

        assert result["success"] is True
        assert result["backup_file"] == backup_file.name
        assert "timestamp" in result

        # Verify loaddata was called
        mock_call_command.assert_called_once()

    def test_restore_database_backup_file_not_found(self, sample_backup_dir):
        """Test restoration fails gracefully for missing backup file."""
        service = BackupService(backup_dir=sample_backup_dir)

        result = service.restore_database_backup("nonexistent_backup.gz")

        assert result["success"] is False
        assert "error" in result
        assert "not found" in result["error"].lower()

    @patch("bni.services.backup_service.call_command")
    def test_restore_database_backup_handles_errors(self, mock_call_command, sample_backup_dir):
        """Test restoration handles errors during loaddata."""
        mock_call_command.side_effect = Exception("Load error")

        service = BackupService(backup_dir=sample_backup_dir)

        # Create a fake backup file
        backup_dir = Path(sample_backup_dir)
        backup_file = backup_dir / "db_backup_20240101_120000.json.gz"
        with gzip.open(backup_file, "wt") as f:
            f.write('{"test": "data"}')

        result = service.restore_database_backup(backup_file.name)

        assert result["success"] is False
        assert "error" in result
        assert "Load error" in result["error"]
