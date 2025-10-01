from django.contrib import admin
from members.models import Member


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'chapter', 'business_name', 'classification', 'is_active')
    search_fields = ('first_name', 'last_name', 'business_name', 'email')
    list_filter = ('chapter', 'is_active', 'classification')
    ordering = ('chapter', 'first_name', 'last_name')
    readonly_fields = ('normalized_name', 'created_at', 'updated_at')
