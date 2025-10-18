# Backend Updates TODO

## Critical Issues

### 1. Missing Authentication (SECURITY RISK)
**Priority: CRITICAL | Effort: 6h | Type: SECURITY**

**10+ endpoints lack proper authentication:**

All endpoints currently use `permission_classes = [AllowAny]` with TODO comments:

- `reports/views.py:34` - MonthlyReportViewSet
- `reports/views.py:109` - Delete monthly report (commented out auth check)
- `analytics/views.py:29` - Analytics ViewSet
- `analytics/views.py:277` - Another analytics endpoint
- `members/views.py:25` - MemberViewSet
- `chapters/views.py:32` - ChapterViewSet
- `chapters/views.py:396, 485, 513` - Admin endpoints (password management)
- `uploads/views.py:62` - File upload endpoint

**Security Implications:**
- Anyone can upload files
- Anyone can delete data
- Anyone can modify passwords
- No audit trail for actions

**Action Required:**
1. Implement proper authentication middleware
2. Add permission classes:
   - `IsAuthenticated` for all endpoints
   - `IsAdminUser` for admin-only endpoints
   - Custom `IsChapterMember` permission
3. Add JWT token validation
4. Implement rate limiting
5. Add audit logging

---

### 2. Passwords Stored in Plain Text (SECURITY CRITICAL)
**Priority: CRITICAL | Effort: 4h | Type: SECURITY**

**Location:** `frontend/src/features/admin/components/security-settings-tab.tsx:336`

```typescript
<li>Passwords are stored in plain text for easy management</li>
```

**Issues:**
- Database breach exposes all passwords
- Violates security best practices
- Non-compliant with data protection regulations

**Action Required:**
1. Hash all passwords using bcrypt/argon2
2. Migrate existing plain-text passwords
3. Update login flow to compare hashes
4. Never expose passwords in API responses
5. Add password strength requirements

---

## High Priority Issues

### 3. Massive Service File (2169 lines)
**Priority: HIGH | Effort: 12h | Type: REFACTORING**

**Location:** `backend/bni/services/aggregation_service.py`

**Issues:**
- 2169 lines in a single file
- Multiple responsibilities: aggregation, Excel generation, styling, calculations
- Difficult to test, maintain, and debug
- Color definitions, utility methods, matrix generation all mixed together

**Recommendation - Split into modules:**

```
bni/services/aggregation/
├── __init__.py
├── aggregator.py (main AggregationService, ~200 lines)
├── matrix_aggregation.py (matrix operations, ~300 lines)
├── excel/
│   ├── __init__.py
│   ├── excel_generator.py (workbook creation, ~200 lines)
│   ├── matrix_writer.py (matrix sheets, ~400 lines)
│   ├── tyfcb_writer.py (TYFCB sheets, ~300 lines)
│   ├── summary_writer.py (summary sheet, ~300 lines)
│   └── styles.py (colors, borders, fonts, ~100 lines)
├── calculations.py (statistics, performance metrics, ~200 lines)
└── member_tracking.py (member completeness, differences, ~150 lines)
```

**Benefits:**
- Each file has single responsibility
- Easier to test individual components
- Better code organization
- Reduced cognitive load

---

### 4. N+1 Query Problems
**Priority: HIGH | Effort: 3h | Type: PERFORMANCE**

**Potential issues found:**

**`reports/views.py:139-258` (member_detail method)**
```python
# Fetches members one at a time in loop
chapter_members = Member.objects.filter(chapter=chapter, is_active=True)
member_lookup = {m.id: m.full_name for m in chapter_members}
```

**`bni/services/aggregation_service.py:470-492` (_get_all_members)**
```python
for name in all_member_names:
    member = Member.objects.filter(...).first()  # N+1 query!
```

**Action Required:**
1. Use `select_related()` and `prefetch_related()` strategically
2. Batch database queries where possible
3. Add database query monitoring
4. Profile slow endpoints

---

### 5. Inconsistent Error Handling
**Priority: MEDIUM | Effort: 4h | Type: RELIABILITY**

**Issues:**
- Some views have detailed try/catch blocks
- Others just let exceptions bubble up
- Error messages vary in quality
- No standardized error response format

**Examples:**

