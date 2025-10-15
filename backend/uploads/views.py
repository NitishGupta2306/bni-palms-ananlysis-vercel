"""
File Upload ViewSet - RESTful API for Excel file uploads

Authentication:
- Excel upload: IsChapterOrAdmin (chapters upload their own data)
- Bulk upload: IsAdmin (admin-only operation)
- Reset all: IsAdmin (admin-only operation)
"""

import logging
import re
from datetime import datetime
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from chapters.models import Chapter
from chapters.permissions import IsChapterOrAdmin, IsAdmin
from bni.services.excel_processor import ExcelProcessorService
from bni.services.bulk_upload_service import BulkUploadService

logger = logging.getLogger(__name__)


class FileUploadSerializer(serializers.Serializer):
    """Serializer for file upload validation."""

    slip_audit_files = serializers.ListField(
        child=serializers.FileField(),
        allow_empty=False,
        help_text="One or more slip audit files to compile into a single monthly report",
    )
    member_names_file = serializers.FileField(required=False)
    chapter_id = serializers.IntegerField()
    month_year = serializers.CharField(
        max_length=7,
        required=False,
        allow_blank=True,
        help_text="e.g., '2024-06' (optional, will be extracted from filename if not provided)",
    )
    upload_option = serializers.ChoiceField(
        choices=["slip_only", "slip_and_members"], default="slip_only"
    )
    week_of_date = serializers.DateField(
        required=False,
        allow_null=True,
        help_text="The week this audit represents (e.g., '2025-01-28')",
    )
    require_palms_sheets = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Whether PALMS data sheets are required",
    )


