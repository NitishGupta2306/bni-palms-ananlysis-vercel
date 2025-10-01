from django.contrib import admin
from analytics.models import Referral, OneToOne, TYFCB, DataImportSession


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ('giver', 'receiver', 'date_given', 'week_of')
    search_fields = ('giver__first_name', 'giver__last_name', 'receiver__first_name', 'receiver__last_name')
    list_filter = ('date_given', 'giver__chapter')
    ordering = ('-date_given',)
    readonly_fields = ('created_at',)


@admin.register(OneToOne)
class OneToOneAdmin(admin.ModelAdmin):
    list_display = ('member1', 'member2', 'meeting_date', 'week_of', 'duration_minutes')
    search_fields = ('member1__first_name', 'member1__last_name', 'member2__first_name', 'member2__last_name')
    list_filter = ('meeting_date', 'member1__chapter')
    ordering = ('-meeting_date',)
    readonly_fields = ('created_at',)


@admin.register(TYFCB)
class TYFCBAdmin(admin.ModelAdmin):
    list_display = ('giver', 'receiver', 'amount', 'currency', 'within_chapter', 'date_closed')
    search_fields = ('giver__first_name', 'giver__last_name', 'receiver__first_name', 'receiver__last_name')
    list_filter = ('date_closed', 'within_chapter', 'currency', 'receiver__chapter')
    ordering = ('-date_closed',)
    readonly_fields = ('created_at',)


@admin.register(DataImportSession)
class DataImportSessionAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'chapter', 'import_date', 'records_processed', 'success', 'imported_by')
    search_fields = ('file_name', 'chapter__name')
    list_filter = ('success', 'import_date', 'chapter')
    ordering = ('-import_date',)
    readonly_fields = ('import_date',)
