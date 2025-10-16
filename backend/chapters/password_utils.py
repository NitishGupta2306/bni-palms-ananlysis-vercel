"""
Password hashing utilities for BNI Analytics.

Uses bcrypt for secure password hashing.
"""

import bcrypt


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password to hash

    Returns:
        Hashed password as a string
    """
    if not password:
        raise ValueError("Password cannot be empty")

    # Generate a salt and hash the password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)

    # Return as string (stored in database)
    return hashed.decode('utf-8')


def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hashed password.

    Args:
        password: Plain text password to verify
        hashed_password: Hashed password from database

    Returns:
        True if password matches, False otherwise
    """
    if not password or not hashed_password:
        return False

    try:
        # bcrypt handles the comparison securely
        return bcrypt.checkpw(
            password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except (ValueError, AttributeError):
        # Invalid hash format or encoding error
        return False


def is_hashed(password: str) -> bool:
    """
    Check if a password is already hashed (bcrypt format).

    Args:
        password: Password string to check

    Returns:
        True if password appears to be a bcrypt hash, False otherwise
    """
    # Bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 characters long
    if not password or len(password) != 60:
        return False

    return password.startswith(('$2a$', '$2b$', '$2y$'))
