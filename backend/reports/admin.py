from django.contrib import admin
from reports.models import MonthlyReport, MemberMonthlyStats


@admin.register(MonthlyReport)
class MonthlyReportAdmin(admin.ModelAdmin):
    list_display = ('chapter', 'month_year', 'uploaded_at', 'processed_at')
    search_fields = ('chapter__name', 'month_year')
    list_filter = ('chapter', 'month_year')
    ordering = ('-month_year', 'chapter')
    readonly_fields = ('uploaded_at', 'processed_at')


@admin.register(MemberMonthlyStats)
class MemberMonthlyStatsAdmin(admin.ModelAdmin):
    list_display = ('member', 'monthly_report', 'referrals_given', 'referrals_received', 'one_to_ones_completed')
    search_fields = ('member__first_name', 'member__last_name', 'monthly_report__month_year')
    list_filter = ('monthly_report__chapter', 'monthly_report__month_year')
    ordering = ('monthly_report', 'member')