**Good (detailed):**
```python
# reports/views.py:96-100
except Chapter.DoesNotExist:
    return Response(
        {"error": "Chapter not found"},
        status=status.HTTP_404_NOT_FOUND
    )
```

**Bad (generic):**
```python
# Multiple locations
except Exception as e:
    return Response(
        {"error": f"Failed: {str(e)}"},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
```

**Action Required:**
1. Create centralized error handler middleware
2. Define standard error response format:
```python
{
    "error": {
        "code": "MEMBER_NOT_FOUND",
        "message": "Member not found",
        "details": {...},
        "timestamp": "2025-01-15T..."
    }
}
```
3. Add proper exception hierarchy
4. Log all errors with context

---

## Medium Priority Issues

### 6. Missing Input Validation
**Priority: MEDIUM | Effort: 3h | Type: DATA_INTEGRITY**

**Vulnerable endpoints:**

**File Upload (`uploads/views.py`):**
- No file size validation beyond server defaults
- Limited file type validation
- No malware scanning
- Missing filename sanitization

**Password Updates (`chapters/views.py:396, 485, 513`):**
- No password strength requirements
- No length validation
- No special character requirements

**Member Creation:**
- Email format not validated
- Phone format not validated
- Names allow any characters

**Action Required:**
1. Add Django validators to all model fields
2. Implement request validation middleware
3. Use Django Forms or serializers for validation
4. Add file upload restrictions (size, type, content)
5. Implement password policies

---

### 7. Code Duplication
**Priority: MEDIUM | Effort: 4h | Type: DRY_VIOLATION**

**Matrix Generation Logic:**
- Similar code in multiple places
- `aggregation_service.py` has repeated Excel styling code
- Border/color application repeated ~10 times

**Excel Generation:**
```python
# Repeated pattern across 5+ methods
worksheet.cell(row, col).font = Font(bold=True)
worksheet.cell(row, col).fill = PatternFill(...)
worksheet.cell(row, col).alignment = Alignment(...)
```

**Fix:** Create `ExcelStyler` class:
```python
class ExcelStyler:
    @staticmethod
    def apply_header_style(cell):
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="D3D3D3", ...)
        cell.alignment = Alignment(horizontal="center")
```

---

### 8. Missing Docstrings
**Priority: LOW | Effort: 6h | Type: DOCUMENTATION**

**Many functions lack documentation:**
- Utility methods in `aggregation_service.py`
- Several view methods
- Service layer functions

**Current state:**
- Some methods have excellent docstrings
- Many have none at all
- Inconsistent format

**Action Required:**
1. Add Google-style docstrings to all public methods
2. Document parameters, return types, exceptions
3. Add usage examples for complex functions

Example:
```python
def aggregate_matrices(self) -> Dict:
    """
    Aggregate all matrices across selected months.

    Combines referral, OTO, and TYFCB data from multiple monthly
    reports into unified matrices.

    Returns:
        Dict containing:
            - referral_matrix: Combined referral counts (DataFrame)
            - oto_matrix: Combined OTO counts (DataFrame)
            - combination_matrix: Relationship matrix (DataFrame)
            - tyfcb_inside: Inside TYFCB data (Dict)
            - tyfcb_outside: Outside TYFCB data (Dict)
            - member_completeness: Member presence info (Dict)
            - month_range: Date range string
            - total_months: Number of months aggregated

    Raises:
        ValueError: If no reports are provided
        DatabaseError: If member data cannot be retrieved
    """
```

---

### 9. Logging Inconsistency
**Priority: LOW | Effort: 2h | Type: OBSERVABILITY**

**Issues:**
- `member_service.py` has excellent logging
- Most other services have minimal/no logging
- No structured logging
- No log levels consistency

**Action Required:**
1. Add logging to all service methods
2. Use appropriate log levels:
   - DEBUG: Detailed flow
   - INFO: Business events
   - WARNING: Recoverable errors
   - ERROR: Failures
3. Add structured logging with context:
```python
logger.info(
    "Aggregating matrices",
    extra={
        "chapter_id": chapter.id,
        "report_count": len(reports),
        "date_range": month_range
    }
)
```

---

### 10. Hard-coded Configuration
**Priority: MEDIUM | Effort: 2h | Type: MAINTAINABILITY**

**Hard-coded values found:**

