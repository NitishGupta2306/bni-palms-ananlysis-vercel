"""
Custom permission classes for BNI Analytics.

Defines fine-grained permissions for different user types.
"""

from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Permission class for admin-only endpoints.

    Allows access only to users authenticated with admin JWT token.
    """

    message = 'Admin authentication required'

    def has_permission(self, request, view):
        """Check if user is authenticated as admin."""
        if not request.user or not hasattr(request.user, 'is_admin'):
            return False

        return request.user.is_admin


class IsChapterOrAdmin(permissions.BasePermission):
    """
    Permission class for chapter-specific endpoints.

    Allows access to:
    - Admins (can access all chapters)
    - Chapter users (can only access their own chapter)
    """

    message = 'Authentication required'

    def has_permission(self, request, view):
        """Check if user is authenticated."""
        if not request.user or not hasattr(request.user, 'is_authenticated'):
            return False

        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """
        Check if user can access this specific object.

        Args:
            obj: The object being accessed (usually a Chapter)
        """
        # Admins can access everything
        if hasattr(request.user, 'is_admin') and request.user.is_admin:
            return True

        # Chapter users can only access their own chapter
        if hasattr(request.user, 'chapter_id'):
            # Get chapter ID from object
            if hasattr(obj, 'id'):
                return str(obj.id) == str(request.user.chapter_id)
            elif hasattr(obj, 'chapter_id'):
                return str(obj.chapter_id) == str(request.user.chapter_id)
            elif hasattr(obj, 'chapter'):
                return str(obj.chapter.id) == str(request.user.chapter_id)

        return False


class IsOwnerChapter(permissions.BasePermission):
    """
    Permission class for chapter-owned resources.

    Only allows access to resources owned by the authenticated chapter.
    Admins can access all resources.
    """

    message = 'You can only access your own chapter resources'

    def has_permission(self, request, view):
        """Check if user is authenticated."""
        if not request.user or not hasattr(request.user, 'is_authenticated'):
            return False

        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Check if user owns this resource."""
        # Admins can access everything
        if hasattr(request.user, 'is_admin') and request.user.is_admin:
            return True

        # Chapter users can only access their own resources
        if hasattr(request.user, 'chapter_id'):
            # Handle different object types
            if hasattr(obj, 'chapter_id'):
                return str(obj.chapter_id) == str(request.user.chapter_id)
            elif hasattr(obj, 'chapter'):
                return str(obj.chapter.id) == str(request.user.chapter_id)
            elif hasattr(obj, 'giver') and hasattr(obj.giver, 'chapter_id'):
                return str(obj.giver.chapter_id) == str(request.user.chapter_id)

        return False


class ReadOnly(permissions.BasePermission):
    """
    Permission class for read-only access.

    Allows GET, HEAD, OPTIONS requests for authenticated users.
    """

    message = 'Read-only access'

    def has_permission(self, request, view):
        """Allow read-only access to authenticated users."""
        if not request.user or not hasattr(request.user, 'is_authenticated'):
            return False

        if not request.user.is_authenticated:
            return False

        # Allow safe methods for everyone
        return request.method in permissions.SAFE_METHODS
