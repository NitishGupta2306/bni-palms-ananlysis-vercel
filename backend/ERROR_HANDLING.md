# Error Handling Standards

**Last Updated:** 2025-10-18
**Status:** Active Standard

This document defines error handling standards for the BNI PALMS Analytics backend.

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [Exception Types](#exception-types)
3. [Response Format](#response-format)
4. [Usage Patterns](#usage-patterns)
5. [Transaction Management](#transaction-management)
6. [Logging Guidelines](#logging-guidelines)
7. [Migration Guide](#migration-guide)

---

## Quick Start

### Import Centralized Utilities

```python
from bni.exceptions import (
    build_error_response,
    build_success_response,
    handle_not_found,
    handle_validation_error,
    handle_permission_denied,
    log_and_return_error,
    ValidationException,
    ResourceNotFoundException,
)
```

### Basic Usage

```python
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from bni.exceptions import handle_not_found, build_error_response, build_success_response

class MyViewSet(viewsets.ModelViewSet):
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def my_action(self, request, pk=None):
        try:
            # Get object
            obj = self.get_object()

            # Validate input
            if not request.data.get('required_field'):
                return build_error_response(
                    "Missing required field",
                    status_code=400
                )

            # Process
            result = obj.do_something(request.data)

            # Return success
            return build_success_response(
                data=result,
                message="Operation completed successfully"
            )

        except MyModel.DoesNotExist:
            return handle_not_found("MyModel", pk)
        except Exception as e:
            return log_and_return_error(
                e,
                "Failed to process request",
                context={'view': 'MyViewSet.my_action', 'pk': pk}
            )
```

---

## Exception Types

### Custom Exception Classes

All custom exceptions inherit from `BNIBaseException` and include:
- Automatic HTTP status code mapping
- Consistent error message formatting
- Request context tracking

| Exception | Status Code | Use Case |
|-----------|-------------|----------|
| `ValidationException` | 400 | Invalid input data, validation failures |
| `AuthenticationException` | 401 | Missing or invalid authentication |
| `PermissionDeniedException` | 403 | User lacks required permissions |
| `ResourceNotFoundException` | 404 | Requested resource doesn't exist |
| `ProcessingException` | 422 | Data processing failures, business logic errors |
| `RateLimitException` | 429 | Rate limit exceeded |
| `DatabaseException` | 500 | Database operation failures |
| `BNIBaseException` | 500 | Generic application error |

### When to Use Each Exception

```python
# Validation Errors
if not data.get('email') or '@' not in data['email']:
    raise ValidationException("Invalid email format")

# Not Found
try:
    chapter = Chapter.objects.get(id=chapter_id)
except Chapter.DoesNotExist:
    raise ResourceNotFoundException(f"Chapter {chapter_id}")

# Permission Denied
if not request.user.has_permission('edit_chapter'):
    raise PermissionDeniedException("You cannot edit this chapter")

# Processing Errors
if file_corrupted:
    raise ProcessingException("Excel file is corrupted and cannot be processed")

# Database Errors (usually caught automatically)
try:
    with transaction.atomic():
        # ... complex database operations
except IntegrityError as e:
    raise DatabaseException(f"Database constraint violation: {str(e)}")
```

---

## Response Format

### Success Response

```python
{
    "success": true,
    "data": { ... },           # Optional - response payload
    "message": "...",          # Optional - human-readable message
    "meta": { ... }            # Optional - pagination, etc.
}
```

### Error Response

```python
{
    "success": false,
    "error": "Error message",
    "details": "...",          # Optional - additional context
    "code": "ERROR_CODE",      # Optional - error code
    "timestamp": "2025-10-18T..."
}
```

### Using Response Builders

```python
# Success
return build_success_response(
    data={'id': 123, 'name': 'Test'},
    message="Chapter created successfully"
)

# Error
return build_error_response(
    "Invalid month format",
    status_code=400,
    details="Month must be in YYYY-MM format",
    code="INVALID_MONTH_FORMAT"
)
```

---

## Usage Patterns

### Pattern 1: Simple CRUD Operation

```python
def retrieve(self, request, pk=None):
    try:
        obj = self.get_object()
        serializer = self.get_serializer(obj)
        return build_success_response(data=serializer.data)
    except MyModel.DoesNotExist:
        return handle_not_found("MyModel", pk)
    except Exception as e:
        return log_and_return_error(e, "Failed to retrieve object")
```

### Pattern 2: Create with Validation

```python
@transaction.atomic
def create(self, request):
    try:
        # Validate
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return handle_validation_error(serializer.errors)

        # Create
        obj = serializer.save()

        return build_success_response(
            data=serializer.data,
            message="Created successfully",
            status_code=201
        )
    except ValidationException as e:
        return build_error_response(str(e), status_code=400)
    except Exception as e:
        return log_and_return_error(e, "Failed to create object")
```

### Pattern 3: Complex Business Logic

```python
@transaction.atomic
def process_upload(self, request):
    try:
        # Step 1: Validate file
        if 'file' not in request.FILES:
            raise ValidationException("No file provided")

        file = request.FILES['file']
        if not file.name.endswith('.xlsx'):
            raise ValidationException("Only .xlsx files allowed")

        # Step 2: Process file
        try:
            data = process_excel(file)
        except Exception as e:
            raise ProcessingException(f"Failed to process Excel: {str(e)}")

        # Step 3: Save to database
        result = save_data(data)

        return build_success_response(
            data=result,
            message=f"Processed {len(data)} records successfully"
        )

    except ValidationException as e:
        return build_error_response(str(e), status_code=400)
    except ProcessingException as e:
        return build_error_response(str(e), status_code=422)
    except Exception as e:
        return log_and_return_error(
            e,
            "Unexpected error during file upload",
            context={'filename': file.name if 'file' in locals() else None}
        )
```

---

## Transaction Management

### When to Use Transactions

Use `@transaction.atomic` for:
- **CREATE** operations (database inserts)
- **UPDATE** operations (database updates)
- **DELETE** operations (database deletes)
- Any operation that modifies multiple related records
- Any operation that must be "all or nothing"

### Transaction Decorator

```python
from django.db import transaction

@transaction.atomic
def create(self, request):
    # All database operations in this method
    # will be wrapped in a single transaction
    member = Member.objects.create(...)
    member.stats.create(...)
    # If anything fails, ALL changes are rolled back
```

### Transaction Context Manager

```python
def complex_operation(self, request):
    try:
        # Non-transactional prep work
        data = validate_input(request.data)

        # Critical database operations
        with transaction.atomic():
            obj1 = Model1.objects.create(...)
            obj2 = Model2.objects.create(...)
            obj1.update_stats()

        # Non-critical post-processing
        send_notification(obj1)

    except Exception as e:
        return log_and_return_error(e, "Operation failed")
```

### Guidelines

1. **Use decorator for entire methods** when most code is database operations
2. **Use context manager** when only part of method needs transactions
3. **Never nest transactions** unnecessarily (performance overhead)
4. **Keep transactions short** - don't include API calls or long computations
5. **Document why** transactions are needed (comment above decorator)

---

## Logging Guidelines

### Logging Levels

| Level | Use Case | Example |
|-------|----------|---------|
| `DEBUG` | Detailed diagnostic info | Request parameters, intermediate values |
| `INFO` | General informational messages | "User logged in", "Report generated" |
| `WARNING` | Warning about potential issues | "Deprecated API called", "Rate limit approaching" |
| `ERROR` | Error occurred but recoverable | "File upload failed", "Database query slow" |
| `CRITICAL` | Critical error, system unstable | "Database connection lost", "Out of memory" |

### Logging Patterns

```python
import logging

logger = logging.getLogger(__name__)

# INFO - Successful operations
logger.info(f"Chapter {chapter_id} created successfully", extra={
    'user': request.user.id,
    'chapter_id': chapter_id
})

# WARNING - Non-critical issues
logger.warning(f"Slow query detected: {query_time}s", extra={
    'query': str(query),
    'duration': query_time
})

# ERROR - Caught exceptions
try:
    result = process_file(file)
except Exception as e:
    logger.error(f"File processing failed: {str(e)}", extra={
        'filename': file.name,
        'user': request.user.id
    }, exc_info=True)

# CRITICAL - System failures
try:
    connection = database.connect()
except ConnectionError as e:
    logger.critical(f"Database connection failed: {str(e)}", exc_info=True)
```

### Using `log_and_return_error`

The utility combines logging and error response:

```python
except Exception as e:
    return log_and_return_error(
        e,
        "Failed to process upload",
        context={
            'view': 'ReportViewSet.upload',
            'file': file.name,
            'user': request.user.id
        }
    )
```

This automatically:
- Logs the error with full stack trace
- Includes context data in log
- Returns standardized error response
- Sets appropriate HTTP status code

---

## Migration Guide

### Before (Old Pattern)

```python
def create(self, request):
    try:
        chapter_id = request.data.get('chapter_id')
        if not chapter_id:
            return Response(
                {"error": "chapter_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            chapter = Chapter.objects.get(id=chapter_id)
        except Chapter.DoesNotExist:
            return Response(
                {"error": f"Chapter {chapter_id} not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Process...
        result = do_something(chapter)

        return Response({"data": result}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception(f"Error: {str(e)}")
        return Response(
            {"error": "An error occurred"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
```

### After (New Pattern)

```python
from bni.exceptions import handle_not_found, build_error_response, build_success_response, log_and_return_error
from django.db import transaction

@transaction.atomic
def create(self, request):
    try:
        # Validate input
        chapter_id = request.data.get('chapter_id')
        if not chapter_id:
            return build_error_response(
                "chapter_id is required",
                status_code=400
            )

        # Get chapter
        try:
            chapter = Chapter.objects.get(id=chapter_id)
        except Chapter.DoesNotExist:
            return handle_not_found("Chapter", chapter_id)

        # Process
        result = do_something(chapter)

        # Return success
        return build_success_response(
            data=result,
            message="Created successfully"
        )

    except Exception as e:
        return log_and_return_error(
            e,
            "Failed to create resource",
            context={'view': 'MyViewSet.create', 'chapter_id': chapter_id}
        )
```

### Key Changes

1. ✅ Import centralized utilities
2. ✅ Use `build_error_response()` instead of `Response()`
3. ✅ Use `build_success_response()` for success
4. ✅ Use `handle_not_found()` for 404 errors
5. ✅ Use `log_and_return_error()` for exception logging
6. ✅ Add `@transaction.atomic` decorator
7. ✅ Include context in error logs
8. ✅ Remove inline error logging (handled by utility)

---

## Best Practices

### ✅ DO

- Use centralized error handling utilities consistently
- Include context data in error logs
- Use transactions for all data mutations
- Return user-friendly error messages
- Log all exceptions with stack traces
- Use appropriate HTTP status codes
- Include request IDs in errors (when available)
- Document complex error handling logic

### ❌ DON'T

- Don't use raw `Response()` for errors
- Don't mix error response formats
- Don't silently catch and ignore exceptions
- Don't expose sensitive data in error messages
- Don't forget to add transactions to destructive operations
- Don't nest try/except blocks unnecessarily
- Don't log passwords, tokens, or PII

---

## Examples

See `/backend/examples/error_handling_migration.py` for complete before/after examples.

---

## Support

For questions about error handling standards:
- Review this document
- Check `/backend/bni/exceptions.py` for utility code
- See migration examples in `/backend/examples/`
- Ask in team Slack #backend channel

---

**Last Updated:** 2025-10-18
**Version:** 1.0
**Status:** Active
