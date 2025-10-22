"""
Chapter Service - Centralized chapter operations

This service provides a single source of truth for all chapter-related
operations including creation, updates, and deletion.
"""
import logging
from typing import Dict, Any, Tuple, Optional
from django.db import transaction
from django.core.exceptions import ValidationError
from chapters.models import Chapter

logger = logging.getLogger(__name__)


class ChapterService:
    """Centralized service for chapter operations."""

    @staticmethod
    def get_or_create_chapter(
        name: str,
        location: str = 'Dubai',
        meeting_day: str = '',
        meeting_time: Optional[str] = None
    ) -> Tuple[Chapter, bool]:
        """
        Get an existing chapter or create a new one.

        Args:
            name: Chapter name (required)
            location: Chapter location (default: 'Dubai')
            meeting_day: Meeting day (default: '')
            meeting_time: Meeting time (default: None)

        Returns:
            Tuple of (Chapter instance, created boolean)

        Raises:
            ValidationError: If chapter name is invalid
        """
        if not name or not name.strip():
            raise ValidationError("Chapter name cannot be empty")

        name = name.strip()

        try:
            chapter, created = Chapter.objects.get_or_create(
                name=name,
                defaults={
                    'location': location,
                    'meeting_day': meeting_day,
                    'meeting_time': meeting_time,
                }
            )

            if created:
                logger.info(f"Created new chapter: {name}")
            else:
                logger.debug(f"Found existing chapter: {name}")

            return chapter, created

        except Exception as e:
            logger.error(f"Error creating/getting chapter '{name}': {str(e)}")
            raise

    @staticmethod
    @transaction.atomic
    def update_chapter(chapter_id: int, **kwargs) -> Chapter:
        """
        Update an existing chapter.

        Uses @transaction.atomic to ensure all updates and validation complete
        successfully or rollback entirely.

        Args:
            chapter_id: Chapter ID
            **kwargs: Fields to update (name, location, meeting_day, meeting_time)

        Returns:
            Updated Chapter instance

        Raises:
            Chapter.DoesNotExist: If chapter not found
            ValidationError: If update data is invalid
        """
        try:
            chapter = Chapter.objects.get(id=chapter_id)

            # Update allowed fields
            allowed_fields = ['name', 'location', 'meeting_day', 'meeting_time']
            for field, value in kwargs.items():
                if field in allowed_fields:
                    setattr(chapter, field, value)

            # Validate before saving
            chapter.full_clean()
            chapter.save()

            logger.info(f"Updated chapter: {chapter.name} (ID: {chapter_id})")
            return chapter

        except Chapter.DoesNotExist:
            logger.error(f"Chapter with ID {chapter_id} not found")
            raise
        except ValidationError as e:
            logger.error(f"Validation error updating chapter {chapter_id}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error updating chapter {chapter_id}: {str(e)}")
            raise

    @staticmethod
    @transaction.atomic
    def delete_chapter(chapter_id: int) -> Dict[str, Any]:
        """
        Delete a chapter and all related data.

        Args:
            chapter_id: Chapter ID

        Returns:
            Dictionary with deletion results

        Raises:
            Chapter.DoesNotExist: If chapter not found
        """
        try:
            chapter = Chapter.objects.get(id=chapter_id)
            chapter_name = chapter.name

            # Get counts before deletion
            members_count = chapter.members.count()

            # Delete the chapter (cascade will handle related objects)
            chapter.delete()

            logger.info(f"Deleted chapter: {chapter_name} (ID: {chapter_id})")

            return {
                'success': True,
                'chapter_name': chapter_name,
                'members_deleted': members_count,
            }

        except Chapter.DoesNotExist:
            logger.error(f"Chapter with ID {chapter_id} not found")
            raise
        except Exception as e:
            logger.error(f"Error deleting chapter {chapter_id}: {str(e)}")
            raise

    @staticmethod
    def get_chapter(chapter_id: int) -> Chapter:
        """
        Get a chapter by ID.

        Args:
            chapter_id: Chapter ID

        Returns:
            Chapter instance

        Raises:
            Chapter.DoesNotExist: If chapter not found
        """
        try:
            return Chapter.objects.get(id=chapter_id)
        except Chapter.DoesNotExist:
            logger.error(f"Chapter with ID {chapter_id} not found")
            raise

    @staticmethod
    def list_chapters() -> list:
        """
        Get all chapters ordered by name.

        Returns:
            QuerySet of all chapters
        """
        return Chapter.objects.all().order_by('name')
