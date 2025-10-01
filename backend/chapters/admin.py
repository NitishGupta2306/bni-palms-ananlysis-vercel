from django.contrib import admin
from chapters.models import Chapter


@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'meeting_day', 'meeting_time', 'created_at')
    search_fields = ('name', 'location')
    list_filter = ('meeting_day',)
    ordering = ('name',)
