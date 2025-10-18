# Error Handling Standardization

## Overview

This document describes the standardized error handling system implemented across the BNI PALMS Analytics application to ensure consistent, user-friendly error responses and comprehensive logging.

---

## Table of Contents

1. [Goals](#goals)
2. [Standardized Response Format](#standardized-response-format)
3. [Custom Exception Classes](#custom-exception-classes)
4. [Utility Functions](#utility-functions)
5. [Migration Guide](#migration-guide)
6. [Examples](#examples)
7. [Testing](#testing)
8. [Best Practices](#best-practices)

---

## Goals

### ✅ Achieved

1. **Consistency** - All API errors follow the same response format
2. **User-Friendly** - Clear, actionable error messages
3. **Developer-Friendly** - Detailed error codes and context for debugging
4. **Comprehensive Logging** - All errors logged with appropriate context
5. **Type Safety** - Custom exception classes for different error types
6. **DRF Integration** - Seamless integration with Django REST Framework

---

## Standardized Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "machine_readable_error_code",
    "details": {
      "field": "specific_field",
      "additional": "context"
    }
  },
  "request_id": "optional_request_tracking_id"
}
```

---

## Custom Exception Classes

All custom exceptions inherit from `BNIBaseException` and follow a consistent pattern.

### 1. BNIBaseException

**Base class for all application exceptions.**

```python
from bni.exceptions import BNIBaseException

raise BNIBaseException(
    message="Something went wrong",
    code="custom_error",
    details={"key": "value"},
    status_code=400
)
```

---

### 2. ValidationException

**Use for data validation failures.**

```python
from bni.exceptions import ValidationException

# Simple validation error
raise ValidationException("File size exceeds maximum")

# With field context
raise ValidationException(
    message="Invalid email format",
    field="email"
)

# With additional details
raise ValidationException(
    message="File size exceeds maximum",
    field="file",
    details={"max_size": "50MB", "actual_size": "75MB"}
)
```

**Response Example:**
```json
{
  "success": false,
  "error": {
    "message": "File size exceeds maximum",
    "code": "validation_error",
    "details": {
      "field": "file",
      "max_size": "50MB",
      "actual_size": "75MB"
    }
  }
}
```

---

### 3. ResourceNotFoundException

**Use when a requested resource doesn't exist.**

```python
from bni.exceptions import ResourceNotFoundException

# Simple not found
raise ResourceNotFoundException("Chapter")

# With resource ID
raise ResourceNotFoundException("Chapter", resource_id=5)

# With additional context
raise ResourceNotFoundException(
    "MonthlyReport",
    resource_id=123,
    details={"chapter_id": 5}
)
```

**Response Example:**
```json
{
  "success": false,
  "error": {
    "message": "Chapter not found (ID: 5)",
    "code": "not_found",
    "details": {
      "resource_type": "Chapter",
      "resource_id": "5"
    }
  }
}
```

---

### 4. PermissionDeniedException

**Use when user lacks required permissions.**

```python
from bni.exceptions import PermissionDeniedException

# Simple permission denied
raise PermissionDeniedException()

# With custom message
raise PermissionDeniedException("Admin access required")

# With action context
raise PermissionDeniedException(
    message="Cannot delete chapter",
    action="delete_chapter"
)
```

**Response Example:**
```json
{
  "success": false,
  "error": {
    "message": "Cannot delete chapter",
    "code": "permission_denied",
    "details": {
      "required_action": "delete_chapter"
    }
  }
}
```

---

### 5. ProcessingException

**Use for file processing, Excel handling, or data transformation failures.**

```python
from bni.exceptions import ProcessingException

# Simple processing error
raise ProcessingException("Failed to process Excel file")

# With operation context
raise ProcessingException(
    message="Invalid Excel format",
    operation="excel_parsing",
    details={
        "sheet_name": "Member Names",
        "expected_columns": ["First Name", "Last Name"],
        "found_columns": ["Name", "Email"]
    }
)
```

**Response Example:**
```json
{
  "success": false,
  "error": {
    "message": "Invalid Excel format",
    "code": "processing_error",
    "details": {
      "operation": "excel_parsing",
      "sheet_name": "Member Names",
      "expected_columns": ["First Name", "Last Name"],
      "found_columns": ["Name", "Email"]
    }
  }
}
```

---

### 6. DatabaseException

**Use for database operation failures.**

```python
from bni.exceptions import DatabaseException

raise DatabaseException("Failed to save monthly report")

# With details
raise DatabaseException(
    message="Transaction rollback occurred",
    details={"operation": "bulk_insert", "affected_rows": 0}
)
```

---

### 7. RateLimitException

**Use for rate limiting (e.g., login attempts).**

```python
from bni.exceptions import RateLimitException

raise RateLimitException(
    message="Too many login attempts",
    retry_after=15  # minutes
)
```

**Response Example:**
```json
{
  "success": false,
  "error": {
    "message": "Too many login attempts",
    "code": "rate_limit_exceeded",
    "details": {
      "retry_after_minutes": 15
    }
  }
}
```

---

## Utility Functions

### 1. build_error_response

**Manually build error responses without exceptions.**

```python
from bni.exceptions import build_error_response

return build_error_response(
    message="Operation failed",
    code="operation_error",
    status_code=400,
    details={"reason": "Invalid state"}
)
```

---

### 2. build_success_response

**Build standardized success responses.**

```python
from bni.exceptions import build_success_response

return build_success_response(
    data={"id": 1, "name": "Dubai Business Bay"},
    message="Chapter created successfully",
    status_code=201
)
```

---

### 3. handle_not_found

**Shortcut for 404 responses.**

```python
from bni.exceptions import handle_not_found

# Simple usage
return handle_not_found("Chapter")

# With resource ID
return handle_not_found("Chapter", resource_id=chapter_id)
```

---

### 4. handle_validation_error

**Shortcut for validation errors.**

```python
from bni.exceptions import handle_validation_error

return handle_validation_error(
    message="File size exceeds maximum",
    field="file",
    details={"max_size": "50MB"}
)
```

---

### 5. handle_permission_denied

**Shortcut for permission denied responses.**

```python
from bni.exceptions import handle_permission_denied

return handle_permission_denied(
    message="Admin access required",
    action="delete_chapter"
)
```

---

### 6. log_and_return_error

**Log error and return response in one call.**

```python
from bni.exceptions import log_and_return_error

try:
    risky_operation()
except Exception as e:
    return log_and_return_error(
        message="Operation failed",
        exc=e,
        code="operation_error",
        status_code=500,
        log_level="error"
    )
```

---

## Migration Guide

### Before (Inconsistent)

```python
# Old pattern 1
try:
    chapter = Chapter.objects.get(id=chapter_id)
except Chapter.DoesNotExist:
    return Response(
        {"error": "Chapter not found"},
        status=status.HTTP_404_NOT_FOUND
    )

# Old pattern 2
except Exception as e:
    return Response(
        {"error": f"Failed: {str(e)}"},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )

# Old pattern 3
if not file:
    return Response(
        {"message": "File required"},
        status=status.HTTP_400_BAD_REQUEST
    )
```

### After (Standardized)

```python
from bni.exceptions import (
    ResourceNotFoundException,
    ValidationException,
    log_and_return_error,
    handle_not_found,
)

# Pattern 1: Using exception
try:
    chapter = Chapter.objects.get(id=chapter_id)
except Chapter.DoesNotExist:
    raise ResourceNotFoundException("Chapter", chapter_id)

# Pattern 2: Using shortcut
try:
    chapter = Chapter.objects.get(id=chapter_id)
except Chapter.DoesNotExist:
    return handle_not_found("Chapter", chapter_id)

# Pattern 3: Validation
if not file:
    raise ValidationException("File is required", field="file")

# Pattern 4: With logging
try:
    risky_operation()
except Exception as e:
    return log_and_return_error(
        "Operation failed",
        exc=e,
        code="operation_error",
        status_code=500
    )
```

---

## Examples

### Example 1: Simple CRUD Endpoint

```python
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from bni.exceptions import (
    ResourceNotFoundException,
    ValidationException,
    build_success_response,
)

@api_view(["GET"])
def get_chapter(request, chapter_id):
    """Get chapter by ID."""
    try:
        chapter = Chapter.objects.get(id=chapter_id)
    except Chapter.DoesNotExist:
        raise ResourceNotFoundException("Chapter", chapter_id)

    return build_success_response(
        data={
            "id": chapter.id,
            "name": chapter.name,
            "location": chapter.location,
        }
    )

@api_view(["POST"])
def create_chapter(request):
    """Create a new chapter."""
    name = request.data.get("name")

    if not name:
        raise ValidationException("Chapter name is required", field="name")

    if len(name) < 3:
        raise ValidationException(
            "Chapter name must be at least 3 characters",
            field="name",
            details={"min_length": 3, "actual_length": len(name)}
        )

    chapter = Chapter.objects.create(name=name)

    return build_success_response(
        data={"id": chapter.id, "name": chapter.name},
        message="Chapter created successfully",
        status_code=status.HTTP_201_CREATED
    )
```

---

### Example 2: File Upload with Processing

```python
from bni.exceptions import ProcessingException, ValidationException

@api_view(["POST"])
def upload_excel(request):
    """Upload and process Excel file."""
    file = request.FILES.get("file")

    # Validation
    if not file:
        raise ValidationException("File is required", field="file")

    if not file.name.endswith((".xls", ".xlsx")):
        raise ValidationException(
            "Invalid file type",
            field="file",
            details={
                "allowed_types": [".xls", ".xlsx"],
                "provided_type": file.name.split(".")[-1]
            }
        )

    # Processing
    try:
        result = process_excel_file(file)
    except ExcelJS.Error as e:
        raise ProcessingException(
            message="Failed to parse Excel file",
            operation="excel_parsing",
            details={"error": str(e)}
        )

    return build_success_response(
        data=result,
        message="File processed successfully"
    )
```

---

### Example 3: Permission Check

```python
from bni.exceptions import PermissionDeniedException

@api_view(["DELETE"])
def delete_chapter(request, chapter_id):
    """Delete chapter (admin only)."""
    # Check permissions
    if not request.user.is_admin:
        raise PermissionDeniedException(
            message="Admin access required to delete chapters",
            action="delete_chapter"
        )

    try:
        chapter = Chapter.objects.get(id=chapter_id)
    except Chapter.DoesNotExist:
        raise ResourceNotFoundException("Chapter", chapter_id)

    chapter.delete()

    return build_success_response(
        data={"deleted": True},
        message=f"Chapter '{chapter.name}' deleted successfully"
    )
```

---

### Example 4: Complex Operation with Logging

```python
from django.db import transaction
from bni.exceptions import DatabaseException, log_and_return_error
import logging

logger = logging.getLogger(__name__)

@api_view(["POST"])
@transaction.atomic
def bulk_import(request):
    """Bulk import members."""
    try:
        members_data = request.data.get("members", [])

        if not members_data:
            raise ValidationException("No members provided", field="members")

        created_count = 0
        for member_data in members_data:
            Member.objects.create(**member_data)
            created_count += 1

        logger.info(f"Bulk import completed: {created_count} members created")

        return build_success_response(
            data={"created_count": created_count},
            message=f"Successfully imported {created_count} members"
        )

    except ValidationException:
        # Re-raise validation errors (will be handled by exception handler)
        raise

    except Exception as e:
        # Log and return database error
        return log_and_return_error(
            message="Bulk import failed",
            exc=e,
            code="bulk_import_error",
            status_code=500,
            details={"members_processed": created_count},
            log_level="error"
        )
```

---

## Testing

### Unit Tests

```python
from django.test import TestCase
from rest_framework.test import APITestCase
from bni.exceptions import ResourceNotFoundException, ValidationException

class ExceptionTests(TestCase):
    """Test custom exceptions."""

    def test_resource_not_found_exception(self):
        """Test ResourceNotFoundException creates correct response."""
        exc = ResourceNotFoundException("Chapter", resource_id=5)

        self.assertEqual(exc.message, "Chapter not found (ID: 5)")
        self.assertEqual(exc.code, "not_found")
        self.assertEqual(exc.status_code, 404)
        self.assertEqual(exc.details["resource_type"], "Chapter")
        self.assertEqual(exc.details["resource_id"], "5")

    def test_validation_exception_with_field(self):
        """Test ValidationException with field context."""
        exc = ValidationException("Invalid email", field="email")

        self.assertEqual(exc.message, "Invalid email")
        self.assertEqual(exc.code, "validation_error")
        self.assertEqual(exc.status_code, 400)
        self.assertEqual(exc.details["field"], "email")


class ErrorHandlingAPITests(APITestCase):
    """Test API error responses."""

    def test_not_found_error_format(self):
        """Test that 404 errors follow standard format."""
        response = self.client.get("/api/chapters/999/")

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["success"])
        self.assertIn("error", response.data)
        self.assertIn("message", response.data["error"])
        self.assertIn("code", response.data["error"])

    def test_validation_error_format(self):
        """Test that validation errors follow standard format."""
        response = self.client.post("/api/chapters/", data={})  # Missing name

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["error"]["code"], "validation_error")
```

---

## Best Practices

### ✅ DO:

1. **Use specific exception types**
   ```python
   # Good
   raise ResourceNotFoundException("Chapter", chapter_id)

   # Avoid
   raise Exception("Chapter not found")
   ```

2. **Provide context in details**
   ```python
   raise ValidationException(
       "File size exceeds maximum",
       field="file",
       details={"max_size": "50MB", "actual_size": "75MB"}
   )
   ```

3. **Use utility functions for shortcuts**
   ```python
   # Good - concise
   return handle_not_found("Chapter", chapter_id)

   # Also good - explicit
   raise ResourceNotFoundException("Chapter", chapter_id)
   ```

4. **Log errors with context**
   ```python
   return log_and_return_error(
       "Processing failed",
       exc=e,
       code="processing_error",
       details={"step": "data_transformation"}
   )
   ```

5. **Use build_success_response for consistency**
   ```python
   return build_success_response(
       data=serializer.data,
       message="Chapter created successfully"
   )
   ```

---

### ❌ DON'T:

1. **Don't use generic exceptions**
   ```python
   # Bad
   raise Exception("Something went wrong")

   # Good
   raise ProcessingException("Failed to parse Excel file")
   ```

2. **Don't return inconsistent error formats**
   ```python
   # Bad
   return Response({"error": "Not found"}, status=404)
   return Response({"message": "Not found"}, status=404)
   return Response({"detail": "Not found"}, status=404)

   # Good
   raise ResourceNotFoundException("Chapter", chapter_id)
   ```

3. **Don't swallow exceptions silently**
   ```python
   # Bad
   try:
       operation()
   except Exception:
       pass  # Silent failure

   # Good
   try:
       operation()
   except Exception as e:
       return log_and_return_error("Operation failed", exc=e)
   ```

4. **Don't expose sensitive information**
   ```python
   # Bad
   raise ValidationException(
       "Database error",
       details={"sql_query": "SELECT * FROM users WHERE password=..."}
   )

   # Good
   raise DatabaseException("Failed to query database")
   ```

---

## Error Codes Reference

| Code | Exception | HTTP Status | Usage |
|------|-----------|-------------|-------|
| `validation_error` | ValidationException | 400 | Input validation failures |
| `not_found` | ResourceNotFoundException | 404 | Resource doesn't exist |
| `permission_denied` | PermissionDeniedException | 403 | Insufficient permissions |
| `authentication_error` | AuthenticationException | 401 | Authentication required/failed |
| `processing_error` | ProcessingException | 422 | Data processing failures |
| `database_error` | DatabaseException | 500 | Database operation failures |
| `rate_limit_exceeded` | RateLimitException | 429 | Too many requests |
| `error` | BNIBaseException | 400 | Generic errors |
| `internal_server_error` | Unhandled | 500 | Unexpected errors |

---

## Logging Levels

| Level | When to Use | Examples |
|-------|-------------|----------|
| `ERROR` | Unexpected failures, data corruption, critical issues | Database connection failed, unhandled exceptions |
| `WARNING` | Expected errors, validation failures, permission denied | Invalid input, resource not found, auth failures |
| `INFO` | Successful operations, important events | User created, file uploaded, report generated |
| `DEBUG` | Development debugging, detailed traces | SQL queries, variable values |

---

## Integration with Frontend

### TypeScript Type Definitions

```typescript
// Error response type
interface APIErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: Record<string, any>;
  };
  request_id?: string;
}

// Success response type
interface APISuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

type APIResponse<T> = APISuccessResponse<T> | APIErrorResponse;
```

### Frontend Error Handling

```typescript
async function fetchChapter(chapterId: number): Promise<Chapter> {
  const response = await fetch(`/api/chapters/${chapterId}/`);
  const data: APIResponse<Chapter> = await response.json();

  if (!data.success) {
    // Handle error
    switch (data.error.code) {
      case 'not_found':
        showNotification('Chapter not found', 'error');
        break;
      case 'permission_denied':
        showNotification('Access denied', 'error');
        break;
      default:
        showNotification(data.error.message, 'error');
    }
    throw new Error(data.error.message);
  }

  return data.data;
}
```

---

## Summary

✅ **Implemented:**
- Standardized error response format
- Custom exception classes for different error types
- Utility functions for common error scenarios
- DRF integration via custom exception handler
- Comprehensive logging
- Type-safe error handling

✅ **Benefits:**
- Consistent API responses
- Better user experience (clear error messages)
- Easier debugging (detailed error context)
- Simplified frontend error handling
- Production-ready error tracking

---

**Last Updated:** October 16, 2025
**Version:** 1.0
**File:** `backend/bni/exceptions.py`
**Settings:** `backend/config/settings.py` (REST_FRAMEWORK.EXCEPTION_HANDLER)