class FileUploadViewSet(viewsets.ViewSet):
    """
    ViewSet for file upload operations.

    Provides endpoints for:
    - Excel file upload: Process slip audit and member names files (IsChapterOrAdmin)
    - Bulk upload: Process Regional PALMS Summary reports (IsAdmin)
    - Reset all: Delete all data (IsAdmin)

    Permissions:
    - Chapters can upload their own data
    - Admins have full access to all operations
    """

    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsChapterOrAdmin]

    def get_permissions(self):
        """Override permissions based on action."""
        if self.action in ['bulk_upload', 'reset_all_data']:
            return [IsAdmin()]  # Admin-only operations
        return [IsChapterOrAdmin()]  # Regular uploads

    def _extract_date_from_filename(self, filename):
        """
        Extract date from slip audit report filename.

        Supports multiple formats:
        - YYYY-MM-DD: slips-audit-report_2025-01-28.xls
        - MM-DD-YYYY: Slips_Audit_Report_08-25-2025_2-26_PM.xls

        Returns month_year in format 'YYYY-MM' or None if not found
        """
        # Try YYYY-MM-DD format first (e.g., 2025-01-28)
        pattern_ymd = r"(\d{4})-(\d{2})-(\d{2})"
        match = re.search(pattern_ymd, filename)
        if match:
            year, month, day = match.groups()
            return f"{year}-{month}"

        # Try MM-DD-YYYY format (e.g., 08-25-2025)
        pattern_mdy = r"(\d{2})-(\d{2})-(\d{4})"
        match = re.search(pattern_mdy, filename)
        if match:
            month, day, year = match.groups()
            return f"{year}-{month}"

        return None

    def _extract_full_date_from_filename(self, filename):
        """
        Extract full date from slip audit report filename.

        Supports multiple formats:
        - YYYY-MM-DD: slips-audit-report_2025-01-28.xls
        - MM-DD-YYYY: Slips_Audit_Report_08-25-2025_2-26_PM.xls

        Returns date object or None if not found
        """
        from datetime import date

        # Try YYYY-MM-DD format first (e.g., 2025-01-28)
        pattern_ymd = r"(\d{4})-(\d{2})-(\d{2})"
        match = re.search(pattern_ymd, filename)
        if match:
            year, month, day = match.groups()
            try:
                return date(int(year), int(month), int(day))
            except ValueError:
                pass

        # Try MM-DD-YYYY format (e.g., 08-25-2025)
        pattern_mdy = r"(\d{2})-(\d{2})-(\d{4})"
        match = re.search(pattern_mdy, filename)
        if match:
            month, day, year = match.groups()
            try:
                return date(int(year), int(month), int(day))
            except ValueError:
                pass

        return None

    @action(detail=False, methods=["post"], url_path="excel")
    def upload_excel(self, request):
        """
        Handle Excel file upload and processing.

        Accepts:
        - slip_audit_file: Required Excel file (.xls/.xlsx)
        - member_names_file: Optional Excel file for member names
        - chapter_id: Chapter to associate with
        - month_year: Optional report month in format 'YYYY-MM' (defaults to current month)
        - upload_option: 'slip_only' or 'slip_and_members'

        Returns processing result with created records and any errors.
        """
        # Log incoming request for debugging
        logger.info(
            f"Excel upload request - Files: {list(request.FILES.keys())}, Data: {list(request.data.keys())}"
        )

        # Handle both new (slip_audit_files) and old (slip_audit_file) format
        slip_files = request.FILES.getlist("slip_audit_files")
        if not slip_files:
            # Try old format for backward compatibility
            single_file = request.FILES.get("slip_audit_file")
            if single_file:
                slip_files = [single_file]

        if not slip_files:
            return Response(
                {"error": "No slip audit files provided"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(
            f"Found {len(slip_files)} slip audit file(s): {[f.name for f in slip_files]}"
        )

        # Get other data from request directly (skip serializer for file lists)
        try:
            slip_audit_files = slip_files
            member_names_file = request.FILES.get("member_names_file")

            # Validate required fields
            if not request.data.get("chapter_id"):
                return Response(
                    {"error": "chapter_id is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            chapter_id = int(request.data.get("chapter_id"))
            month_year = request.data.get("month_year", "").strip() or None
            upload_option = request.data.get("upload_option", "slip_only")
            week_of_date = request.data.get("week_of_date", "").strip() or None
            require_palms_sheets = request.data.get(
                "require_palms_sheets", "false"
            ).lower() in ["true", "1", "yes"]
        except ValueError as e:
            return Response(
                {"error": f"Invalid data format: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            logger.info(f"Processing {len(slip_audit_files)} slip audit file(s)")

            # If month_year not provided, try to extract from first filename (optional, non-blocking)
            if not month_year:
                extracted_date = self._extract_date_from_filename(
                    slip_audit_files[0].name
                )
                if extracted_date:
                    month_year = extracted_date
                    logger.info(f"Extracted date from filename: {month_year}")
                else:
                    # Use current month as default if extraction fails
                    from datetime import datetime

                    month_year = datetime.now().strftime("%Y-%m")
                    logger.info(f"Using current month as default: {month_year}")

            # If week_of_date not provided, try to extract full date from first filename
            if not week_of_date:
                extracted_full_date = self._extract_full_date_from_filename(
                    slip_audit_files[0].name
                )
                if extracted_full_date:
                    week_of_date = extracted_full_date
                    logger.info(f"Extracted week date from filename: {week_of_date}")

            # Convert week_of_date string to date object if needed
            if week_of_date and isinstance(week_of_date, str):
                from datetime import datetime

                try:
                    week_of_date = datetime.strptime(week_of_date, "%Y-%m-%d").date()
                except ValueError:
                    logger.warning(
                        f"Invalid week_of_date format: {week_of_date}, ignoring"
                    )
                    week_of_date = None

            # Validate chapter access
            try:
                chapter = Chapter.objects.get(id=chapter_id)
                # Add permission check here if needed
            except Chapter.DoesNotExist:
                return Response(
                    {"error": "Chapter not found"}, status=status.HTTP_404_NOT_FOUND
                )

            # Validate file types
            for slip_file in slip_audit_files:
                if not slip_file.name.lower().endswith((".xls", ".xlsx")):
                    return Response(
                        {
                            "error": f"Only .xls and .xlsx files are supported. Invalid file: {slip_file.name}"
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            if member_names_file and not member_names_file.name.lower().endswith(
                (".xls", ".xlsx")
            ):
                return Response(
                    {
                        "error": "Only .xls and .xlsx files are supported for member names file"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Process using the new monthly report method
            logger.info(
                f"Starting Excel processing for chapter {chapter.name}, month {month_year}"
            )
            logger.info(
                f"Processing {len(slip_audit_files)} slip audit files: {[f.name for f in slip_audit_files]}"
            )
            processor = ExcelProcessorService(chapter)

            try:
                result = processor.process_monthly_reports_batch(
                    slip_audit_files=slip_audit_files,
                    member_names_file=member_names_file,
                    month_year=month_year,
                    week_of_date=week_of_date,
                    require_palms_sheets=require_palms_sheets,
                )

                logger.info(f"Processing complete - Success: {result.get('success')}")

                # Return appropriate status code based on result
                if result.get("success"):
                    return Response(result, status=status.HTTP_200_OK)
                else:
                    logger.error(
                        f"Processing failed: {result.get('error', 'Unknown error')}"
                    )
                    return Response(result, status=status.HTTP_400_BAD_REQUEST)

            except Exception as proc_error:
                logger.exception(f"Excel processing error: {str(proc_error)}")
                return Response(
                    {
                        "error": f"Excel processing failed: {str(proc_error)}",
                        "success": False,
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        except Exception as e:
            logger.exception(f"Upload endpoint error: {str(e)}")
            return Response(
                {"error": f"Upload failed: {str(e)}", "success": False},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk_upload(self, request):
        """
        Handle Regional PALMS Summary bulk upload.

        Accepts:
        - file: Excel file containing regional summary data

        Processes the file and creates/updates multiple chapters and members.
        Returns summary of operations performed.
        """
        if "file" not in request.FILES:
            return Response(
                {"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST
            )

        file = request.FILES["file"]

        # Validate file type
        if not file.name.endswith((".xls", ".xlsx")):
            return Response(
                {"error": "Invalid file type. Please upload .xls or .xlsx file"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Process the file
            service = BulkUploadService()
            result = service.process_region_summary(file)

            if result["success"]:
                return Response(
                    {
                        "success": True,
                        "message": "Bulk upload completed successfully",
                        "details": {
                            "chapters_created": result["chapters_created"],
                            "chapters_updated": result["chapters_updated"],
                            "members_created": result["members_created"],
                            "members_updated": result["members_updated"],
                            "total_processed": result["total_processed"],
                            "warnings": result["warnings"],
                        },
                    },
                    status=status.HTTP_200_OK,
                )
            else:
                return Response(
                    {
                        "success": False,
                        "message": result.get("error", "Processing failed"),
                        "details": {
                            "errors": result.get("errors", []),
                            "warnings": result.get("warnings", []),
                        },
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except Exception as e:
            logger.exception("Error in bulk upload")
            return Response(
                {"error": f"Processing failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], url_path="reset-all")
    def reset_all_data(self, request):
        """
        Reset all data in the database.

        WARNING: This deletes ALL chapters, members, reports, and analytics data.
        Use with extreme caution!

        Returns summary of deleted items.
        """
        try:
            from chapters.models import Chapter
            from members.models import Member
            from reports.models import MonthlyReport, MemberMonthlyStats
            from analytics.models import Referral, OneToOne, TYFCB

            # Count before deletion
            counts = {
                "chapters": Chapter.objects.count(),
                "members": Member.objects.count(),
                "monthly_reports": MonthlyReport.objects.count(),
                "member_stats": MemberMonthlyStats.objects.count(),
                "referrals": Referral.objects.count(),
                "one_to_ones": OneToOne.objects.count(),
                "tyfcbs": TYFCB.objects.count(),
            }

            # Delete all data (cascade will handle related objects)
            Chapter.objects.all().delete()
            Member.objects.all().delete()
            MonthlyReport.objects.all().delete()
            MemberMonthlyStats.objects.all().delete()
            Referral.objects.all().delete()
            OneToOne.objects.all().delete()
            TYFCB.objects.all().delete()

            logger.warning(f"Database reset performed. Deleted: {counts}")

            return Response(
                {
                    "success": True,
                    "message": "All data has been deleted successfully",
                    "deleted": counts,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.exception("Error resetting database")
            return Response(
                {"error": f"Reset failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
