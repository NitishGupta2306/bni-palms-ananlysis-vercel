"""
Legacy admin file - models moved to feature-based apps.

Admin registrations are now handled in:
- chapters/admin.py
- members/admin.py
- reports/admin.py
- analytics/admin.py
"""
from django.contrib import admin

# Admin registrations moved to feature-based apps
# This file can be deleted once legacy bni app is removed
