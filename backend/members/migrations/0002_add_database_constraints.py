"""
Add database constraints for data integrity.

This migration adds:
- Check constraints for data validation
- Improved unique constraints
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0001_initial'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='member',
            constraint=models.CheckConstraint(
                check=~models.Q(first_name=''),
                name='member_first_name_not_empty',
            ),
        ),
        migrations.AddConstraint(
            model_name='member',
            constraint=models.CheckConstraint(
                check=~models.Q(last_name=''),
                name='member_last_name_not_empty',
            ),
        ),
        migrations.AddIndex(
            model_name='member',
            index=models.Index(fields=['chapter', 'is_active'], name='member_chapter_active_idx'),
        ),
        migrations.AddIndex(
            model_name='member',
            index=models.Index(fields=['email'], name='member_email_idx'),
        ),
        migrations.AddIndex(
            model_name='member',
            index=models.Index(fields=['-created_at'], name='member_created_idx'),
        ),
    ]
