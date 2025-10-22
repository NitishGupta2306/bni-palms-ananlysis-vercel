"""
Member ViewSet - RESTful API for Member management

Authentication:
- All endpoints require authentication (IsChapterOrAdmin)
- Chapters can only access their own members
- Admins can access all members
"""
from typing import Type
from urllib.parse import unquote
from django.conf import settings
from django.db import models, transaction
from django.db.models import QuerySet
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.serializers import Serializer

from chapters.models import Chapter
from chapters.permissions import IsChapterOrAdmin
from members.models import Member
from analytics.models import Referral, OneToOne, TYFCB
from bni.serializers import MemberSerializer, MemberCreateSerializer, MemberUpdateSerializer
from bni.services.member_service import MemberService


class MemberViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Member CRUD operations and analytics.

    Nested under /api/chapters/{chapter_id}/members/

    Permissions:
    - Chapters can access their own members
    - Admins can access all members
    """
    serializer_class = MemberSerializer
    permission_classes = [IsChapterOrAdmin]

    def get_queryset(self) -> QuerySet:
        """Filter members by chapter from URL."""
        chapter_id = self.kwargs.get('chapter_pk')
        if chapter_id:
            return Member.objects.filter(chapter_id=chapter_id, is_active=True)
        return Member.objects.filter(is_active=True)

    def get_serializer_class(self) -> Type[Serializer]:
        """Use different serializers for create/update."""
        if self.action == 'create':
            return MemberCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return MemberUpdateSerializer
        return MemberSerializer

    @transaction.atomic
    def create(self, request: Request, chapter_pk=None) -> Response:
        """
        Create a new member in the specified chapter.

        Uses @transaction.atomic to ensure member creation and normalization
        complete successfully or rollback entirely. This prevents partial
        member records if any step fails.
        """
        try:
            chapter = Chapter.objects.get(id=chapter_pk)
        except Chapter.DoesNotExist:
            return Response(
                {'error': 'Chapter not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Validate required fields
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')

        if not first_name or not last_name:
            return Response(
                {'error': 'first_name and last_name are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Use MemberService to create member
        service = MemberService()
        member, created = service.get_or_create_member(
            chapter=chapter,
            first_name=first_name,
            last_name=last_name,
            business_name=request.data.get('business_name', ''),
            classification=request.data.get('classification', ''),
            email=request.data.get('email', ''),
            phone=request.data.get('phone', ''),
            is_active=request.data.get('is_active', True),
            joined_date=request.data.get('joined_date')
        )

        serializer = MemberSerializer(member)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @transaction.atomic
    def update(self, request: Request, pk=None, chapter_pk=None) -> Response:
        """
        Update member information.

        Uses @transaction.atomic to ensure all member field updates and
        normalized name recalculation complete successfully or rollback entirely.
        This prevents partial updates if any step fails.
        """
        try:
            member = Member.objects.get(id=pk, chapter_id=chapter_pk)
        except Member.DoesNotExist:
            return Response(
                {'error': 'Member not found in this chapter'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Use MemberService to update
        service = MemberService()
        updated_member = service.update_member(member.id, request.data)

        serializer = MemberSerializer(updated_member)
        return Response(serializer.data)

    def partial_update(self, request: Request, pk=None, chapter_pk=None) -> Response:
        """Partially update member information."""
        return self.update(request, pk, chapter_pk)

    @transaction.atomic
    def destroy(self, request: Request, pk=None, chapter_pk=None) -> Response:
        """
        Delete a member and all associated data.

        Uses @transaction.atomic to ensure member deletion and all cascade
        deletions (referrals, one-to-ones, TYFCBs) complete successfully or
        rollback entirely. This prevents orphaned records if deletion fails
        partway through.
        """
        try:
            member = Member.objects.get(id=pk, chapter_id=chapter_pk)
        except Member.DoesNotExist:
            return Response(
                {'error': 'Member not found in this chapter'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Use MemberService to delete
        service = MemberService()
        result = service.delete_member(member.id)

        return Response({
            'message': f"Member '{member.full_name}' deleted successfully",
            'referrals_deleted': result['referrals_deleted'],
            'one_to_ones_deleted': result['one_to_ones_deleted'],
            'tyfcbs_deleted': result['tyfcbs_deleted']
        })

    @action(detail=False, methods=['get'], url_path='(?P<member_name>[^/.]+)/analytics')
    def analytics(self, request: Request, chapter_pk=None, member_name=None) -> Response:
        """
        Get comprehensive analytics for a member.

        URL: /api/chapters/{chapter_id}/members/{member_name}/analytics/
        """
        # URL decode the member name
        member_name = unquote(member_name)

        try:
            chapter = Chapter.objects.get(id=chapter_pk)
        except Chapter.DoesNotExist:
            return Response(
                {'error': 'Chapter not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Find member by name (case insensitive)
        normalized_name = Member.normalize_name(member_name)
        try:
            member = Member.objects.get(chapter=chapter, normalized_name=normalized_name)
        except Member.DoesNotExist:
            return Response(
                {'error': f'Member "{member_name}" not found in this chapter'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get all chapter members for gap analysis
        all_members = Member.objects.filter(chapter=chapter, is_active=True).exclude(id=member.id)
        total_members = all_members.count()

        # Calculate performance metrics (optimized with select_related)
        referrals_given = Referral.objects.filter(giver=member).count()
        referrals_received = Referral.objects.filter(receiver=member).count()

        # Get one-to-ones (optimized: prefetch related members to avoid N+1)
        otos = OneToOne.objects.filter(
            models.Q(member1=member) | models.Q(member2=member)
        ).select_related('member1', 'member2')
        oto_count = otos.count()

        # Get unique OTO partners (no additional queries due to select_related above)
        oto_partners = set()
        for oto in otos:
            partner = oto.member2 if oto.member1 == member else oto.member1
            oto_partners.add(partner.id)

        # Get referral relationships (optimized: values_list prevents extra queries)
        referral_givers = set(Referral.objects.filter(receiver=member).values_list('giver_id', flat=True))
        referral_receivers = set(Referral.objects.filter(giver=member).values_list('receiver_id', flat=True))

        # Get TYFCB data (optimized: use single query with aggregate)
        tyfcb_aggregates = TYFCB.objects.filter(receiver=member).aggregate(
            total=models.Sum('amount'),
            inside=models.Sum('amount', filter=models.Q(within_chapter=True)),
            outside=models.Sum('amount', filter=models.Q(within_chapter=False))
        )
        total_tyfcb = float(tyfcb_aggregates['total'] or 0)
        tyfcb_inside = float(tyfcb_aggregates['inside'] or 0)
        tyfcb_outside = float(tyfcb_aggregates['outside'] or 0)

        # Calculate gaps
        all_member_ids = set(all_members.values_list('id', flat=True))
        missing_otos = all_member_ids - oto_partners
        missing_referrals_given = all_member_ids - referral_receivers
        missing_referrals_received = all_member_ids - referral_givers

        # Find priority connections (in multiple missing lists)
        priority_connections = (
            (missing_otos & missing_referrals_given) |
            (missing_otos & missing_referrals_received) |
            (missing_referrals_given & missing_referrals_received)
        )

        # Get member details for priority connections (optimized: single query with in lookup)
        priority_members_qs = Member.objects.filter(id__in=priority_connections).only(
            'id', 'first_name', 'last_name', 'business_name', 'classification'
        )
        priority_members = [
            {
                'id': m.id,
                'name': m.full_name,
                'business_name': m.business_name,
                'classification': m.classification
            }
            for m in priority_members_qs
        ]

        # Calculate completion rates
        oto_completion = round((oto_count / total_members * 100), 1) if total_members > 0 else 0
        referral_completion = round((len(referral_receivers) / total_members * 100), 1) if total_members > 0 else 0

        # Performance scores
        oto_score = min(100, round((oto_count / total_members) * 100, 1)) if total_members > 0 else 0
        referral_score = min(100, round((referrals_given / total_members) * 50, 1)) if total_members > 0 else 0
        tyfcb_score = min(100, round(total_tyfcb / 1000, 1))  # Score based on AED amounts
        overall_score = round((oto_score + referral_score + tyfcb_score) / 3, 1)

        # Generate AI recommendations
        recommendations = []
        if oto_completion < 50:
            recommendations.append({
                'type': 'warning',
                'category': 'one_to_ones',
                'message': f'Low 1-2-1 completion rate ({oto_completion}%). Focus on scheduling more meetings.',
                'priority': 'high'
            })

        if len(priority_connections) > 0:
            recommendations.append({
                'type': 'action',
                'category': 'priority_connections',
                'message': f'Connect with {len(priority_connections)} priority members to maximize impact.',
                'priority': 'high'
            })

        activity_threshold = settings.BNI_CONFIG['MEMBER_ACTIVITY_THRESHOLD']
        if referrals_given < total_members * activity_threshold:
            recommendations.append({
                'type': 'warning',
                'category': 'referrals',
                'message': 'Increase referral giving to strengthen relationships.',
                'priority': 'medium'
            })

        if overall_score >= 80:
            recommendations.append({
                'type': 'success',
                'category': 'performance',
                'message': 'Excellent performance! Keep up the great networking.',
                'priority': 'low'
            })

        return Response({
            'member': {
                'id': member.id,
                'name': member.full_name,
                'business_name': member.business_name,
                'classification': member.classification
            },
            'performance': {
                'referrals_given': referrals_given,
                'referrals_received': referrals_received,
                'one_to_ones': oto_count,
                'tyfcb_total': total_tyfcb,
                'tyfcb_inside': tyfcb_inside,
                'tyfcb_outside': tyfcb_outside
            },
            'scores': {
                'overall': overall_score,
                'one_to_one': oto_score,
                'referral': referral_score,
                'tyfcb': tyfcb_score
            },
            'completion_rates': {
                'one_to_ones': oto_completion,
                'referrals': referral_completion
            },
            'gaps': {
                'missing_otos': list(missing_otos),
                'missing_referrals_given': list(missing_referrals_given),
                'missing_referrals_received': list(missing_referrals_received),
                'priority_connections': priority_members
            },
            'recommendations': recommendations
        })