**Performance Thresholds (`aggregation_service.py:43-47`):**
```python
self.THRESHOLD_GREEN = 1.75  # >= 1.75x average
self.THRESHOLD_ORANGE_HIGH = 1.75
self.THRESHOLD_ORANGE_LOW = 0.75
self.THRESHOLD_RED = 0.5
```

**Color Definitions (`aggregation_service.py:35-41`):**
```python
self.COLOR_GREEN = "B6FFB6"
self.COLOR_ORANGE = "FFD699"
self.COLOR_RED = "FFB6B6"
```

**Timeouts, file sizes, etc.**

**Action Required:**
1. Move to `settings.py`:
```python
# settings.py
BNI_PERFORMANCE_THRESHOLDS = {
    'green': 1.75,
    'orange_high': 1.75,
    'orange_low': 0.75,
    'red': 0.5
}

BNI_EXCEL_COLORS = {
    'green': 'B6FFB6',
    'orange': 'FFD699',
    ...
}
```

2. Create config class for easy access
3. Allow environment variable overrides

---

## Low Priority Issues

### 11. Unused Imports
**Priority: LOW | Effort: 30min | Type: CODE_QUALITY**

Run `flake8` or `pylint` to find unused imports

**Action:** Clean up imports across all Python files

---

### 12. Type Hints Missing
**Priority: LOW | Effort: 4h | Type: TYPE_SAFETY**

**Many functions lack type hints:**
```python
# Current
def process_data(data, config):
    return result

# Should be
def process_data(data: Dict[str, Any], config: ProcessConfig) -> ProcessResult:
    return result
```

**Action Required:**
1. Add type hints to all function signatures
2. Use `from typing import Dict, List, Optional, Tuple`
3. Run `mypy` for type checking

---

### 13. Database Indexes Missing
**Priority: MEDIUM | Effort: 2h | Type: PERFORMANCE**

**Check if indexes exist on:**
- Foreign key fields (chapter_id, member_id, etc.)
- Frequently queried fields (month_year, is_active)
- Composite indexes for common queries

**Action Required:**
1. Run `python manage.py showmigrations` to check indexes
2. Add indexes to frequently queried fields:
```python
class Member(models.Model):
    normalized_name = models.CharField(max_length=255, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['chapter', 'is_active']),
            models.Index(fields=['chapter', 'normalized_name']),
        ]
```

---

### 14. Transaction Management
**Priority: MEDIUM | Effort: 3h | Type: DATA_INTEGRITY**

**Issues:**
- File uploads create multiple database records
- No transaction wrapping for multi-step operations
- Partial failures can leave inconsistent data

**Example from `member_service.py:157` (Good):**
```python
@transaction.atomic
def delete_member(member_id: int) -> Dict[str, Any]:
    # Atomic deletion
```

**Action Required:**
1. Wrap multi-step operations in `@transaction.atomic`
2. Add rollback logic for file upload failures
3. Implement compensating transactions where needed

---

### 15. API Response Consistency
**Priority: LOW | Effort: 3h | Type: API_DESIGN**

**Issues:**
- Some endpoints return bare data
- Others wrap in objects
- Inconsistent date formats
- Mixed camelCase/snake_case

**Examples:**
```python
# Inconsistent responses
return Response(result)  # Bare list
return Response({"data": result, "meta": {...}})  # Wrapped
```

**Action Required:**
1. Standardize response format:
```python
{
    "data": {...},
    "meta": {
        "timestamp": "2025-01-15T...",
        "request_id": "uuid"
    }
}
```
2. Use DRF serializers for consistent formatting
3. Document API contract in OpenAPI/Swagger

---

## Summary Statistics

**Total Issues: 15**
- Critical: 2 (Authentication, Password Security)
- High: 3
- Medium: 7
- Low: 3

**Estimated Total Effort: 55.5 hours**

**By Category:**
- Security: 2 issues (CRITICAL - DO FIRST)
- Performance: 3 issues
- Refactoring: 2 issues
- Data Integrity: 2 issues
- Code Quality: 3 issues
- Documentation: 1 issue
- Observability: 1 issue
- API Design: 1 issue

**Immediate Action Items (This Week):**
1. Fix authentication (6h)
2. Hash passwords (4h)
3. Add input validation (3h)
4. Fix N+1 queries (3h)

**Total Immediate: 16 hours**
