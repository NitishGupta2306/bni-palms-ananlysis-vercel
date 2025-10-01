"""
URL configuration for BNI API.

Uses Django REST Framework routers for ViewSet-based endpoints.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from chapters.views import ChapterViewSet
from members.views import MemberViewSet
from reports.views import MonthlyReportViewSet
from analytics.views import MatrixViewSet, ComparisonViewSet
from uploads.views import FileUploadViewSet

# Main router for top-level resources
router = DefaultRouter()
router.register(r'chapters', ChapterViewSet, basename='chapter')
router.register(r'upload', FileUploadViewSet, basename='upload')

urlpatterns = [
    # Dashboard endpoint (list view of chapters)
    path('dashboard/', ChapterViewSet.as_view({'get': 'list'}), name='dashboard'),

    # Include main router
    path('', include(router.urls)),

    # Nested routes for chapters/{chapter_id}/members/
    path('chapters/<int:chapter_pk>/members/',
         MemberViewSet.as_view({'get': 'list', 'post': 'create'}),
         name='chapter-members-list'),
    path('chapters/<int:chapter_pk>/members/<int:pk>/',
         MemberViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
         name='chapter-members-detail'),
    path('chapters/<int:chapter_pk>/members/<str:member_name>/analytics/',
         MemberViewSet.as_view({'get': 'analytics'}),
         name='chapter-members-analytics'),

    # Nested routes for chapters/{chapter_id}/reports/
    path('chapters/<int:chapter_id>/reports/',
         MonthlyReportViewSet.as_view({'get': 'list'}),
         name='chapter-reports-list'),
    path('chapters/<int:chapter_id>/reports/<int:pk>/',
         MonthlyReportViewSet.as_view({'delete': 'destroy'}),
         name='chapter-reports-detail'),

    # Member detail within report
    path('chapters/<int:chapter_id>/reports/<int:pk>/members/<int:member_id>/',
         MonthlyReportViewSet.as_view({'get': 'member_detail'}),
         name='chapter-reports-member-detail'),

    # TYFCB data for report
    path('chapters/<int:chapter_id>/reports/<int:pk>/tyfcb-data/',
         MonthlyReportViewSet.as_view({'get': 'tyfcb_data'}),
         name='chapter-reports-tyfcb'),

    # Download matrices as Excel
    path('chapters/<int:chapter_id>/reports/<int:pk>/download-matrices/',
         MonthlyReportViewSet.as_view({'get': 'download_matrices'}),
         name='chapter-reports-download-matrices'),

    # Matrix endpoints: chapters/{chapter_id}/reports/{report_id}/matrices/
    path('chapters/<int:chapter_id>/reports/<int:report_id>/referral-matrix/',
         MatrixViewSet.as_view({'get': 'referral_matrix'}),
         name='report-referral-matrix'),
    path('chapters/<int:chapter_id>/reports/<int:report_id>/one-to-one-matrix/',
         MatrixViewSet.as_view({'get': 'one_to_one_matrix'}),
         name='report-oto-matrix'),
    path('chapters/<int:chapter_id>/reports/<int:report_id>/combination-matrix/',
         MatrixViewSet.as_view({'get': 'combination_matrix'}),
         name='report-combination-matrix'),

    # Comparison endpoints: chapters/{chapter_id}/reports/{report_id}/compare/{previous_report_id}/
    path('chapters/<int:chapter_id>/reports/<int:report_id>/compare/<int:previous_report_id>/',
         ComparisonViewSet.as_view({'get': 'compare_comprehensive'}),
         name='report-compare-comprehensive'),
    path('chapters/<int:chapter_id>/reports/<int:report_id>/compare/<int:previous_report_id>/referrals/',
         ComparisonViewSet.as_view({'get': 'compare_referral'}),
         name='report-compare-referral'),
    path('chapters/<int:chapter_id>/reports/<int:report_id>/compare/<int:previous_report_id>/one-to-ones/',
         ComparisonViewSet.as_view({'get': 'compare_oto'}),
         name='report-compare-oto'),
    path('chapters/<int:chapter_id>/reports/<int:report_id>/compare/<int:previous_report_id>/combination/',
         ComparisonViewSet.as_view({'get': 'compare_combination'}),
         name='report-compare-combination'),
    path('chapters/<int:chapter_id>/reports/<int:report_id>/compare/<int:previous_report_id>/download-excel/',
         ComparisonViewSet.as_view({'get': 'download_comparison_excel'}),
         name='report-compare-download-excel'),
]
