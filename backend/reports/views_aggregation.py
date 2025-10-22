"""
MonthlyReport Aggregation ViewSet - Multi-month report aggregation endpoints.

Extracted from views.py to improve maintainability and follow Single Responsibility Principle.
"""

import logging
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from chapters.models import Chapter
from chapters.permissions import IsChapterOrAdmin
from reports.models import MonthlyReport
from bni.services.multi_month_report_service import AggregationService

logger = logging.getLogger(__name__)


class MonthlyReportAggregationViewSet(viewsets.GenericViewSet):
    """
    ViewSet for MonthlyReport aggregation operations.

    Provides endpoints for:
    - aggregate_reports: Aggregate multiple reports into combined analysis
    - download_aggregated: Download comprehensive aggregated Excel file

    Authentication: IsChapterOrAdmin
    - Chapters can aggregate their own reports
    - Admins can aggregate any chapter's reports
    """

    queryset = MonthlyReport.objects.all()
    permission_classes = [IsChapterOrAdmin]

    @action(detail=False, methods=["post"], url_path="aggregate")
    def aggregate_reports(self, request, chapter_id=None):
        """
        Aggregate multiple monthly reports into combined analysis.

        Request body:
            {
                "report_ids": [1, 2, 3, ...]
            }

        Returns:
            - Aggregated matrices (referral, OTO, combination)
            - TYFCB data
            - Member completeness information
            - Month range and metadata
        """
        try:
            chapter = Chapter.objects.get(id=chapter_id)
            report_ids = request.data.get("report_ids", [])

            if not report_ids:
                return Response(
                    {"error": "No report IDs provided"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Fetch reports
            reports = MonthlyReport.objects.filter(
                id__in=report_ids, chapter=chapter
            ).order_by("month_year")

            if not reports.exists():
                return Response(
                    {"error": "No valid reports found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Create aggregation service and process
            aggregation_service = AggregationService(list(reports))
            aggregated_data = aggregation_service.aggregate_matrices()
            member_differences = aggregation_service.get_member_differences()

            # Add member differences to response
            aggregated_data["member_differences"] = member_differences

            return Response(aggregated_data)

        except Chapter.DoesNotExist:
            return Response(
                {"error": "Chapter not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.exception(f"Aggregation failed for chapter {chapter_id}")
            return Response(
                {"error": f"Aggregation failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], url_path="aggregate/download")
    def download_aggregated(self, request, chapter_id=None):
        """
        Download comprehensive Excel file with aggregated analysis.

        Request body:
            {
                "report_ids": [1, 2, 3, ...]
            }

        Returns:
            Single Excel file containing:
            - Summary sheet
            - Aggregated matrices (Referral, OTO, Combination)
            - TYFCB data (Inside & Outside)
            - Member differences (Inactive members)
        """
        try:
            chapter = Chapter.objects.get(id=chapter_id)
            report_ids = request.data.get("report_ids", [])

            if not report_ids:
                return Response(
                    {"error": "No report IDs provided"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Fetch reports
            reports = MonthlyReport.objects.filter(
                id__in=report_ids, chapter=chapter
            ).order_by("month_year")

            if not reports.exists():
                return Response(
                    {"error": "No valid reports found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Create aggregation service and generate comprehensive Excel file
            aggregation_service = AggregationService(list(reports))
            excel_buffer = aggregation_service.generate_download_package()

            # Create HTTP response with Excel file
            month_range = aggregation_service._get_period_display()
            filename = (
                f"{chapter.name.replace(' ', '_')}_Aggregated_Report_{month_range}.xlsx"
            )

            response = HttpResponse(
                excel_buffer.getvalue(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = f'attachment; filename="{filename}"'

            return response

        except Chapter.DoesNotExist:
            return Response(
                {"error": "Chapter not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.exception(f"Download generation failed for chapter {chapter_id}")
            return Response(
                {"error": f"Download generation failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
