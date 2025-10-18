"""
Error Handling Migration Examples

This file shows before/after examples of migrating to standardized error handling.
Use these examples as a reference when updating existing endpoints.
"""

# ==============================================================================
# Example 1: Simple GET endpoint with 404
# ==============================================================================

# BEFORE (inconsistent)
def get_chapter_old(request, chapter_id):
    try:
        chapter = Chapter.objects.get(id=chapter_id)
    except Chapter.DoesNotExist:
        return Response(
            {"error": "Chapter not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response({
        "id": chapter.id,
        "name": chapter.name,
    })

# AFTER (standardized) - Option 1: Using exception
from bni.exceptions import ResourceNotFoundException, build_success_response

def get_chapter_new_v1(request, chapter_id):
    try:
        chapter = Chapter.objects.get(id=chapter_id)
    except Chapter.DoesNotExist:
        raise ResourceNotFoundException("Chapter", chapter_id)

    return build_success_response(data={
        "id": chapter.id,
        "name": chapter.name,
    })

# AFTER (standardized) - Option 2: Using utility
from bni.exceptions import handle_not_found, build_success_response

def get_chapter_new_v2(request, chapter_id):
    try:
        chapter = Chapter.objects.get(id=chapter_id)
    except Chapter.DoesNotExist:
        return handle_not_found("Chapter", chapter_id)

    return build_success_response(data={
        "id": chapter.id,
        "name": chapter.name,
    })


# ==============================================================================
# Example 2: POST endpoint with validation
# ==============================================================================

