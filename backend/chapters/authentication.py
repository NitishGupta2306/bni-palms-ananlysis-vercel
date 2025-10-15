"""
Custom authentication classes for BNI Analytics.

Implements JWT-based authentication for chapters and admin users.
"""

from rest_framework import authentication, exceptions
from chapters.utils import verify_token, extract_token_from_header
from chapters.models import Chapter


class JWTAuthentication(authentication.BaseAuthentication):
    """
    JWT token-based authentication.

    Clients should authenticate by passing the token in the Authorization header:
        Authorization: Bearer <token>
    """

    def authenticate(self, request):
        """
        Authenticate the request and return a two-tuple of (user, token).

        Returns:
            tuple: (auth_object, token_payload) or None if not authenticated
        """
        auth_header = request.META.get('HTTP_AUTHORIZATION')

        if not auth_header:
            return None  # No authentication attempted

        token = extract_token_from_header(auth_header)

        if not token:
            raise exceptions.AuthenticationFailed('Invalid token format. Use: Bearer <token>')

        payload = verify_token(token)

        if not payload:
            raise exceptions.AuthenticationFailed('Invalid or expired token')

        # Create an authentication object with the payload
        auth_object = JWTAuthObject(payload)

        return (auth_object, payload)

    def authenticate_header(self, request):
        """
        Return the WWW-Authenticate header for 401 responses.
        """
        return 'Bearer realm="api"'


class JWTAuthObject:
    """
    Represents an authenticated user from JWT token.

    This is a simple object that holds authentication info without
    requiring a Django User model.
    """

    def __init__(self, payload):
        self.payload = payload
        self.is_admin = payload.get('is_admin', False)
        self.chapter_id = payload.get('chapter_id')
        self.is_authenticated = True

    def __str__(self):
        if self.is_admin:
            return 'Admin'
        return f'Chapter {self.chapter_id}'

    @property
    def is_chapter(self):
        """Check if this is a chapter authentication."""
        return not self.is_admin and self.chapter_id is not None
