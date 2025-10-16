# Database Agent - PostgreSQL & Data Architecture Recommendations

## Critical Issues

### 1. Missing Database Indexes
**Models:**
- `backend/members/models.py`
- `backend/reports/models.py`
- `backend/analytics/models.py`
- `backend/chapters/models.py`

**Impact:** Slow queries on large datasets

**Recommendation:**
```python
# members/models.py
class Member(models.Model):
    email = models.EmailField()
    chapter = models.ForeignKey('Chapter', on_delete=models.CASCADE)
    status = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            # Composite index for common query pattern
            models.Index(fields=['chapter', 'status'], name='member_chapter_status_idx'),
            # Email lookup
            models.Index(fields=['email'], name='member_email_idx'),
            # Recent members query
            models.Index(fields=['-created_at'], name='member_created_idx'),
        ]
        # Ensure email unique per chapter
        constraints = [
            models.UniqueConstraint(
                fields=['chapter', 'email'],
                name='unique_member_per_chapter'
            )
        ]
```

---

### 2. N+1 Query Problems
**Location:** Views and services making repeated queries in loops

**Example Problem:**
```python
# Bad - N+1 query
for member in Member.objects.all():
    print(member.chapter.name)  # Extra query per member

# Good - Single query
members = Member.objects.select_related('chapter').all()
for member in members:
    print(member.chapter.name)  # No extra queries
```

**Common Patterns to Fix:**
- Member → Chapter lookups
- Report → Member → Chapter chains
- Many-to-many relationships (meetings, referrals)

---

## High Priority Issues

### 3. Missing Database Constraints
**Issue:** Data integrity relies on application code only

**Recommendation:**
```python
class Chapter(models.Model):
    name = models.CharField(max_length=200)
    location = models.CharField(max_length=200)

    class Meta:
        constraints = [
            # Prevent duplicate chapters
            models.UniqueConstraint(
                fields=['name', 'location'],
                name='unique_chapter_name_location'
            ),
            # Ensure name is not empty
            models.CheckConstraint(
                check=models.Q(name__length__gte=3),
                name='chapter_name_min_length'
            ),
        ]

class MonthlyReport(models.Model):
    chapter = models.ForeignKey('Chapter', on_delete=models.CASCADE)
    period = models.CharField(max_length=7)  # YYYY-MM
    data = models.JSONField()

    class Meta:
        constraints = [
            # One report per chapter per period
            models.UniqueConstraint(
                fields=['chapter', 'period'],
                name='unique_report_per_period'
            )
        ]
```

---

### 4. Backup & Recovery Strategy Missing
**Priority:** URGENT

**Recommendation:**

**Automated Backups:**
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"

# PostgreSQL backup
pg_dump -U $DB_USER -h $DB_HOST $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep 7 daily, 4 weekly, 12 monthly
# Cleanup old backups
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
```

**Vercel/Supabase Setup:**
- Enable point-in-time recovery (PITR)
- Configure automated daily backups
- Test restore procedure monthly
- Document restore steps

**Backup Media Files:**
```bash
# Backup uploaded files
tar -czf $BACKUP_DIR/media_$DATE.tar.gz /path/to/media/
```

---

### 5. Query Performance Monitoring
**Issue:** No visibility into slow queries

**Recommendation:**

**Django Debug Toolbar (Development):**
```python
# settings.py
if DEBUG:
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
```

**Query Logging (Production):**
```python
# settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'file': {
            'class': 'logging.FileHandler',
            'filename': 'slow_queries.log',
        },
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Log queries taking > 1 second
LOGGING['loggers']['django.db.backends']['filters'] = ['slow_query']
```

**PostgreSQL Monitoring:**
```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT
    calls,
    total_time,
    mean_time,
    query
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;
```

---

## Data Architecture Issues

### 6. JSON Field Usage
**Files:** Models using JSONField

**Issues:**
- Can't query JSON structure efficiently
- No schema validation
- Difficult to migrate

**Recommendation:**

**When to Use JSONField:**
- Truly unstructured data
- Flexible metadata
- Infrequent queries

**When to Avoid:**
- Data you need to filter/sort on
- Data with known structure
- Frequently accessed fields

**Better Approach:**
```python
# Bad - Everything in JSON
class Report(models.Model):
    data = models.JSONField()  # Contains metrics, dates, calculations

# Good - Structured fields
class Report(models.Model):
    chapter = models.ForeignKey('Chapter', on_delete=models.CASCADE)
    period = models.DateField()
    total_referrals = models.IntegerField()
    total_tyfcb = models.DecimalField(max_digits=10, decimal_places=2)
    attendance_rate = models.DecimalField(max_digits=5, decimal_places=2)
    metadata = models.JSONField(default=dict)  # Only non-queryable extras
```

---

### 7. Migration Strategy
**Issue:** No documented migration procedures

**Recommendation:**

**Create Migration Guidelines:**
```markdown
# Migration Checklist

