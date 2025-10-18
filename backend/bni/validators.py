"""
Input validators for the BNI PALMS application.

This module provides comprehensive validation for all user inputs to ensure
data integrity and prevent security issues.
"""

from typing import Optional
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator, RegexValidator
from rest_framework import serializers
import re


# ==============================================================================
# FILE UPLOAD VALIDATORS
# ==============================================================================

# File size limits
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB

# Allowed file extensions
ALLOWED_EXCEL_EXTENSIONS = ['.xls', '.xlsx']
ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif']


def validate_excel_file(file):
    """
    Validate uploaded Excel file.

    Args:
        file: UploadedFile object

    Raises:
        ValidationError: If file is invalid
    """
    # Check file exists
    if not file:
        raise ValidationError("File is required")

    # Check file size
    if file.size > MAX_FILE_SIZE:
        raise ValidationError(
            f"File size ({file.size / (1024*1024):.1f}MB) exceeds maximum allowed size ({MAX_FILE_SIZE / (1024*1024):.0f}MB)"
        )

    # Check file extension
    if not any(file.name.lower().endswith(ext) for ext in ALLOWED_EXCEL_EXTENSIONS):
        raise ValidationError(
            f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXCEL_EXTENSIONS)}"
        )

    # Check filename for dangerous characters
    if re.search(r'[<>:"/\\|?*]', file.name):
        raise ValidationError("Filename contains invalid characters")


def validate_image_file(file):
    """
    Validate uploaded image file.

    Args:
        file: UploadedFile object

    Raises:
        ValidationError: If file is invalid
    """
    if not file:
        raise ValidationError("Image file is required")

    if file.size > MAX_IMAGE_SIZE:
        raise ValidationError(
            f"Image size exceeds maximum allowed size ({MAX_IMAGE_SIZE / (1024*1024):.0f}MB)"
        )

    if not any(file.name.lower().endswith(ext) for ext in ALLOWED_IMAGE_EXTENSIONS):
        raise ValidationError(
            f"Invalid image type. Allowed types: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )


# ==============================================================================
# PASSWORD VALIDATORS
# ==============================================================================

MIN_PASSWORD_LENGTH = 8
REQUIRE_UPPERCASE = True
REQUIRE_LOWERCASE = True
REQUIRE_DIGIT = True
REQUIRE_SPECIAL_CHAR = False  # Can be enabled later


def validate_password_strength(password: str) -> None:
    """
    Validate password meets strength requirements.

    Args:
        password: Password string to validate

    Raises:
        ValidationError: If password doesn't meet requirements
    """
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValidationError(
            f"Password must be at least {MIN_PASSWORD_LENGTH} characters long"
        )

    if REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        raise ValidationError("Password must contain at least one uppercase letter")

    if REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
        raise ValidationError("Password must contain at least one lowercase letter")

    if REQUIRE_DIGIT and not re.search(r'\d', password):
        raise ValidationError("Password must contain at least one number")

    if REQUIRE_SPECIAL_CHAR and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise ValidationError("Password must contain at least one special character")


# ==============================================================================
# FIELD VALIDATORS (for Django models)
# ==============================================================================

# Name validator - allows letters, spaces, hyphens, apostrophes
name_validator = RegexValidator(
    regex=r"^[a-zA-Z\s\'-]+$",
    message="Name can only contain letters, spaces, hyphens, and apostrophes",
    code="invalid_name"
)

# Phone validator - flexible international format
phone_validator = RegexValidator(
    regex=r'^\+?1?\d{9,15}$',
    message="Enter a valid phone number (9-15 digits, optional + prefix)",
    code="invalid_phone"
)

# Business name validator - allows alphanumeric and common business characters
business_name_validator = RegexValidator(
    regex=r"^[a-zA-Z0-9\s\-&'.,()]+$",
    message="Business name contains invalid characters",
    code="invalid_business_name"
)

# Classification validator - alphanumeric only
classification_validator = RegexValidator(
    regex=r"^[a-zA-Z0-9\s\-/]+$",
    message="Classification contains invalid characters",
    code="invalid_classification"
)


# ==============================================================================
# DATA VALIDATORS
# ==============================================================================

def validate_month_year(value: str) -> None:
    """
    Validate month_year format (YYYY-MM).

    Args:
        value: String in format YYYY-MM

    Raises:
        ValidationError: If format is invalid
    """
    if not re.match(r'^\d{4}-\d{2}$', value):
        raise ValidationError("Month year must be in format YYYY-MM (e.g., 2025-01)")

    year, month = value.split('-')
    year = int(year)
    month = int(month)

    if year < 2000 or year > 2100:
        raise ValidationError("Year must be between 2000 and 2100")

    if month < 1 or month > 12:
        raise ValidationError("Month must be between 01 and 12")


def validate_positive_number(value: float) -> None:
    """
    Validate that a number is positive.

    Args:
        value: Number to validate

    Raises:
        ValidationError: If value is negative
    """
    if value < 0:
        raise ValidationError("Value must be positive")


def validate_percentage(value: float) -> None:
    """
    Validate that a value is a valid percentage (0-100).

    Args:
        value: Percentage to validate

    Raises:
        ValidationError: If value is not between 0 and 100
    """
    if value < 0 or value > 100:
        raise ValidationError("Percentage must be between 0 and 100")


def validate_currency_amount(value: float) -> None:
    """
    Validate currency amount (positive, max 2 decimal places).

    Args:
        value: Currency amount

    Raises:
        ValidationError: If value is invalid
    """
    if value < 0:
        raise ValidationError("Amount must be positive")

    # Check decimal places
    decimal_str = str(value).split('.')
    if len(decimal_str) > 1 and len(decimal_str[1]) > 2:
        raise ValidationError("Amount can have maximum 2 decimal places")


# ==============================================================================
# SERIALIZER VALIDATORS
# ==============================================================================

class PasswordStrengthValidator:
    """
    Custom serializer validator for password strength.

    Usage:
        password = serializers.CharField(validators=[PasswordStrengthValidator()])
    """

    def __call__(self, value):
        try:
            validate_password_strength(value)
        except ValidationError as e:
            raise serializers.ValidationError(str(e))


class ExcelFileValidator:
    """
    Custom serializer validator for Excel file uploads.

    Usage:
        file = serializers.FileField(validators=[ExcelFileValidator()])
    """

    def __call__(self, value):
        try:
            validate_excel_file(value)
        except ValidationError as e:
            raise serializers.ValidationError(str(e))


# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def sanitize_filename(filename: str) -> str:
    """
    Sanitize uploaded filename to prevent directory traversal attacks.

    Args:
        filename: Original filename

    Returns:
        Sanitized filename safe for storage
    """
    # Remove path components
    filename = filename.split('/')[-1].split('\\')[-1]

    # Remove dangerous characters
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)

    # Limit length
    if len(filename) > 255:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        filename = name[:250] + ('.' + ext if ext else '')

    return filename


def validate_json_structure(data: dict, required_keys: list) -> None:
    """
    Validate that a JSON object contains required keys.

    Args:
        data: Dictionary to validate
        required_keys: List of required key names

    Raises:
        ValidationError: If required keys are missing
    """
    missing_keys = [key for key in required_keys if key not in data]
    if missing_keys:
        raise ValidationError(
            f"Missing required fields: {', '.join(missing_keys)}"
        )
