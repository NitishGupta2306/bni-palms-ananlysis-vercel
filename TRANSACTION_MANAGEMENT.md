# Transaction Management Documentation

## Overview

This document explains how database transactions are implemented in the BNI PALMS Analytics application to ensure data integrity and consistency.

## What are Transactions?

**Transactions** ensure that a sequence of database operations either:
- **ALL succeed together** (committed), or
- **ALL fail together** (rolled back to original state)

This **"all-or-nothing"** guarantee prevents data corruption from partial updates.

## Why Transactions Matter

### Without Transactions (DANGEROUS):
```python
# Create monthly report
report = MonthlyReport.objects.create(...)  # ✅ Success

# Process 50 member stats
for i in range(50):
    MemberMonthlyStats.objects.create(...)  # ❌ Fails on record 26

# Result: Database has incomplete report + 25 orphaned stats = CORRUPTION
```

### With Transactions (SAFE):
```python
with transaction.atomic():
    # Create monthly report
    report = MonthlyReport.objects.create(...)  # ✅ Success

    # Process 50 member stats
    for i in range(50):
        MemberMonthlyStats.objects.create(...)  # ❌ Fails on record 26

# Result: AUTOMATIC ROLLBACK - database unchanged, can retry = SAFE
```

---

## Implementation Strategy

We use a **hybrid approach** based on Django best practices:

### 1. **Decorator Pattern** - For Simple Operations

Use `@transaction.atomic` when the **entire function** is a database operation:

```python
@transaction.atomic
def destroy(self, request, pk=None):
    """Delete monthly report atomically."""
    report = MonthlyReport.objects.get(id=pk)
    report.delete()  # Cascade deletions are all-or-nothing
```

**When to use:**
- Entire function is database operations
- No complex logic or external calls
- Simple, clean code

### 2. **Context Manager Pattern** - For Complex Operations

Use `with transaction.atomic():` when only **part of the function** needs protection:

```python
def reset_all_data(self, request):
    """Reset database with atomic deletions."""
    # Count records (outside transaction - read-only)
    counts = {
        "chapters": Chapter.objects.count(),
        "members": Member.objects.count(),
    }

    # Only deletions in transaction
    with transaction.atomic():
        Chapter.objects.all().delete()
        Member.objects.all().delete()

    # Log after success (outside transaction)
    logger.info(f"Deleted: {counts}")
```

**When to use:**
- Function has multiple phases (validation, DB ops, notifications)
- Need fine-grained control
- Performance optimization (shorter transaction = less locking)

---

## Current Implementation

### ✅ Protected Operations

#### 1. **Monthly Report Deletion** (`reports/views.py:137`)
```python
@transaction.atomic
def destroy(self, request, pk=None, chapter_id=None):
    """Delete monthly report atomically."""
```

**Protected operations:**
- MonthlyReport deletion
- Cascade: MemberMonthlyStats (50+ records)
- Cascade: Related analytics data

**Why it matters:**
- If deletion fails halfway, orphaned stats would break data integrity
- Transaction ensures complete removal or no change

---

#### 2. **Database Reset** (`reports/views.py:1138`)
```python
def reset_all_data(self, request):
    """Reset database atomically."""
    counts = {...}  # Read-only, outside transaction

    with transaction.atomic():
        Chapter.objects.all().delete()
        Member.objects.all().delete()
        MonthlyReport.objects.all().delete()
        # ... all deletions
```

**Protected operations:**
- 7 model deletions in specific order
- Cascade deletions for foreign keys

**Why it matters:**
- **CRITICAL:** Partial deletion would leave database completely corrupted
- If ANY deletion fails, ALL must rollback
- Prevents scenario: "Chapters deleted but Members remain"

---

#### 3. **Excel Processing** (Already Protected)

These services already have transaction protection:

- `bni/services/excel/processor.py` (lines 336, 711, 1111)
- `bni/services/bulk_upload_service.py` (line 86)
- `bni/services/member_service.py` (line 157)
- `bni/services/chapter_service.py` (line 110)

---

## Transaction Best Practices

### ✅ DO:

1. **Keep transactions short**
   ```python
   validate_file()  # Outside transaction

   with transaction.atomic():
       save_to_db()  # Only DB operations

   send_email()  # Outside transaction
   ```

2. **Wrap at appropriate level**
   - Views: Use decorator
   - Complex functions: Use context manager

3. **Handle errors outside atomic block**
   ```python
   try:
       with transaction.atomic():
           do_database_stuff()
   except IntegrityError as e:
       handle_error()  # Safe - already rolled back
   ```

4. **Let exceptions propagate**
   - Django automatically rolls back on exceptions
   - Don't catch exceptions inside atomic blocks

### ❌ DON'T:

1. **Don't use ATOMIC_REQUESTS setting**
   ```python
   # settings.py - DON'T DO THIS
   DATABASES = {
       'default': {
           'ATOMIC_REQUESTS': True  # ❌ Too much overhead
       }
   }
   ```

2. **Don't include non-database operations**
   ```python
   with transaction.atomic():
       save_data()
       send_email()  # ❌ Email in transaction = slow
       call_api()    # ❌ External API = risky
   ```

3. **Don't catch exceptions inside atomic**
   ```python
   with transaction.atomic():
       try:
           save_data()
       except Exception:
           pass  # ❌ Hides transaction issues
   ```

---

## ACID Properties Guaranteed