1. **Before Writing Migration:**
   - [ ] Backup database
   - [ ] Test on staging
   - [ ] Plan rollback strategy

2. **Writing Safe Migrations:**
   - [ ] Add fields as nullable first
   - [ ] Use RunPython for data migrations
   - [ ] Split destructive changes into separate migrations

3. **Running Migrations:**
   - [ ] Review SQL with --plan
   - [ ] Monitor query time
   - [ ] Check for locks
```

**Example Safe Migration:**
```python
# Step 1: Add new nullable field
class Migration(migrations.Migration):
    operations = [
        migrations.AddField(
            model_name='member',
            name='new_field',
            field=models.CharField(max_length=100, null=True),
        ),
    ]

# Step 2: Populate data
class Migration(migrations.Migration):
    def populate_new_field(apps, schema_editor):
        Member = apps.get_model('members', 'Member')
        for member in Member.objects.all():
            member.new_field = calculate_value(member)
            member.save()

    operations = [
        migrations.RunPython(populate_new_field),
    ]

# Step 3: Make required (separate deployment)
class Migration(migrations.Migration):
    operations = [
        migrations.AlterField(
            model_name='member',
            name='new_field',
            field=models.CharField(max_length=100),
        ),
    ]
```

---

### 8. Data Validation at Database Level
**Issue:** Constraints enforced only in application code

**Recommendation:**
```python
class Member(models.Model):
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    score = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        constraints = [
            # Score must be 0-100
            models.CheckConstraint(
                check=models.Q(score__gte=0) & models.Q(score__lte=100),
                name='member_score_range'
            ),
            # Email format validation
            models.CheckConstraint(
                check=models.Q(email__contains='@'),
                name='member_email_format'
            ),
        ]
```

---

## Performance Optimization

### 9. Query Optimization Patterns
**Common Issues Found:**

**Issue 1: Selecting All Fields**
```python
# Bad - Fetches all fields
members = Member.objects.all()

# Good - Only needed fields
members = Member.objects.only('id', 'name', 'email')

# Or exclude large fields
members = Member.objects.defer('bio', 'photo')
```

**Issue 2: No Pagination**
```python
# Bad - Loads all records
members = Member.objects.all()

# Good - Paginate
from django.core.paginator import Paginator

paginator = Paginator(Member.objects.all(), 50)
page = paginator.get_page(page_number)
```

**Issue 3: Repeated Queries**
```python
# Bad - Query per item
member_ids = [1, 2, 3, 4, 5]
members = [Member.objects.get(id=id) for id in member_ids]

# Good - Single query
members = Member.objects.filter(id__in=member_ids)
```

---

### 10. Bulk Operations
**Files:** Services doing individual inserts/updates

**Recommendation:**
```python
# Bad - N queries
for data in member_data:
    Member.objects.create(**data)

# Good - Single query
Member.objects.bulk_create([
    Member(**data) for data in member_data
], batch_size=100)

# Bulk update
members = Member.objects.filter(chapter_id=1)
members.update(status='active')

# Or bulk_update for different values per object
Member.objects.bulk_update(
    member_list,
    ['score', 'status'],
    batch_size=100
)
```

---

### 11. Database Connection Pooling
**Issue:** Connection management not optimized

**Recommendation:**
```python
# settings.py - Use persistent connections
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 600,  # Keep connections for 10 min
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000'  # 30 sec
        }
    }
}

# For high traffic, use pgBouncer
# Connection pooling between Django and PostgreSQL
```

---

## Data Integrity

### 12. Soft Deletes Pattern
**Issue:** Hard deletes lose audit trail

**Recommendation:**
```python
class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class Member(models.Model):
    email = models.EmailField()
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteManager()
    all_objects = models.Manager()  # Include deleted

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save()

# Usage
member.soft_delete()  # Mark deleted
Member.objects.all()  # Doesn't include deleted
Member.all_objects.all()  # Includes deleted
```

---

### 13. Audit Trail / History Tracking
**Recommendation:**
```python
# Use django-simple-history
from simple_history.models import HistoricalRecords

class Member(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField()
    history = HistoricalRecords()

# Automatic tracking of all changes
member = Member.objects.get(id=1)
member.name = "New Name"
member.save()

# View history
for record in member.history.all():
    print(f"{record.name} at {record.history_date}")
```

---

## Database Maintenance

### 14. Regular Maintenance Tasks
**Create Management Commands:**

```python
# backend/members/management/commands/vacuum_db.py
from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            cursor.execute("VACUUM ANALYZE")
        self.stdout.write("Database vacuumed successfully")
```

**Cron Schedule:**
```bash
# Weekly VACUUM ANALYZE
0 2 * * 0 python manage.py vacuum_db

# Monthly index rebuild
0 3 1 * * python manage.py reindex_db

# Daily backup
0 1 * * * /scripts/backup_database.sh
```

---

### 15. Database Monitoring Setup
**Metrics to Track:**
- Connection count
- Query execution time
- Cache hit ratio
- Table/index sizes
- Slow query log

**Tools:**
- PostgreSQL pg_stat_* views
- Supabase dashboard
- Django DB connections panel
- Custom monitoring scripts

---

## Testing

### 16. Database Testing Strategy
**Recommendation:**

```python
# Use in-memory SQLite for fast tests
if 'test' in sys.argv:
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }

