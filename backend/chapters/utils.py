"""
JWT authentication utilities for BNI Analytics.
"""

import jwt
from datetime import datetime, timedelta
from django.conf import settings


# JWT Secret - use Django's SECRET_KEY
JWT_SECRET = settings.SECRET_KEY
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


def generate_chapter_token(chapter_id):
    """
    Generate a JWT token for chapter authentication.

    Args:
        chapter_id: The ID of the chapter

    Returns:
        str: JWT token string
    """
    payload = {
        "chapter_id": str(chapter_id),
        "is_admin": False,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow(),
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def generate_admin_token():
    """
    Generate a JWT token for admin authentication.

    Returns:
        str: JWT token string
    """
    payload = {
        "is_admin": True,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow(),
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def verify_token(token):
    """
    Verify and decode a JWT token.

    Args:
        token: JWT token string

    Returns:
        dict: Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token


def extract_token_from_header(auth_header):
    """
    Extract JWT token from Authorization header.

    Args:
        auth_header: Authorization header value (e.g., "Bearer <token>")

    Returns:
        str: Token string or None if invalid format
    """
    if not auth_header:
        return None

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    return parts[1]
