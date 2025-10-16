"""
Standardized Exception Handling for BNI PALMS Analytics.

Provides centralized error types, standardized response format,
and utility functions for consistent error handling across the application.
"""

import logging
from typing import Any, Dict, Optional
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError

logger = logging.getLogger(__name__)


# ============================================================================
# Custom Exception Classes
# ============================================================================

class BNIBaseException(Exception):
    """Base exception for all BNI PALMS application exceptions."""

    def __init__(
        self,
        message: str,
        code: str = "error",
        details: Optional[Dict[str, Any]] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ):
        self.message = message
        self.code = code
        self.details = details or {}
        self.status_code = status_code
        super().__init__(self.message)


class ValidationException(BNIBaseException):
    """Raised when data validation fails."""

    def __init__(self, message: str, field: Optional[str] = None, **kwargs):
        details = kwargs.pop("details", {})
        if field:
            details["field"] = field
        super().__init__(
            message=message,
            code="validation_error",
            details=details,
            status_code=status.HTTP_400_BAD_REQUEST,
            **kwargs,
        )


class ResourceNotFoundException(BNIBaseException):
    """Raised when a requested resource is not found."""

    def __init__(self, resource_type: str, resource_id: Any = None, **kwargs):
        message = f"{resource_type} not found"
        if resource_id:
            message += f" (ID: {resource_id})"

        details = {
            "resource_type": resource_type,
            "resource_id": str(resource_id) if resource_id else None,
        }

        super().__init__(
            message=message,
            code="not_found",
            details=details,
            status_code=status.HTTP_404_NOT_FOUND,
            **kwargs,
        )


class PermissionDeniedException(BNIBaseException):
    """Raised when user lacks required permissions."""

    def __init__(self, message: str = "Permission denied", action: Optional[str] = None, **kwargs):
        details = {}
        if action:
            details["required_action"] = action

        super().__init__(
            message=message,
            code="permission_denied",
            details=details,
            status_code=status.HTTP_403_FORBIDDEN,
            **kwargs,
        )


class AuthenticationException(BNIBaseException):
    """Raised when authentication fails."""

    def __init__(self, message: str = "Authentication required", **kwargs):
        super().__init__(
            message=message,
            code="authentication_error",
            status_code=status.HTTP_401_UNAUTHORIZED,
            **kwargs,
        )


class ProcessingException(BNIBaseException):
    """Raised when data processing fails (Excel, file handling, etc.)."""

    def __init__(self, message: str, operation: Optional[str] = None, **kwargs):
        details = kwargs.pop("details", {})
        if operation:
            details["operation"] = operation

        super().__init__(
            message=message,
            code="processing_error",
            details=details,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            **kwargs,
        )


class DatabaseException(BNIBaseException):
    """Raised when database operations fail."""

    def __init__(self, message: str = "Database operation failed", **kwargs):
        super().__init__(
            message=message,
            code="database_error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            **kwargs,
        )


class RateLimitException(BNIBaseException):
    """Raised when rate limit is exceeded."""

    def __init__(
        self,
        message: str = "Too many requests",
        retry_after: Optional[int] = None,
        **kwargs
    ):
        details = {}
        if retry_after:
            details["retry_after_minutes"] = retry_after

        super().__init__(
            message=message,
            code="rate_limit_exceeded",
            details=details,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            **kwargs,
        )


# ============================================================================
# Standardized Error Response Builder
# ============================================================================

def build_error_response(
    message: str,
    code: str = "error",
    status_code: int = status.HTTP_400_BAD_REQUEST,
    details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None,
) -> Response:
    """
    Build a standardized error response.

    Args:
        message: Human-readable error message
        code: Machine-readable error code
        status_code: HTTP status code
        details: Additional error details (optional)
        request_id: Request ID for tracking (optional)

    Returns:
        Response object with standardized error format

    Example:
        >>> build_error_response(
        ...     message="Chapter not found",
        ...     code="not_found",
        ...     status_code=404,
        ...     details={"chapter_id": 5}
        ... )
    """
    error_data = {
        "success": False,
        "error": {
            "message": message,
            "code": code,
        },
    }

    if details:
        error_data["error"]["details"] = details

    if request_id:
        error_data["request_id"] = request_id

    return Response(error_data, status=status_code)


def build_success_response(
    data: Any,
    message: Optional[str] = None,
    status_code: int = status.HTTP_200_OK,
) -> Response:
    """
    Build a standardized success response.

    Args:
        data: Response data
        message: Optional success message
        status_code: HTTP status code

    Returns:
        Response object with standardized success format

    Example:
        >>> build_success_response(
        ...     data={"id": 1, "name": "Dubai Business Bay"},
        ...     message="Chapter created successfully"
        ... )
    """
    response_data = {
        "success": True,
        "data": data,
    }

    if message:
        response_data["message"] = message

    return Response(response_data, status=status_code)


# ============================================================================
# Exception Handler (DRF Integration)
# ============================================================================