# Or use separate test PostgreSQL database
DATABASES['default']['TEST'] = {
    'NAME': 'test_bni_db',
}
```

**Integration Tests:**
```python
from django.test import TestCase, TransactionTestCase

class MemberQueryTests(TransactionTestCase):
    def test_n_plus_one_avoided(self):
        """Ensure chapter queries use select_related."""
        with self.assertNumQueries(1):
            members = Member.objects.select_related('chapter').all()
            for member in members:
                _ = member.chapter.name

    def test_bulk_create_performance(self):
        """Verify bulk operations are efficient."""
        members = [Member(name=f"Member {i}") for i in range(100)]

        with self.assertNumQueries(1):
            Member.objects.bulk_create(members)
```

---

## Security

### 17. Database Access Controls
**Recommendation:**

```sql
-- Create separate database users
CREATE USER bni_app WITH PASSWORD 'secure_password';
CREATE USER bni_readonly WITH PASSWORD 'readonly_password';

-- Grant minimal permissions to app user
GRANT CONNECT ON DATABASE bni_db TO bni_app;
GRANT USAGE ON SCHEMA public TO bni_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bni_app;

-- Read-only user for reporting
GRANT CONNECT ON DATABASE bni_db TO bni_readonly;
GRANT USAGE ON SCHEMA public TO bni_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bni_readonly;
```

---

### 18. Prevent SQL Injection
**Django ORM prevents most SQL injection, but be careful with:**

```python
# DANGEROUS - Never do this
Member.objects.raw(f"SELECT * FROM members WHERE name = '{user_input}'")

# SAFE - Use parameterized queries
Member.objects.raw(
    "SELECT * FROM members WHERE name = %s",
    [user_input]
)

# SAFEST - Use ORM
Member.objects.filter(name=user_input)
```

---

### 19. Database Partitioning Strategy
**Issue:** Large tables may benefit from partitioning

**Recommendation:**
```sql
-- For MonthlyReport table (partition by month_year)
CREATE TABLE monthly_reports_2024 PARTITION OF monthly_reports
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE monthly_reports_2025 PARTITION OF monthly_reports
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

**When to Use:**
- Tables with >10M rows
- Time-series data (reports by month)
- Data with natural boundaries

### 20. Read Replicas for Reporting
**Issue:** Heavy report queries may impact write performance

**Recommendation:**
- Configure read replica for reporting/analytics
- Route read-only queries to replica
- Use Django database routing

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'bni_db',
        # Primary for writes
    },
    'replica': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'bni_db_replica',
        # Read-only replica
    }
}

# database_router.py
class ReportingRouter:
    def db_for_read(self, model, **hints):
        if model._meta.app_label == 'analytics':
            return 'replica'
        return 'default'
```

### 21. Database Connection Health Checks
**Issue:** No automated connection health monitoring

**Recommendation:**
```python
# management/commands/check_db_health.py
from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Check connections
            cursor.execute("SELECT count(*) FROM pg_stat_activity")
            active_conns = cursor.fetchone()[0]

            # Check table sizes
            cursor.execute("""
                SELECT pg_size_pretty(pg_total_relation_size('members_member'))
            """)

        self.stdout.write(f"Active connections: {active_conns}")
```

---

## Quick Wins

1. **Add indexes to Member model** (1h) - Immediate query speedup
2. **Add select_related to views** (2h) - Fix N+1 queries
3. **Enable query logging** (30min) - Identify slow queries
4. **Add database constraints** (2h) - Data integrity
5. **Setup automated backups** (3h) - Data safety
6. **Add database health checks** (1h) - Monitoring

---

## Files Requiring Immediate Attention

1. `backend/members/models.py` - Add indexes and constraints
2. `backend/reports/models.py` - Add indexes and constraints
3. `backend/analytics/models.py` - Add indexes
4. `backend/reports/views.py:139-258` - Fix N+1 queries
5. `backend/bni/services/aggregation_service.py` - Use bulk operations

---

## Recommended Approach

**Phase 1 - Critical (Week 1)**
- Add database indexes to all models
- Set up automated backup system
- Fix N+1 queries in views

**Phase 2 - Data Integrity (Week 2)**
- Add database constraints
- Implement soft deletes where needed
- Add audit trail for critical models

**Phase 3 - Performance (Week 3)**
- Optimize bulk operations
- Configure connection pooling
- Set up query monitoring

**Phase 4 - Maintenance (Ongoing)**
- Regular VACUUM ANALYZE
- Monitor slow queries
- Test backup restoration monthly