| Property | Meaning | Example |
|----------|---------|---------|
| **Atomic** | All-or-nothing | Delete 50 stats or delete none |
| **Consistent** | Valid state always | No orphaned foreign keys |
| **Isolated** | No interference | Concurrent deletes don't corrupt |
| **Durable** | Changes permanent | After commit, survives crashes |

---

## Testing Transactions

### Manual Testing

1. **Test Successful Transaction:**
   ```bash
   # Delete a monthly report
   curl -X DELETE http://localhost:8000/api/chapters/1/reports/5/

   # Verify all related data deleted
   # Check: MemberMonthlyStats, referrals, etc.
   ```

2. **Test Rollback (Simulated):**
   ```python
   # Temporarily add this to test rollback
   with transaction.atomic():
       report.delete()
       raise Exception("Test rollback")  # Forces rollback

   # Verify: Report still exists (not deleted)
   ```

### Automated Testing

```python
from django.test import TestCase, TransactionTestCase
from django.db import transaction

class TransactionTests(TransactionTestCase):
    def test_delete_rollback(self):
        """Test that failed deletion rolls back."""
        report = MonthlyReport.objects.create(...)
        stats = MemberMonthlyStats.objects.create(report=report, ...)

        try:
            with transaction.atomic():
                report.delete()
                raise IntegrityError("Simulated error")
        except IntegrityError:
            pass

        # Verify rollback: report should still exist
        self.assertTrue(MonthlyReport.objects.filter(id=report.id).exists())
        self.assertTrue(MemberMonthlyStats.objects.filter(id=stats.id).exists())
```

---

## Common Scenarios

### Scenario 1: Foreign Key Constraint Violation

**Without transaction:**
```
1. Delete Chapter ✅
2. Delete Member (foreign key to Chapter) ❌ FAILS
Result: Chapter gone, Members orphaned = CORRUPT
```

**With transaction:**
```
1. Delete Chapter ✅
2. Delete Member ❌ FAILS
3. Automatic rollback ✅
Result: Both still exist, can fix and retry = SAFE
```

---

### Scenario 2: Disk Full During Multi-Step Operation

**Without transaction:**
```
1. Create MonthlyReport ✅
2. Create 25 MemberMonthlyStats ✅
3. Disk full ❌
Result: Incomplete report in database = CORRUPT
```

**With transaction:**
```
1. Create MonthlyReport ✅ (temporary)
2. Create 25 MemberMonthlyStats ✅ (temporary)
3. Disk full ❌
4. Automatic rollback ✅
Result: Database unchanged = SAFE
```

---

### Scenario 3: Network Interruption During Cascade Delete

**Without transaction:**
```
1. Delete MonthlyReport ✅
2. Cascade delete 30 MemberMonthlyStats ✅
3. Network interruption ❌
4. 20 remaining MemberMonthlyStats not deleted
Result: Orphaned stats pointing to deleted report = CORRUPT
```

**With transaction:**
```
1-4. Any failure at any point
5. Automatic rollback ✅
Result: Report and all stats remain = SAFE
```

---

## Performance Considerations

### Transaction Duration

**Good (Fast):**
```python
with transaction.atomic():
    # 0.1 seconds - minimal database lock
    Chapter.objects.all().delete()
```

**Bad (Slow):**
```python
with transaction.atomic():
    for chapter in Chapter.objects.all():
        process_complex_logic()  # ❌ 10 seconds - locks database
        chapter.delete()
```

**Better:**
```python
for chapter in Chapter.objects.all():
    process_complex_logic()  # Outside transaction

    with transaction.atomic():
        chapter.delete()  # Only DB operation in transaction
```

### Database Locking

- Shorter transactions = less locking
- Less locking = better concurrent performance
- Keep only critical operations in transaction

---

## Troubleshooting

### Issue: Transaction Deadlock

**Symptoms:**
```
django.db.utils.OperationalError: deadlock detected
```

**Solution:**
- Ensure consistent deletion order
- Avoid circular dependencies
- Keep transactions short

### Issue: Transaction Timeout

**Symptoms:**
```
django.db.utils.OperationalError: connection timeout
```

**Solution:**
- Move non-DB operations outside transaction
- Break into smaller transactions if possible
- Increase database timeout settings

---

## Future Enhancements

### Potential Areas for Transaction Protection

1. **Chapter Deletion** (if not already protected)
   - Delete chapter + all members + all reports

2. **Member Bulk Import**
   - Create multiple members atomically

3. **Report Aggregation**
   - Combine multiple reports into summary

4. **Data Migration Scripts**
   - Ensure migration completes fully

---

## References

- [Django Transaction Documentation](https://docs.djangoproject.com/en/5.2/topics/db/transactions/)
- [ACID Properties](https://en.wikipedia.org/wiki/ACID)
- [Database Transaction Best Practices](https://www.postgresql.org/docs/current/tutorial-transactions.html)

---

## Summary

✅ **Implemented:**
- Monthly report deletion (decorator pattern)
- Database reset (context manager pattern)
- Excel processing services (already protected)

✅ **Benefits:**
- Data integrity guaranteed
- Prevents partial updates
- Automatic rollback on errors
- Production-ready reliability

✅ **Best Practices:**
- Hybrid approach (decorator + context manager)
- Keep transactions short
- Let exceptions propagate
- Handle errors outside atomic blocks

---

**Last Updated:** October 16, 2025
**Version:** 1.0
