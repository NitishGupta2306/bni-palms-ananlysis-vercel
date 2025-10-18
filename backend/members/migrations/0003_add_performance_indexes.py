"""
Add additional database indexes for improved query performance.

This migration adds:
- Composite index on (chapter, normalized_name) for faster member lookups
- db_index on chapter foreign key field
- db_index on is_active field for filtering active members
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0002_add_database_constraints'),
    ]

    operations = [
        # Add composite index for chapter + normalized_name lookups
        migrations.AddIndex(
            model_name='member',
            index=models.Index(fields=['chapter', 'normalized_name'], name='member_chapter_name_idx'),
        ),
        # Note: chapter and is_active already have db_index=True in the model
        # which will be handled by AlterField in the next operations
        migrations.AlterField(
            model_name='member',
            name='chapter',
            field=models.ForeignKey(
                db_index=True,
                on_delete=models.deletion.CASCADE,
                related_name='members',
                to='chapters.chapter'
            ),
        ),
        migrations.AlterField(
            model_name='member',
            name='is_active',
            field=models.BooleanField(db_index=True, default=True),
        ),
    ]
