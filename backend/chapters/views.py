"""
Chapter ViewSet - RESTful API for Chapter management
"""

from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from chapters.models import Chapter
from members.models import Member
from analytics.models import Referral, OneToOne, TYFCB
from reports.models import MonthlyReport
from bni.serializers import ChapterSerializer
from bni.services.chapter_service import ChapterService


class ChapterViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Chapter CRUD operations and dashboard.

    Provides:
    - list: Dashboard with all chapters and statistics
    - retrieve: Detailed chapter information with members
    - create: Create new chapter
    - destroy: Delete chapter and all members
    """

    queryset = Chapter.objects.all()
    serializer_class = ChapterSerializer
    permission_classes = [AllowAny]  # TODO: Add proper authentication

    def list(self, request):
        """
        Get dashboard data for all chapters.

        OPTIMIZED for Supabase/Vercel serverless with minimal queries.
        Uses aggregation and prefetch_related to avoid N+1 queries.
        """
        from django.db.models import Count, Sum, Prefetch
        import logging

        logger = logging.getLogger(__name__)

        try:
            # Single query to get all chapters with aggregated stats
            chapters = (
                self.get_queryset()
                .prefetch_related(
                    Prefetch(
                        "members",
                        queryset=Member.objects.filter(is_active=True).only(
                            "id",
                            "first_name",
                            "last_name",
                            "business_name",
                            "classification",
                            "email",
                            "phone",
                            "chapter_id",
                        ),
                    )
                )
                .annotate(
                    active_member_count=Count(
                        "members",
                        filter=models.Q(members__is_active=True),
                        distinct=True,
                    ),
                    report_count=Count("monthly_reports", distinct=True),
                )
            )

            # Get all analytics data in batch queries
            chapter_ids = [c.id for c in chapters]
        except Exception as e:
            logger.exception(f"Error fetching chapters: {str(e)}")
            return Response(
                {"error": f"Failed to fetch chapters: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            # Batch query for referral counts
            referral_stats = (
                Referral.objects.filter(giver__chapter_id__in=chapter_ids)
                .values("giver__chapter_id")
                .annotate(total=Count("id"))
            )
            referral_dict = {r["giver__chapter_id"]: r["total"] for r in referral_stats}

            # Batch query for one-to-one counts
            oto_stats = (
                OneToOne.objects.filter(member1__chapter_id__in=chapter_ids)
                .values("member1__chapter_id")
                .annotate(total=Count("id"))
            )
            oto_dict = {o["member1__chapter_id"]: o["total"] for o in oto_stats}

            # Batch query for TYFCB amounts
            tyfcb_stats = (
                TYFCB.objects.filter(receiver__chapter_id__in=chapter_ids)
                .values("receiver__chapter_id", "within_chapter")
                .annotate(total=Sum("amount"))
            )
            tyfcb_dict = {}
            for t in tyfcb_stats:
                chapter_id = t["receiver__chapter_id"]
                if chapter_id not in tyfcb_dict:
                    tyfcb_dict[chapter_id] = {"inside": 0, "outside": 0}
                if t["within_chapter"]:
                    tyfcb_dict[chapter_id]["inside"] = float(t["total"] or 0)
                else:
                    tyfcb_dict[chapter_id]["outside"] = float(t["total"] or 0)
        except Exception as e:
            logger.exception(f"Error fetching analytics data: {str(e)}")
            return Response(
                {"error": f"Failed to fetch analytics data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Build response
        chapter_data = []
        try:
            for chapter in chapters:
                member_count = chapter.active_member_count
                total_referrals = referral_dict.get(chapter.id, 0)
                total_one_to_ones = oto_dict.get(chapter.id, 0)
                tyfcb_data = tyfcb_dict.get(chapter.id, {"inside": 0, "outside": 0})
                total_tyfcb_inside = tyfcb_data["inside"]
                total_tyfcb_outside = tyfcb_data["outside"]

                # Calculate averages
                avg_referrals = (
                    round(total_referrals / member_count, 2) if member_count > 0 else 0
                )
                avg_one_to_ones = (
                    round(total_one_to_ones / member_count, 2)
                    if member_count > 0
                    else 0
                )
                avg_tyfcb_inside = (
                    round(total_tyfcb_inside / member_count, 2)
                    if member_count > 0
                    else 0
                )
                avg_tyfcb_outside = (
                    round(total_tyfcb_outside / member_count, 2)
                    if member_count > 0
                    else 0
                )

                # Prepare member list from prefetched data
                member_list = [
                    {
                        "id": member.id,
                        "name": member.full_name,
                        "business_name": member.business_name,
                        "classification": member.classification,
                        "email": member.email,
                        "phone": member.phone,
                    }
                    for member in chapter.members.all()
                ]

                chapter_data.append(
                    {
                        "id": chapter.id,
                        "name": chapter.name,
                        "location": chapter.location,
                        "meeting_day": chapter.meeting_day,
                        "meeting_time": str(chapter.meeting_time)
                        if chapter.meeting_time
                        else None,
                        "total_members": member_count,
                        "monthly_reports_count": chapter.report_count,
                        "total_referrals": total_referrals,
                        "total_one_to_ones": total_one_to_ones,
                        "total_tyfcb_inside": total_tyfcb_inside,
                        "total_tyfcb_outside": total_tyfcb_outside,
                        "avg_referrals_per_member": avg_referrals,
                        "avg_one_to_ones_per_member": avg_one_to_ones,
                        "avg_tyfcb_inside_per_member": avg_tyfcb_inside,
                        "avg_tyfcb_outside_per_member": avg_tyfcb_outside,
                        "members": member_list,
                    }
                )
        except Exception as e:
            logger.exception(f"Error building response: {str(e)}")
            return Response(
                {"error": f"Failed to build response: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(chapter_data)

    def retrieve(self, request, pk=None):
        """
        Get detailed information for a specific chapter.

        Returns chapter details with all active members and their full information.
        """
        try:
            chapter = self.get_object()
        except Chapter.DoesNotExist:
            return Response(
                {"error": "Chapter not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Get all members (frontend will filter by status)
        members = Member.objects.filter(chapter=chapter)

        # Calculate performance metrics
        total_referrals = Referral.objects.filter(giver__chapter=chapter).count()
        total_one_to_ones = OneToOne.objects.filter(member1__chapter=chapter).count()
        total_tyfcb = float(
            TYFCB.objects.filter(receiver__chapter=chapter).aggregate(
                total=models.Sum("amount")
            )["total"]
            or 0
        )

        # Prepare member details
        member_details = []
        for member in members:
            # Get individual member stats
            referrals_given = Referral.objects.filter(giver=member).count()
            referrals_received = Referral.objects.filter(receiver=member).count()
            otos = OneToOne.objects.filter(
                models.Q(member1=member) | models.Q(member2=member)
            ).count()
            tyfcb_received = float(
                TYFCB.objects.filter(receiver=member).aggregate(
                    total=models.Sum("amount")
                )["total"]
                or 0
            )

            member_details.append(
                {
                    "id": member.id,
                    "first_name": member.first_name,
                    "last_name": member.last_name,
                    "full_name": member.full_name,
                    "business_name": member.business_name,
                    "classification": member.classification,
                    "email": member.email,
                    "phone": member.phone,
                    "is_active": member.is_active,
                    "joined_date": member.joined_date,
                    "referrals_given": referrals_given,
                    "referrals_received": referrals_received,
                    "one_to_ones": otos,
                    "tyfcb_received": tyfcb_received,
                }
            )

        chapter_data = {
            "id": chapter.id,
            "name": chapter.name,
            "location": chapter.location,
            "meeting_day": chapter.meeting_day,
            "meeting_time": str(chapter.meeting_time) if chapter.meeting_time else None,
            "created_at": chapter.created_at,
            "updated_at": chapter.updated_at,
            "total_members": members.count(),
            "total_referrals": total_referrals,
            "total_one_to_ones": total_one_to_ones,
            "total_tyfcb": total_tyfcb,
            "members": member_details,
        }

        return Response(chapter_data)

    def create(self, request):
        """
        Create a new chapter.

        Uses ChapterService for centralized chapter creation logic.
        Returns 201 if created, 200 if already exists.
        """
        name = request.data.get("name")
        if not name:
            return Response(
                {"error": "Chapter name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        location = request.data.get("location", "Dubai")
        meeting_day = request.data.get("meeting_day", "")
        meeting_time = request.data.get("meeting_time")

        chapter, created = ChapterService.get_or_create_chapter(
            name=name,
            location=location,
            meeting_day=meeting_day,
            meeting_time=meeting_time,
        )

        serializer = self.get_serializer(chapter)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def destroy(self, request, pk=None):
        """
        Delete a chapter and all associated members.

        Uses ChapterService for centralized deletion logic.
        Returns count of deleted members.
        """
        try:
            chapter = self.get_object()
        except Chapter.DoesNotExist:
            return Response(
                {"error": "Chapter not found"}, status=status.HTTP_404_NOT_FOUND
            )

        result = ChapterService.delete_chapter(chapter.id)

        return Response(
            {
                "message": f"Chapter '{chapter.name}' deleted successfully",
                "members_deleted": result["members_deleted"],
            }
        )

    @action(detail=True, methods=["post"], permission_classes=[AllowAny])
    def authenticate(self, request, pk=None):
        """
        Authenticate a user to access a specific chapter.

        Request body: {"password": "chapter_password"}
        Response: {"token": "jwt_token", "chapter": {...}} or error with attempts_remaining
        """
        from chapters.utils import generate_chapter_token
        from bni.serializers import ChapterAuthSerializer, ChapterPublicSerializer
        from django.utils import timezone

        chapter = self.get_object()
        serializer = ChapterAuthSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Check if locked out
        if chapter.is_locked_out():
            lockout_remaining = (chapter.lockout_until - timezone.now()).total_seconds()
            minutes_remaining = int(lockout_remaining / 60) + 1
            return Response(
                {
                    "error": f"Too many failed attempts. Please try again in {minutes_remaining} minutes.",
                    "locked_out": True,
                    "retry_after_minutes": minutes_remaining,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Verify password using secure comparison
        password = serializer.validated_data["password"]
        if chapter.check_password(password):
            # Success - generate token and reset attempts
            token = generate_chapter_token(chapter.id)
            chapter.reset_failed_attempts()

            chapter_serializer = ChapterPublicSerializer(chapter)
            return Response(
                {
                    "token": token,
                    "chapter": chapter_serializer.data,
                    "expires_in_hours": 24,
                }
            )
        else:
            # Failed attempt
            chapter.increment_failed_attempts()
            attempts_remaining = max(0, 5 - chapter.failed_login_attempts)

            return Response(
                {"error": "Invalid password", "attempts_remaining": attempts_remaining},
                status=status.HTTP_401_UNAUTHORIZED,
            )

    @action(detail=True, methods=["post"])
    def update_password(self, request, pk=None):
        """
        Update a chapter's password (admin only).

        Request body: {"new_password": "new_password"}
        Requires admin authentication token.
        """
        from bni.serializers import UpdatePasswordSerializer

        # TODO: Add admin auth check here once middleware is implemented

        chapter = self.get_object()
        serializer = UpdatePasswordSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_password = serializer.validated_data["new_password"]
        chapter.set_password(new_password)  # Use set_password for hashing
        chapter.reset_failed_attempts()
        chapter.save()

        return Response(
            {
                "success": True,
                "message": f'Password for chapter "{chapter.name}" updated successfully',
            }
        )


class AdminAuthViewSet(viewsets.ViewSet):
    """ViewSet for admin authentication."""

    permission_classes = [AllowAny]

    @action(detail=False, methods=["post"])
    def authenticate(self, request):
        """
        Authenticate admin user.

        Request body: {"password": "admin_password"}
        Response: {"token": "jwt_token"} or error with attempts_remaining
        """
        from chapters.models import AdminSettings
        from chapters.utils import generate_admin_token
        from bni.serializers import AdminAuthSerializer
        from django.utils import timezone

        admin_settings = AdminSettings.load()
        serializer = AdminAuthSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Check if locked out
        if admin_settings.is_locked_out():
            lockout_remaining = (
                admin_settings.admin_lockout_until - timezone.now()
            ).total_seconds()
            minutes_remaining = int(lockout_remaining / 60) + 1
            return Response(
                {
                    "error": f"Too many failed attempts. Please try again in {minutes_remaining} minutes.",
                    "locked_out": True,
                    "retry_after_minutes": minutes_remaining,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Verify password using secure comparison
        password = serializer.validated_data["password"]
        if admin_settings.check_password(password):
            # Success - generate token and reset attempts
            token = generate_admin_token()
            admin_settings.reset_failed_attempts()

            return Response({"token": token, "expires_in_hours": 24})
        else:
            # Failed attempt
            admin_settings.increment_failed_attempts()
            attempts_remaining = max(0, 5 - admin_settings.failed_admin_attempts)

            return Response(
                {"error": "Invalid password", "attempts_remaining": attempts_remaining},
                status=status.HTTP_401_UNAUTHORIZED,
            )

    @action(detail=False, methods=["post"])
    def update_password(self, request):
        """
        Update admin password (admin only).

        Request body: {"new_password": "new_password"}
        Requires admin authentication token.
        """
        from chapters.models import AdminSettings
        from bni.serializers import UpdatePasswordSerializer

        # TODO: Add admin auth check here once middleware is implemented

        admin_settings = AdminSettings.load()
        serializer = UpdatePasswordSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_password = serializer.validated_data["new_password"]
        admin_settings.set_password(new_password)  # Use set_password for hashing
        admin_settings.reset_failed_attempts()
        admin_settings.save()

        return Response(
            {"success": True, "message": "Admin password updated successfully"}
        )

    @action(detail=False, methods=["get"], url_path="get-settings")
    def get_settings(self, request):
        """
        Get all security settings including admin password and all chapter passwords.

        Response includes:
        - admin_password: Current admin password
        - chapters: List of all chapters with their passwords
        """
        from chapters.models import AdminSettings

        # TODO: Add admin auth check here once middleware is implemented

        admin_settings = AdminSettings.load()
        chapters = Chapter.objects.all()

        chapters_data = [
            {
                "id": chapter.id,
                "name": chapter.name,
                "location": chapter.location,
                "password": chapter.password,
            }
            for chapter in chapters
        ]

        return Response(
            {
                "admin_password": admin_settings.admin_password,
                "chapters": chapters_data,
            }
        )