# BEFORE (inconsistent)
def create_chapter_old(request):
    name = request.data.get("name")

    if not name:
        return Response(
            {"error": "Name is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(name) < 3:
        return Response(
            {"message": "Name too short"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        chapter = Chapter.objects.create(name=name)
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return Response(
        {"id": chapter.id, "name": chapter.name},
        status=status.HTTP_201_CREATED
    )

# AFTER (standardized)
from bni.exceptions import ValidationException, log_and_return_error, build_success_response

def create_chapter_new(request):
    name = request.data.get("name")

    if not name:
        raise ValidationException("Name is required", field="name")

    if len(name) < 3:
        raise ValidationException(
            "Name must be at least 3 characters",
            field="name",
            details={"min_length": 3, "actual_length": len(name)}
        )

    try:
        chapter = Chapter.objects.create(name=name)
    except Exception as e:
        return log_and_return_error(
            "Failed to create chapter",
            exc=e,
            code="chapter_creation_error",
            status_code=500
        )

    return build_success_response(
        data={"id": chapter.id, "name": chapter.name},
        message="Chapter created successfully",
        status_code=status.HTTP_201_CREATED
    )


# ==============================================================================
# Example 3: File upload endpoint
# ==============================================================================

# BEFORE (inconsistent)
def upload_file_old(request):
    file = request.FILES.get("file")

    if not file:
        return Response(
            {"error": "No file provided"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if file.size > 50 * 1024 * 1024:
        return Response(
            {"error": "File too large"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not file.name.endswith(".xlsx"):
        return Response(
            {"message": "Invalid file type"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        result = process_excel(file)
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        return Response(
            {"error": f"Processing failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return Response(result)

# AFTER (standardized)
from bni.exceptions import ValidationException, ProcessingException, build_success_response

def upload_file_new(request):
    file = request.FILES.get("file")

    # Validation
    if not file:
        raise ValidationException("File is required", field="file")

    if file.size > 50 * 1024 * 1024:
        raise ValidationException(
            "File size exceeds maximum",
            field="file",
            details={
                "max_size": "50MB",
                "actual_size": f"{file.size / (1024 * 1024):.1f}MB"
            }
        )

    if not file.name.endswith(".xlsx"):
        raise ValidationException(
            "Invalid file type",
            field="file",
            details={
                "allowed_types": [".xlsx"],
                "provided_type": file.name.split(".")[-1]
            }
        )

    # Processing
    try:
        result = process_excel(file)
    except Exception as e:
        raise ProcessingException(
            "Failed to process Excel file",
            operation="excel_parsing",
            details={"filename": file.name}
        ) from e

    return build_success_response(
        data=result,
        message="File processed successfully"
    )


# ==============================================================================
# Example 4: DELETE endpoint with permission check
# ==============================================================================

# BEFORE (inconsistent)
def delete_chapter_old(request, chapter_id):
    if not request.user.is_admin:
        return Response(
            {"error": "Unauthorized"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        chapter = Chapter.objects.get(id=chapter_id)
    except Chapter.DoesNotExist:
        return Response(
            {"error": "Not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    chapter.delete()

    return Response({"message": "Deleted"})

# AFTER (standardized)
from bni.exceptions import (
    PermissionDeniedException,
    ResourceNotFoundException,
    build_success_response
)

def delete_chapter_new(request, chapter_id):
    # Permission check
    if not request.user.is_admin:
        raise PermissionDeniedException(
            "Admin access required",
            action="delete_chapter"
        )

    # Get resource
    try:
        chapter = Chapter.objects.get(id=chapter_id)
    except Chapter.DoesNotExist:
        raise ResourceNotFoundException("Chapter", chapter_id)

    # Delete
    chapter_name = chapter.name
    chapter.delete()

    return build_success_response(
        data={"deleted": True},
        message=f"Chapter '{chapter_name}' deleted successfully"
    )


# ==============================================================================
# Example 5: Complex endpoint with multiple error paths
# ==============================================================================

# BEFORE (inconsistent)
def complex_operation_old(request):
    data = request.data

    # Various validations
    if not data.get("chapter_id"):
        return Response({"error": "chapter_id required"}, status=400)

    if not data.get("members"):
        return Response({"message": "members required"}, status=400)

    try:
        chapter = Chapter.objects.get(id=data["chapter_id"])
    except Chapter.DoesNotExist:
        return Response({"error": "Chapter not found"}, status=404)

    # Permission check
    if not request.user.can_access_chapter(chapter):
        return Response({"error": "No access"}, status=403)

    # Processing
    try:
        result = process_members(chapter, data["members"])
    except ValueError as e:
        return Response({"error": str(e)}, status=400)
    except Exception as e:
        logger.exception("Processing failed")
        return Response({"error": "Internal error"}, status=500)

    return Response(result, status=201)

# AFTER (standardized)
from bni.exceptions import (
    ValidationException,
    ResourceNotFoundException,
    PermissionDeniedException,
    ProcessingException,
    log_and_return_error,
    build_success_response
)

def complex_operation_new(request):
    data = request.data

    # Validations
    if not data.get("chapter_id"):
        raise ValidationException("chapter_id is required", field="chapter_id")

    if not data.get("members"):
        raise ValidationException("members list is required", field="members")

    # Get chapter
    try:
        chapter = Chapter.objects.get(id=data["chapter_id"])
    except Chapter.DoesNotExist:
        raise ResourceNotFoundException("Chapter", data["chapter_id"])

    # Permission check
    if not request.user.can_access_chapter(chapter):
        raise PermissionDeniedException(
            "You cannot access this chapter",
            action="modify_chapter"
        )

    # Processing
    try:
        result = process_members(chapter, data["members"])
    except ValueError as e:
        raise ProcessingException(
            "Invalid member data",
            operation="member_processing",
            details={"error": str(e)}
        ) from e
    except Exception as e:
        return log_and_return_error(
            "Member processing failed",
            exc=e,
            code="processing_error",
            status_code=500,
            details={"chapter_id": chapter.id}
        )

    return build_success_response(
        data=result,
        message="Members processed successfully",
        status_code=status.HTTP_201_CREATED
    )


# ==============================================================================
# Example 6: List endpoint with query parameter validation
# ==============================================================================

# BEFORE (inconsistent)
def list_chapters_old(request):
    location = request.query_params.get("location")

    if location and location not in ["Dubai", "Abu Dhabi"]:
        return Response(
            {"error": "Invalid location"},
            status=400
        )

    try:
        chapters = Chapter.objects.filter(location=location) if location else Chapter.objects.all()
    except Exception as e:
        return Response({"error": str(e)}, status=500)

    data = [{"id": c.id, "name": c.name} for c in chapters]
    return Response(data)

# AFTER (standardized)
from bni.exceptions import ValidationException, log_and_return_error, build_success_response

def list_chapters_new(request):
    location = request.query_params.get("location")

    # Validate query parameter
    if location:
        valid_locations = ["Dubai", "Abu Dhabi", "Sharjah"]
        if location not in valid_locations:
            raise ValidationException(
                "Invalid location",
                field="location",
                details={
                    "valid_options": valid_locations,
                    "provided": location
                }
            )

    # Query
    try:
        if location:
            chapters = Chapter.objects.filter(location=location)
        else:
            chapters = Chapter.objects.all()

        data = [{"id": c.id, "name": c.name} for c in chapters]

    except Exception as e:
        return log_and_return_error(
            "Failed to fetch chapters",
            exc=e,
            code="database_error",
            status_code=500
        )

    return build_success_response(data=data)


# ==============================================================================
# Example 7: Batch operation with partial failures
# ==============================================================================

# BEFORE (inconsistent)
def bulk_import_old(request):
    members = request.data.get("members", [])

    if not members:
        return Response({"error": "No members"}, status=400)

    created = []
    errors = []

    for member_data in members:
        try:
            member = Member.objects.create(**member_data)
            created.append(member.id)
        except Exception as e:
            errors.append(str(e))

    return Response({
        "created": len(created),
        "errors": errors
    })

# AFTER (standardized)
from bni.exceptions import ValidationException, build_success_response

def bulk_import_new(request):
    members = request.data.get("members", [])

    if not members:
        raise ValidationException("Members list cannot be empty", field="members")

    created = []
    errors = []

    for idx, member_data in enumerate(members):
        try:
            # Validate individual member data
            if not member_data.get("name"):
                errors.append({
                    "index": idx,
                    "error": "Name is required",
                    "data": member_data
                })
                continue

            member = Member.objects.create(**member_data)
            created.append({"id": member.id, "name": member.name})

        except Exception as e:
            errors.append({
                "index": idx,
                "error": str(e),
                "data": member_data
            })

    # Determine if operation was successful
    success_rate = len(created) / len(members) * 100

    return build_success_response(
        data={
            "created_count": len(created),
            "error_count": len(errors),
            "success_rate": f"{success_rate:.1f}%",
            "created": created,
            "errors": errors if errors else None
        },
        message=f"Bulk import completed: {len(created)}/{len(members)} successful"
    )


# ==============================================================================
# Key Takeaways
# ==============================================================================

"""
1. Always use custom exception classes (ValidationException, ResourceNotFoundException, etc.)
2. Use build_success_response for consistency
3. Provide context in error details
4. Use utility functions (handle_not_found, handle_validation_error) for shortcuts
5. Log errors with log_and_return_error
6. Raise exceptions instead of returning error responses (let exception handler manage it)
7. Include helpful details for debugging (field names, valid options, etc.)
"""
