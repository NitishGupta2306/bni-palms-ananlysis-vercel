#!/usr/bin/env python
"""
Test script to debug chapters API hanging issue
"""

import os
import sys
import django
import time

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from chapters.models import Chapter
from django.db.models import Count, Sum, Prefetch
import django.db.models
from members.models import Member
from analytics.models import Referral, OneToOne, TYFCB

print("Testing chapters query...")
start = time.time()

try:
    # Test basic query
    print("\n1. Testing basic query...")
    chapters = Chapter.objects.all()
    print(f"   Found {chapters.count()} chapters in {time.time() - start:.2f}s")

    # Test with prefetch
    print("\n2. Testing with prefetch_related...")
    start = time.time()
    chapters = Chapter.objects.all().prefetch_related(
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
    print(f"   Prefetch setup done in {time.time() - start:.2f}s")

    # Force evaluation
    print("\n3. Evaluating queryset...")
    start = time.time()
    chapter_list = list(chapters)
    print(f"   Evaluated {len(chapter_list)} chapters in {time.time() - start:.2f}s")

    # Test with annotations
    print("\n4. Testing with annotations...")
    start = time.time()
    chapters = Chapter.objects.all().annotate(
        active_member_count=Count(
            "members",
            filter=django.db.models.Q(members__is_active=True),
            distinct=True,
        ),
        report_count=Count("monthly_reports", distinct=True),
    )
    chapter_list = list(chapters)
    print(f"   Annotated {len(chapter_list)} chapters in {time.time() - start:.2f}s")

    print("\n✅ All queries completed successfully!")

except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)