def custom_exception_handler(exc, context):
    """
    Custom exception handler for Django REST Framework.

    Handles both DRF exceptions and our custom BNI exceptions,
    providing consistent error response format and logging.

    Args:
        exc: The exception instance
        context: Exception context (includes view, request, etc.)

    Returns:
        Response object with standardized error format
    """
    # Get the request for logging context
    request = context.get("request")
    view = context.get("view")

    # Extract request ID if available
    request_id = getattr(request, "id", None) if request else None

    # Handle custom BNI exceptions
    if isinstance(exc, BNIBaseException):
        logger.warning(
            f"BNI Exception: {exc.code} - {exc.message}",
            extra={
                "code": exc.code,
                "details": exc.details,
                "view": view.__class__.__name__ if view else None,
                "request_id": request_id,
            },
        )

        return build_error_response(
            message=exc.message,
            code=exc.code,
            status_code=exc.status_code,
            details=exc.details,
            request_id=request_id,
        )

    # Handle Django validation errors
    if isinstance(exc, DjangoValidationError):
        logger.warning(f"Validation Error: {str(exc)}")
        return build_error_response(
            message="Validation failed",
            code="validation_error",
            status_code=status.HTTP_400_BAD_REQUEST,
            details={"validation_errors": exc.message_dict if hasattr(exc, "message_dict") else str(exc)},
            request_id=request_id,
        )

    # Handle database integrity errors
    if isinstance(exc, IntegrityError):
        logger.error(f"Database Integrity Error: {str(exc)}")
        return build_error_response(
            message="Database integrity error",
            code="integrity_error",
            status_code=status.HTTP_409_CONFLICT,
            details={"error": str(exc)},
            request_id=request_id,
        )

    # Use DRF's default exception handler for other cases
    response = drf_exception_handler(exc, context)

    if response is not None:
        # Wrap DRF error response in our standard format
        error_message = "An error occurred"
        error_code = "error"

        if isinstance(response.data, dict):
            # Extract message from DRF response
            if "detail" in response.data:
                error_message = response.data["detail"]
                error_code = response.data.get("code", "error")
            elif "error" in response.data:
                error_message = response.data["error"]

        # Log the error
        logger.warning(
            f"DRF Exception: {exc.__class__.__name__} - {error_message}",
            extra={
                "view": view.__class__.__name__ if view else None,
                "request_id": request_id,
            },
        )

        return build_error_response(
            message=error_message,
            code=error_code,
            status_code=response.status_code,
            details={"original_error": response.data} if isinstance(response.data, dict) else None,
            request_id=request_id,
        )

    # Unhandled exception - log as error
    logger.exception(
        f"Unhandled exception: {exc.__class__.__name__}",
        extra={
            "view": view.__class__.__name__ if view else None,
            "request_id": request_id,
        },
    )

    # Return generic 500 error
    return build_error_response(
        message="An unexpected error occurred",
        code="internal_server_error",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        request_id=request_id,
    )


# ============================================================================
# Utility Functions
# ============================================================================

def handle_not_found(resource_type: str, resource_id: Any = None) -> Response:
    """
    Shortcut for 404 not found responses.

    Args:
        resource_type: Type of resource (e.g., "Chapter", "Member")
        resource_id: ID of the resource (optional)

    Returns:
        Response with 404 status

    Example:
        >>> return handle_not_found("Chapter", chapter_id=5)
    """
    exc = ResourceNotFoundException(resource_type, resource_id)
    return build_error_response(
        message=exc.message,
        code=exc.code,
        status_code=exc.status_code,
        details=exc.details,
    )


def handle_validation_error(message: str, field: Optional[str] = None, details: Optional[Dict] = None) -> Response:
    """
    Shortcut for validation error responses.

    Args:
        message: Error message
        field: Field name that failed validation (optional)
        details: Additional error details (optional)

    Returns:
        Response with 400 status

    Example:
        >>> return handle_validation_error(
        ...     "File size exceeds maximum",
        ...     field="file",
        ...     details={"max_size": "50MB"}
        ... )
    """
    exc_details = details or {}
    if field:
        exc_details["field"] = field

    return build_error_response(
        message=message,
        code="validation_error",
        status_code=status.HTTP_400_BAD_REQUEST,
        details=exc_details,
    )


def handle_permission_denied(message: str = "Permission denied", action: Optional[str] = None) -> Response:
    """
    Shortcut for permission denied responses.

    Args:
        message: Error message
        action: Required action/permission (optional)

    Returns:
        Response with 403 status

    Example:
        >>> return handle_permission_denied(
        ...     "Admin access required",
        ...     action="delete_chapter"
        ... )
    """
    details = {}
    if action:
        details["required_action"] = action

    return build_error_response(
        message=message,
        code="permission_denied",
        status_code=status.HTTP_403_FORBIDDEN,
        details=details,
    )


def log_and_return_error(
    message: str,
    exc: Optional[Exception] = None,
    code: str = "error",
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    details: Optional[Dict[str, Any]] = None,
    log_level: str = "error",
) -> Response:
    """
    Log an error and return standardized error response.

    Args:
        message: Error message
        exc: Optional exception to log
        code: Error code
        status_code: HTTP status code
        details: Additional error details
        log_level: Logging level ("error", "warning", "info")

    Returns:
        Response with standardized error format

    Example:
        >>> try:
        ...     risky_operation()
        ... except Exception as e:
        ...     return log_and_return_error(
        ...         "Operation failed",
        ...         exc=e,
        ...         code="operation_error",
        ...         status_code=500
        ...     )
    """
    # Log the error
    log_func = getattr(logger, log_level, logger.error)

    if exc:
        log_func(f"{message}: {str(exc)}", exc_info=True)
    else:
        log_func(message)

    return build_error_response(
        message=message,
        code=code,
        status_code=status_code,
        details=details,
    )
