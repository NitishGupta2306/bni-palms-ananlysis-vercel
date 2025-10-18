"""
Add additional database indexes for improved query performance.

This migration adds:
- Index on week_of_date for date-based queries
- db_index on foreign key fields (chapter, member, monthly_report)
- db_index on month_year for filtering/sorting
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0003_add_database_constraints'),
        ('members', '0003_add_performance_indexes'),
    ]

    operations = [
        # MonthlyReport indexes
        migrations.AddIndex(
            model_name='monthlyreport',
            index=models.Index(fields=['week_of_date'], name='report_week_idx'),
        ),
        migrations.AlterField(
            model_name='monthlyreport',
            name='chapter',
            field=models.ForeignKey(
                db_index=True,
                on_delete=models.deletion.CASCADE,
                related_name='monthly_reports',
                to='chapters.chapter'
            ),
        ),
        migrations.AlterField(
            model_name='monthlyreport',
            name='month_year',
            field=models.CharField(
                db_index=True,
                help_text="e.g., '2024-06' for June 2024",
                max_length=7
            ),
        ),
        migrations.AlterField(
            model_name='monthlyreport',
            name='week_of_date',
            field=models.DateField(
                blank=True,
                db_index=True,
                help_text="The week this audit represents (e.g., 2025-01-28)",
                null=True
            ),
        ),
        # MemberMonthlyStats indexes
        migrations.AlterField(
            model_name='membermonthlystats',
            name='member',
            field=models.ForeignKey(
                db_index=True,
                on_delete=models.deletion.CASCADE,
                related_name='monthly_stats',
                to='members.member'
            ),
        ),
        migrations.AlterField(
            model_name='membermonthlystats',
            name='monthly_report',
            field=models.ForeignKey(
                db_index=True,
                on_delete=models.deletion.CASCADE,
                related_name='member_stats',
                to='reports.monthlyreport'
            ),
        ),
    ]
