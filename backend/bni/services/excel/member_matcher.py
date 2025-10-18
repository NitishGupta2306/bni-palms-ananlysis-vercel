"""
Member Matching Module

Handles member lookup and fuzzy name matching for Excel processing.
Extracted from processor.py to improve maintainability.
"""

import pandas as pd
from typing import Dict, Optional
import logging

from members.models import Member

logger = logging.getLogger(__name__)


class MemberMatcher:
    """Handles member lookup and fuzzy name matching."""

    def __init__(self, chapter):
        """
        Initialize member matcher for a chapter.

        Args:
            chapter: Chapter instance to match members for
        """
        self.chapter = chapter
        self.warnings = []

    def get_members_lookup(self) -> Dict[str, Member]:
        """
        Create a lookup dictionary for chapter members by normalized name.

        Optimized with .only() and select_related to minimize database queries.

        Returns:
            Dictionary mapping normalized names to Member objects
        """
        # Only fetch required fields and prefetch chapter to minimize queries
        members = (
            Member.objects.filter(chapter=self.chapter, is_active=True)
            .select_related("chapter")
            .only("id", "first_name", "last_name", "normalized_name", "chapter_id")
        )

        lookup = {}

        for member in members:
            # Add by normalized name
            lookup[member.normalized_name] = member

            # Also add variations for fuzzy matching
            full_name = f"{member.first_name} {member.last_name}".lower().strip()
            lookup[full_name] = member

            # Add first name only for common cases
            if member.first_name.lower() not in lookup:
                lookup[member.first_name.lower()] = member

        return lookup

    def find_member_by_name(
        self, name: str, lookup: Dict[str, Member]
    ) -> Optional[Member]:
        """
        Find a member by name using fuzzy matching.

        Args:
            name: Name to search for
            lookup: Pre-built member lookup dictionary

        Returns:
            Member object if found, None otherwise
        """
        if not name or pd.isna(name):
            return None

        name = str(name).strip()
        if not name:
            return None

        # Try exact normalized match first
        normalized = Member.normalize_name(name)
        if normalized in lookup:
            return lookup[normalized]

        # Try variations
        variations = [
            name.lower(),
            " ".join(name.lower().split()),
        ]

        for variation in variations:
            if variation in lookup:
                return lookup[variation]

        # Log unmatched names for debugging
        self.warnings.append(f"Could not find member: '{name}'")
        return None

    def get_warnings(self) -> list:
        """
        Get list of warnings generated during matching.

        Returns:
            List of warning messages
        """
        return self.warnings

    def clear_warnings(self):
        """Clear warnings list."""
        self.warnings = []
