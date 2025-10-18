"""
MonthlyReport Matrix ViewSet - Matrix data and member detail endpoints.

Extracted from views.py to improve maintainability and follow Single Responsibility Principle.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from chapters.models import Chapter
from chapters.permissions import IsChapterOrAdmin
from members.models import Member
from reports.models import MonthlyReport, MemberMonthlyStats


class MonthlyReportMatrixViewSet(viewsets.GenericViewSet):
    """
    ViewSet for MonthlyReport matrix data operations.

    Provides endpoints for:
    - member_detail: Detailed member stats with missing interactions
    - tyfcb_data: TYFCB (Thank You For Closed Business) data

    Authentication: IsChapterOrAdmin
    - Chapters can access their own reports
    - Admins can access all reports
    """

    queryset = MonthlyReport.objects.all()
    permission_classes = [IsChapterOrAdmin]
    lookup_url_kwarg = 'pk'

    @action(detail=True, methods=["get"], url_path="members/(?P<member_id>[^/.]+)")
    def member_detail(self, request, pk=None, chapter_id=None, member_id=None):
        """
        Get detailed member information including missing interaction lists.

        Returns member stats and lists of:
        - Missing one-to-ones
        - Missing referrals (given and received)
        - Priority connections (members appearing in multiple missing lists)
        """
        try:
            chapter = Chapter.objects.get(id=chapter_id)
            monthly_report = MonthlyReport.objects.get(id=pk, chapter=chapter)
            member = Member.objects.get(id=member_id, chapter=chapter)

            try:
                member_stats = MemberMonthlyStats.objects.get(
                    member=member, monthly_report=monthly_report
                )
            except MemberMonthlyStats.DoesNotExist:
                # If no stats exist, return basic member info with empty lists
                member_stats = None

            # Get all chapter members for name resolution
            chapter_members = Member.objects.filter(chapter=chapter, is_active=True)
            member_lookup = {m.id: m.full_name for m in chapter_members}

            result = {
                "member": {
                    "id": member.id,
                    "full_name": member.full_name,
                    "first_name": member.first_name,
                    "last_name": member.last_name,
                    "business_name": member.business_name,
                    "classification": member.classification,
                    "email": member.email,
                    "phone": member.phone,
                },
                "stats": {
                    "referrals_given": member_stats.referrals_given
                    if member_stats
                    else 0,
                    "referrals_received": member_stats.referrals_received
                    if member_stats
                    else 0,
                    "one_to_ones_completed": member_stats.one_to_ones_completed
                    if member_stats
                    else 0,
                    "tyfcb_inside_amount": float(member_stats.tyfcb_inside_amount)
                    if member_stats
                    else 0.0,
                    "tyfcb_outside_amount": float(member_stats.tyfcb_outside_amount)
                    if member_stats
                    else 0.0,
                },
                "missing_interactions": {
                    "missing_otos": [
                        {
                            "id": member_id,
                            "name": member_lookup.get(member_id, "Unknown"),
                        }
                        for member_id in (
                            member_stats.missing_otos if member_stats else []
                        )
                        if member_id in member_lookup
                    ],
                    "missing_referrals_given_to": [
                        {
                            "id": member_id,
                            "name": member_lookup.get(member_id, "Unknown"),
                        }
                        for member_id in (
                            member_stats.missing_referrals_given_to
                            if member_stats
                            else []
                        )
                        if member_id in member_lookup
                    ],
                    "missing_referrals_received_from": [
                        {
                            "id": member_id,
                            "name": member_lookup.get(member_id, "Unknown"),
                        }
                        for member_id in (
                            member_stats.missing_referrals_received_from
                            if member_stats
                            else []
                        )
                        if member_id in member_lookup
                    ],
                    "priority_connections": [
                        {
                            "id": member_id,
                            "name": member_lookup.get(member_id, "Unknown"),
                        }
                        for member_id in (
                            member_stats.priority_connections if member_stats else []
                        )
                        if member_id in member_lookup
                    ],
                },
                "monthly_report": {
                    "id": monthly_report.id,
                    "month_year": monthly_report.month_year,
                    "processed_at": monthly_report.processed_at,
                },
            }

            return Response(result)

        except (Chapter.DoesNotExist, MonthlyReport.DoesNotExist, Member.DoesNotExist):
            return Response(
                {"error": "Chapter, monthly report, or member not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"error": f"Member detail retrieval failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get"], url_path="tyfcb")
    def tyfcb_data(self, request, pk=None, chapter_id=None):
        """
        Get TYFCB data for a specific monthly report.

        Returns inside and outside TYFCB data with totals and per-member breakdowns.
        """
        try:
            chapter = Chapter.objects.get(id=chapter_id)
            monthly_report = MonthlyReport.objects.get(id=pk, chapter=chapter)

            tyfcb_data = {
                "inside": monthly_report.tyfcb_inside_data
                or {"total_amount": 0, "count": 0, "by_member": {}},
                "outside": monthly_report.tyfcb_outside_data
                or {"total_amount": 0, "count": 0, "by_member": {}},
                "month_year": monthly_report.month_year,
                "processed_at": monthly_report.processed_at,
            }

            return Response(tyfcb_data)

        except Chapter.DoesNotExist:
            return Response(
                {"error": "Chapter not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except MonthlyReport.DoesNotExist:
            return Response(
                {"error": "Monthly report not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to get TYFCB data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
