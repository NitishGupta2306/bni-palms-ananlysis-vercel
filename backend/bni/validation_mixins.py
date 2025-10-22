"""
Validation mixins and decorators for ViewSets.

This module provides reusable validation logic that can be easily applied
to API views and ViewSets to ensure consistent input validation across the application.
"""

from functools import wraps
from typing import Callable
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError

from bni.validators import (
    validate_excel_file,
    validate_password_strength,
    validate_month_year,
    sanitize_filename,
)


def validate_file_upload(file_field_name: str = 'file'):
    """
    Decorator to validate file uploads before processing.

    Args:
        file_field_name: Name of the file field in request.FILES

    Usage:
        @validate_file_upload('slip_audit_file')
        def upload_excel(self, request):
            # File is already validated here
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            # Check if file exists
            file = request.FILES.get(file_field_name)
            if not file:
                return Response(
                    {"error": f"'{file_field_name}' is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate file
            try:
                validate_excel_file(file)
            except ValidationError as e:
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Sanitize filename
            file.name = sanitize_filename(file.name)

            return func(self, request, *args, **kwargs)
        return wrapper
    return decorator


def validate_multiple_files(file_field_name: str = 'files'):
    """
    Decorator to validate multiple file uploads.

    Args:
        file_field_name: Name of the file list field in request.FILES

    Usage:
        @validate_multiple_files('slip_audit_files')
        def bulk_upload(self, request):
            # All files are validated here
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            # Get file list
            files = request.FILES.getlist(file_field_name)
            if not files:
                return Response(
                    {"error": f"At least one file is required in '{file_field_name}'"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate each file
            for file in files:
                try:
                    validate_excel_file(file)
                except ValidationError as e:
                    return Response(
                        {"error": f"Invalid file '{file.name}': {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Sanitize filename
                file.name = sanitize_filename(file.name)

            return func(self, request, *args, **kwargs)
        return wrapper
    return decorator


def validate_required_fields(*field_names: str):
    """
    Decorator to validate that required fields are present in request.data.

    Args:
        field_names: Variable number of required field names

    Usage:
        @validate_required_fields('chapter_id', 'month_year')
        def create_report(self, request):
            # Required fields are present
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            missing_fields = []
            for field_name in field_names:
                if field_name not in request.data or not request.data.get(field_name):
                    missing_fields.append(field_name)

            if missing_fields:
                return Response(
                    {
                        "error": "Missing required fields",
                        "missing_fields": missing_fields
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            return func(self, request, *args, **kwargs)
        return wrapper
    return decorator


def validate_month_year_param(param_name: str = 'month_year'):
    """
    Decorator to validate month_year parameter format.

    Args:
        param_name: Name of the month_year parameter

    Usage:
        @validate_month_year_param('month_year')
        def get_report(self, request):
            # month_year is validated
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            month_year = request.data.get(param_name) or request.query_params.get(param_name)

            if month_year:
                try:
                    validate_month_year(month_year)
                except ValidationError as e:
                    return Response(
                        {"error": f"Invalid {param_name}: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            return func(self, request, *args, **kwargs)
        return wrapper
    return decorator


class ValidationMixin:
    """
    Mixin class that provides validation helper methods to ViewSets.

    Usage:
        class MyViewSet(ValidationMixin, viewsets.ViewSet):
            def my_action(self, request):
                # Validate request data
                errors = self.validate_request_data(request, ['field1', 'field2'])
                if errors:
                    return self.validation_error_response(errors)
                ...
    """

    def validate_request_data(self, request, required_fields: list) -> dict:
        """
        Validate that required fields are present in request data.

        Args:
            request: Django REST framework request object
            required_fields: List of required field names

        Returns:
            Dictionary of validation errors (empty if valid)
        """
        errors = {}
        for field in required_fields:
            if field not in request.data or not request.data.get(field):
                errors[field] = f"This field is required"

        return errors

    def validate_files(self, request, file_fields: list) -> dict:
        """
        Validate uploaded files.

        Args:
            request: Django REST framework request object
            file_fields: List of file field names to validate

        Returns:
            Dictionary of validation errors (empty if valid)
        """
        errors = {}
        for field in file_fields:
            file = request.FILES.get(field)
            if file:
                try:
                    validate_excel_file(file)
                    # Sanitize filename
                    file.name = sanitize_filename(file.name)
                except ValidationError as e:
                    errors[field] = str(e)

        return errors

    def validation_error_response(self, errors: dict, status_code: int = status.HTTP_400_BAD_REQUEST) -> Response:
        """
        Create a standardized validation error response.

        Args:
            errors: Dictionary of field names to error messages
            status_code: HTTP status code (default: 400)

        Returns:
            DRF Response object with error details
        """
        return Response(
            {
                "error": "Validation failed",
                "details": errors
            },
            status=status_code
        )

    def validate_password_field(self, password: str) -> str:
        """
        Validate password strength.

        Args:
            password: Password string to validate

        Returns:
            Error message if invalid, empty string if valid
        """
        try:
            validate_password_strength(password)
            return ""
        except ValidationError as e:
            return str(e)
