from django.contrib import admin
from chapters.models import Chapter, AdminSettings


@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "location",
        "password",
        "failed_login_attempts",
        "meeting_day",
        "meeting_time",
        "created_at",
    )
    search_fields = ("name", "location")
    list_filter = ("meeting_day",)
    ordering = ("name",)
    fields = (
        "name",
        "location",
        "meeting_day",
        "meeting_time",
        "password",
        "failed_login_attempts",
        "lockout_until",
    )
    readonly_fields = (
        "failed_login_attempts",
        "lockout_until",
        "created_at",
        "updated_at",
    )


@admin.register(AdminSettings)
class AdminSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "admin_password",
        "failed_admin_attempts",
        "admin_lockout_until",
    )
    fields = ("admin_password", "failed_admin_attempts", "admin_lockout_until")
    readonly_fields = ("failed_admin_attempts", "admin_lockout_until")

    def has_add_permission(self, request):
        # Prevent adding more than one instance (singleton)
        return not AdminSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        # Prevent deletion
        return False
