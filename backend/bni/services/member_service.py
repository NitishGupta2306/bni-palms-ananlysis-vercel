"""
Member Service - Centralized member operations

This service provides a single source of truth for all member-related
operations including creation, updates, and deletion. Automatically handles
name normalization for consistent member identification.
"""
import logging
from typing import Dict, Any, Tuple, Optional
from datetime import date
from django.db import transaction
from django.core.exceptions import ValidationError
from members.models import Member
from chapters.models import Chapter

logger = logging.getLogger(__name__)


class MemberService:
    """Centralized service for member operations."""

    @staticmethod
    def get_or_create_member(
        chapter: Chapter,
        first_name: str,
        last_name: str,
        business_name: str = '',
        classification: str = '',
        email: str = '',
        phone: str = '',
        is_active: bool = True,
        joined_date: Optional[date] = None
    ) -> Tuple[Member, bool]:
        """
        Get an existing member or create a new one with automatic name normalization.

        Args:
            chapter: Chapter instance the member belongs to
            first_name: Member's first name (required)
            last_name: Member's last name (required)
            business_name: Business name (default: '')
            classification: Business classification (default: '')
            email: Email address (default: '')
            phone: Phone number (default: '')
            is_active: Active status (default: True)
            joined_date: Join date (default: None)

        Returns:
            Tuple of (Member instance, created boolean)

        Raises:
            ValidationError: If required fields are invalid
        """
        if not first_name or not first_name.strip():
            raise ValidationError("First name cannot be empty")
        if not last_name or not last_name.strip():
            raise ValidationError("Last name cannot be empty")

        first_name = first_name.strip()
        last_name = last_name.strip()

        # Use the model's normalize_name method for consistency
        normalized_name = Member.normalize_name(f"{first_name} {last_name}")

        try:
            member, created = Member.objects.get_or_create(
                chapter=chapter,
                normalized_name=normalized_name,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'business_name': business_name,
                    'classification': classification,
                    'email': email,
                    'phone': phone,
                    'is_active': is_active,
                    'joined_date': joined_date,
                }
            )

            if created:
                logger.info(f"Created new member: {member.full_name} in {chapter.name}")
            else:
                logger.debug(f"Found existing member: {member.full_name}")

            return member, created

        except Exception as e:
            logger.error(f"Error creating/getting member '{first_name} {last_name}': {str(e)}")
            raise

    @staticmethod
    def update_member(member_id: int, **kwargs) -> Tuple[Member, bool]:
        """
        Update an existing member.

        Automatically updates normalized_name if first_name or last_name changed.

        Args:
            member_id: Member ID
            **kwargs: Fields to update

        Returns:
            Tuple of (Updated Member instance, updated boolean)

        Raises:
            Member.DoesNotExist: If member not found
            ValidationError: If update data is invalid
        """
        try:
            member = Member.objects.get(id=member_id)
            updated = False

            # Track if names changed
            name_changed = False

            # Update allowed fields
            allowed_fields = [
                'first_name', 'last_name', 'business_name', 'classification',
                'email', 'phone', 'is_active', 'joined_date'
            ]

            for field, value in kwargs.items():
                if field in allowed_fields:
                    old_value = getattr(member, field)
                    if old_value != value:
                        setattr(member, field, value)
                        updated = True
                        if field in ['first_name', 'last_name']:
                            name_changed = True

            # Update normalized_name if names changed
            if name_changed:
                member.normalized_name = Member.normalize_name(
                    f"{member.first_name} {member.last_name}"
                )

            if updated:
                # Validate before saving
                member.full_clean()
                member.save()
                logger.info(f"Updated member: {member.full_name} (ID: {member_id})")

            return member, updated

        except Member.DoesNotExist:
            logger.error(f"Member with ID {member_id} not found")
            raise
        except ValidationError as e:
            logger.error(f"Validation error updating member {member_id}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error updating member {member_id}: {str(e)}")
            raise

    @staticmethod
    @transaction.atomic
    def delete_member(member_id: int) -> Dict[str, Any]:
        """
        Delete a member and all related data.

        Args:
            member_id: Member ID

        Returns:
            Dictionary with deletion results

        Raises:
            Member.DoesNotExist: If member not found
        """
        try:
            member = Member.objects.get(id=member_id)
            member_name = member.full_name
            chapter_name = member.chapter.name

            # Get counts before deletion
            referrals_given = member.referrals_given.count()
            referrals_received = member.referrals_received.count()
            one_to_ones = (member.one_to_ones_as_member1.count() +
                          member.one_to_ones_as_member2.count())
            tyfcbs = member.tyfcbs_received.count()

            # Delete the member (cascade will handle related objects)
            member.delete()

            logger.info(f"Deleted member: {member_name} from {chapter_name}")

            return {
                'success': True,
                'member_name': member_name,
                'chapter_name': chapter_name,
                'referrals_deleted': referrals_given + referrals_received,
                'one_to_ones_deleted': one_to_ones,
                'tyfcbs_deleted': tyfcbs,
            }

        except Member.DoesNotExist:
            logger.error(f"Member with ID {member_id} not found")
            raise
        except Exception as e:
            logger.error(f"Error deleting member {member_id}: {str(e)}")
            raise

    @staticmethod
    def get_member(member_id: int) -> Member:
        """
        Get a member by ID.

        Args:
            member_id: Member ID

        Returns:
            Member instance

        Raises:
            Member.DoesNotExist: If member not found
        """
        try:
            return Member.objects.get(id=member_id)
        except Member.DoesNotExist:
            logger.error(f"Member with ID {member_id} not found")
            raise

    @staticmethod
    def get_chapter_members(chapter: Chapter, active_only: bool = True) -> list:
        """
        Get all members for a chapter.

        Args:
            chapter: Chapter instance
            active_only: If True, only return active members (default: True)

        Returns:
            QuerySet of members
        """
        queryset = Member.objects.filter(chapter=chapter)
        if active_only:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('first_name', 'last_name')
