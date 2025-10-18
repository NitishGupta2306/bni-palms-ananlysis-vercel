"""
Add database constraints for reports model integrity.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0002_add_audit_week_tracking'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='monthlyreport',
            index=models.Index(fields=['chapter', 'month_year'], name='report_chapter_month_idx'),
        ),
        migrations.AddIndex(
            model_name='monthlyreport',
            index=models.Index(fields=['-uploaded_at'], name='report_uploaded_idx'),
        ),
        migrations.AddIndex(
            model_name='membermonthlystats',
            index=models.Index(fields=['member', 'monthly_report'], name='stats_member_report_idx'),
        ),
    ]
