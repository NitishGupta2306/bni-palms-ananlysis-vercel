# Documentation Agent - Technical Documentation Best Practices

## Critical Documentation Gaps

### 1. API Documentation Missing
**Status:** No formal API docs found
**Priority:** HIGH

**Recommendation:** Implement drf-spectacular for OpenAPI/Swagger

```python
# Install
pip install drf-spectacular

# settings.py
INSTALLED_APPS += ['drf_spectacular']

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'BNI PALMS Analytics API',
    'DESCRIPTION': 'API for BNI chapter analytics and reporting',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# urls.py
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns += [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema')),
]
```

**Document Each Endpoint:**
```python
from drf_spectacular.utils import extend_schema, OpenApiParameter

@extend_schema(
    summary="Get chapter members",
    description="Retrieve all members for a specific chapter",
    parameters=[
        OpenApiParameter(
            name='chapter_id',
            type=int,
            location=OpenApiParameter.PATH,
            description='Chapter database ID'
        ),
        OpenApiParameter(
            name='status',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Filter by member status (active, inactive)',
            required=False
        ),
    ],
    responses={
        200: MemberSerializer(many=True),
        404: OpenApiResponse(description='Chapter not found'),
    },
    tags=['Members']
)
@api_view(['GET'])
def get_chapter_members(request, chapter_id):
    """Retrieve all members for a chapter."""
    ...
```

---

### 2. Architecture Documentation Missing
**Status:** No architecture overview found
**Priority:** HIGH

**Recommendation:** Create `docs/ARCHITECTURE.md`

**Contents:**
```markdown
# Architecture Overview

## System Architecture

### High-Level Design
[Frontend] ← HTTP/REST → [Backend API] ← SQL → [PostgreSQL]
    ↓                          ↓
[Browser]              [Supabase Storage]

### Component Diagram
- Frontend: React 18 SPA
- Backend: Django REST Framework
- Database: PostgreSQL (Supabase)
- Storage: Supabase Storage (Excel files)
- Hosting: Vercel (Frontend + Serverless Functions)

## Data Flow

### File Upload Flow
1. User uploads Excel → Frontend validation
2. POST /api/uploads/ → Backend receives file
3. File saved to Supabase Storage
4. Excel parsed by openpyxl
5. Data validated and transformed
6. Transaction: Save to PostgreSQL
7. Response with upload ID
8. Frontend polls for processing status

### Report Generation Flow
1. User selects chapter + period
2. GET /api/reports/generate/
3. Backend fetches data from DB
4. Calculations performed
5. Excel generated with openpyxl
6. File saved to storage
7. Download URL returned

## Security Model

### Authentication
- JWT tokens for API authentication
- Token expiry: 15 minutes
- Refresh token: 7 days
- Rate limiting on auth endpoints

### Authorization
- Chapter-level permissions
- Admin vs. User roles
- Row-level security (RLS) in Supabase

## Database Schema

### Core Models
- Chapter: BNI chapter information
- Member: Chapter members
- MonthlyReport: Uploaded report data
- Referral: Business referrals between members
- Meeting: One-to-one meetings
- TYFCB: Thank You For Closed Business records

[Include ER diagram here]

## Technology Stack

### Frontend
- React 18.3.1
- TypeScript 4.9.5
- TailwindCSS 3.4.14
- React Query (@tanstack/react-query)
- Radix UI components
- Recharts for visualization

### Backend
- Django 4.2.7
- Django REST Framework 3.14.0
- PostgreSQL 15+
- openpyxl for Excel processing
- bcrypt for password hashing

### Infrastructure
- Vercel (hosting)
- Supabase (database + storage)
- GitHub Actions (CI/CD - TODO)

## Deployment

### Environment Variables
[Document required env vars]

### Deployment Process
[Document deployment steps]
```

---

### 3. Setup/Onboarding Documentation Incomplete
**File:** `README.md` exists but lacks detail
**Priority:** MEDIUM

**Enhance README.md with:**

```markdown
## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ (or Supabase account)
- Git

## First-Time Setup

### 1. Clone Repository
\`\`\`bash
git clone <repo-url>
cd bni-palms-ananlysis-vercel
\`\`\`

### 2. Backend Setup
\`\`\`bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load sample data (optional)
python manage.py loaddata fixtures/sample_data.json

# Start server
python manage.py runserver
\`\`\`

Backend runs at http://localhost:8000

### 3. Frontend Setup
\`\`\`bash
cd frontend
npm install

# Create .env file
cp .env.example .env
# Edit .env with API URL

# Start development server
npm start
\`\`\`

Frontend runs at http://localhost:3000

## Troubleshooting

### Common Issues

**Issue: Database connection fails**
- Check PostgreSQL is running
- Verify .env credentials
- Ensure database exists

**Issue: Module not found**
- Run `pip install -r requirements.txt` again
- Check virtual environment is activated

**Issue: Port already in use**
- Change port: `python manage.py runserver 8001`
- Kill process using port: `lsof -ti:8000 | xargs kill`
```

---

### 4. Code Documentation (Docstrings) Missing
**Files:** Most service methods lack docstrings
**Priority:** MEDIUM

**Recommendation:** Add Google-style docstrings

```python
def calculate_member_score(
    member_id: int,
    period: str,
    include_tyfcb: bool = True
) -> Dict[str, float]:
    """Calculate comprehensive performance score for a member.

    Aggregates referrals, meetings, TYFCB, and attendance to produce
    a weighted performance score (0-100).

    Args:
        member_id: Database ID of the member to score
        period: Time period in YYYY-MM format (e.g., '2025-01')
        include_tyfcb: Whether to include TYFCB in score calculation

    Returns:
        Dictionary containing:
            - total_score: Overall score (0-100)
            - referrals_score: Referrals component (0-100)
            - meetings_score: Meetings component (0-100)
            - tyfcb_score: TYFCB component (0-100) if included
            - attendance_score: Attendance component (0-100)

    Raises:
        Member.DoesNotExist: If member_id is invalid
        ValueError: If period format is incorrect
        DatabaseException: If database query fails

    Example:
        >>> scores = calculate_member_score(42, '2025-01')
        >>> scores['total_score']
        87.5

    Note:
        Weights: Referrals (40%), Meetings (30%), TYFCB (20%), Attendance (10%)
    """
    ...
```

**Automate with Tools:**
```bash
# Install pyment for docstring generation
pip install pyment

# Generate docstrings
pyment -w -o google my_module.py
```

---

### 5. Inline Code Comments Missing
**Issue:** Complex logic lacks explanatory comments
**Priority:** MEDIUM

**Bad Example:**
```python
def calc(m, p):
    r = m.referrals.filter(date__gte=p[0], date__lte=p[1]).count()
    return (r * 0.4 + m.meetings.count() * 0.3) * 100
```

**Good Example:**
```python
def calculate_engagement_score(member, period):
    """Calculate member engagement score for period."""
    # Extract referrals within the period
    # Weight: 40% of total score
    period_referrals = member.referrals.filter(
        date__gte=period.start_date,
        date__lte=period.end_date
    ).count()

    # Count one-to-one meetings
    # Weight: 30% of total score
    meeting_count = member.meetings.count()

    # Calculate weighted score (normalized to 0-100)
    engagement_score = (
        (period_referrals * 0.4) +
        (meeting_count * 0.3)
    ) * 100

    return engagement_score
```

**When to Add Comments:**
- Complex algorithms
- Business logic rationale
- Workarounds for bugs
- Performance optimizations
- Non-obvious patterns

**When NOT to Add Comments:**
- Self-explanatory code
- Restating the code
- Obvious operations

---

## Medium Priority Documentation

### 6. Testing Documentation Missing
**Create:** `docs/TESTING.md`

```markdown
# Testing Guide

## Running Tests

### Backend Tests
\`\`\`bash
cd backend
python manage.py test

# With coverage
coverage run --source='.' manage.py test
coverage report
coverage html  # Generate HTML report
\`\`\`

### Frontend Tests
\`\`\`bash
cd frontend
npm test

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e
\`\`\`

## Writing Tests

### Backend Test Example
\`\`\`python
from django.test import TestCase
from members.models import Member

class MemberModelTests(TestCase):
    def setUp(self):
        self.member = Member.objects.create(
            name='Test User',
            email='test@example.com'
        )

    def test_member_creation(self):
        """Test member is created correctly."""
        self.assertEqual(self.member.name, 'Test User')
        self.assertIsNotNone(self.member.id)
\`\`\`

### Frontend Test Example
\`\`\`typescript
import { render, screen } from '@testing-library/react';
import { MemberCard } from './member-card';

describe('MemberCard', () => {
  it('renders member name', () => {
    render(<MemberCard name="John Doe" email="john@example.com" />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
\`\`\`

## Test Coverage Goals
- Backend: 80%+ on services and views
- Frontend: 80%+ on critical paths
- E2E: Core user flows covered
```

---

### 7. Deployment Documentation
**Create:** `docs/DEPLOYMENT.md`

```markdown
# Deployment Guide

## Vercel Deployment

### Prerequisites
- Vercel account
- GitHub repository connected
- Environment variables configured

### Environment Variables

#### Backend (.env)
\`\`\`
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_KEY=...
SECRET_KEY=...
DEBUG=False
ALLOWED_HOSTS=your-domain.vercel.app
\`\`\`

#### Frontend (.env)
\`\`\`
REACT_APP_API_URL=https://api.your-domain.com
\`\`\`

### Deployment Process

1. **Push to main branch**
   \`\`\`bash
   git push origin main
   \`\`\`

2. **Vercel auto-deploys**
   - Build triggered automatically
   - Preview URL generated
   - Production deployment on success

3. **Run migrations**
   \`\`\`bash
   # SSH into Vercel or use CLI
   python manage.py migrate
   \`\`\`

4. **Verify deployment**
   - Check health endpoint: /api/health/
   - Test login
   - Upload test file

### Rollback

\`\`\`bash
# Via Vercel dashboard
# Or via CLI
vercel rollback
\`\`\`

## Database Migrations

### Before Deployment
1. Test migration locally
2. Backup production database
3. Review migration SQL

### During Deployment
1. Put site in maintenance mode (optional)
2. Run migrations
3. Verify data integrity
4. Exit maintenance mode

### If Migration Fails
1. Rollback code deployment
2. Restore database backup
3. Investigate issue locally
```

---

### 8. Security Documentation
**Create:** `docs/SECURITY.md` (enhance existing)

**Add sections:**
- Authentication flow
- Authorization model
- Rate limiting configuration
- Security headers explanation
- Incident response procedure
- Vulnerability reporting process

---

### 9. Troubleshooting Guide
**Create:** `docs/TROUBLESHOOTING.md`

```markdown
# Troubleshooting Guide

## Common Issues

### Backend Issues

#### Database Connection Errors
**Symptom:** `django.db.utils.OperationalError`
**Solutions:**
- Check DATABASE_URL in .env
- Verify PostgreSQL is running
- Check firewall/security groups

#### Module Import Errors
**Symptom:** `ModuleNotFoundError`
**Solutions:**
- Activate virtual environment
- Run `pip install -r requirements.txt`
- Check Python version (3.11+ required)

### Frontend Issues

#### Build Failures
**Symptom:** `npm run build` fails
**Solutions:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node version (18+ required)
- Review build logs for specific errors

#### API Connection Issues
**Symptom:** Network errors, CORS issues
**Solutions:**
- Verify REACT_APP_API_URL in .env
- Check backend is running
- Review CORS settings in Django

### Performance Issues

#### Slow Queries
**Symptom:** API responses taking >3 seconds
**Solutions:**
- Check database indexes
- Review query logs
- Add select_related/prefetch_related

#### Large Bundle Size
**Symptom:** Frontend takes long to load
**Solutions:**
- Run bundle analyzer
- Code split large components
- Remove unused dependencies
```

---

### 10. Contributing Guide Enhancement
**File:** `CONTRIBUTING.md` exists
**Enhancement Needed:** Add detailed guidelines

**Add sections:**
- Code style guide (Python: PEP 8, TypeScript: Airbnb)
- Git workflow (branch naming, commit messages)
- Pull request template
- Code review checklist
- Testing requirements

---

## Documentation Best Practices

### 11. Keep Documentation Close to Code
**Recommendation:**
- README in each major directory
- Inline comments for complex logic
- Docstrings on all public functions
- Type hints for clarity

### 12. Documentation as Code
**Recommendation:**
- Store docs in version control
- Review docs in PRs
- Update docs with code changes
- Use Markdown for consistency

### 13. Visual Documentation
**Tools:**
- Draw.io for diagrams
- Mermaid for inline diagrams
- Screenshots for UI documentation
- ER diagrams for database schema

**Example Mermaid Diagram:**
```markdown
\`\`\`mermaid
graph TD
    A[User Uploads File] --> B[Validate File]
    B --> C{Valid?}
    C -->|Yes| D[Parse Excel]
    C -->|No| E[Return Error]
    D --> F[Save to Database]
    F --> G[Generate Report]
    G --> H[Return Success]
\`\`\`
```

---

### 14. Changelog Documentation
**Issue:** No changelog tracking feature additions and bug fixes

**Recommendation:**
Create `CHANGELOG.md` following Keep a Changelog format:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.2.0] - 2025-01-15

### Added
- Excel summary page with executive-style layout
- Transaction management for multi-step operations
- Standardized error handling across all endpoints

### Changed
- Updated performance highlight colors to modern scheme
- Streamlined wizard interfaces

### Fixed
- ExcelJS import syntax error
- File size validation (increased to 50MB)
```

### 15. ADR (Architecture Decision Records)
**Issue:** No documentation of architectural decisions

**Recommendation:**
Create `docs/adr/` directory with decision records:

```markdown
# ADR-001: Use ExcelJS instead of xlsx

**Status:** Accepted
**Date:** 2025-01-10

## Context
Need to process Excel files securely without vulnerabilities.

## Decision
Replace xlsx@0.18.5 with exceljs@4.4.0

## Consequences
- Better security (no known vulnerabilities)
- Modern API with TypeScript support
- Namespace imports required
```

### 16. Runbook Documentation
**Issue:** No operational runbooks for common tasks

**Recommendation:**
Create `docs/runbooks/` with procedures:
- Database backup and restore
- Deploy new version
- Scale infrastructure
- Incident response
- Database migration rollback

---

## Quick Documentation Wins

1. **Add docstrings to top 10 services** (3h)
2. **Create API docs with drf-spectacular** (4h)
3. **Enhance README with troubleshooting** (2h)
4. **Document environment variables** (1h) - ✅ COMPLETED
5. **Add inline comments to complex logic** (2h)
6. **Create CHANGELOG.md** (1h)
7. **Start ADR documentation** (2h)

---

## Documentation Standards

### Code Documentation
- **Functions:** Google-style docstrings
- **Classes:** Purpose, attributes, usage examples
- **Modules:** High-level overview at top
- **Complex Logic:** Inline comments explaining "why"

### API Documentation
- **Endpoints:** URL, method, parameters, responses
- **Authentication:** Required headers, token format
- **Examples:** Request/response samples
- **Error Codes:** All possible errors documented

### Architecture Documentation
- **High-level:** System overview, component interaction
- **Mid-level:** Data flow, key algorithms
- **Low-level:** Implementation details, edge cases

---

## Files Requiring Immediate Attention

1. Create `docs/ARCHITECTURE.md` - System overview
2. Implement drf-spectacular - API documentation
3. Enhance `README.md` - Setup instructions
4. Add docstrings to `backend/bni/services/*.py`
5. Create `docs/TROUBLESHOOTING.md` - Common issues

---

## Recommended Approach

**Phase 1 - Critical (Week 1)**
- Implement API documentation (drf-spectacular)
- Create architecture overview
- Enhance README with setup guide

**Phase 2 - Important (Week 2)**
- Add docstrings to all services
- Create testing documentation
- Write deployment guide

**Phase 3 - Polish (Week 3)**
- Add inline comments to complex code
- Create troubleshooting guide
- Visual documentation (diagrams)

**Phase 4 - Ongoing**
- Update docs with code changes
- Review docs in PRs
- Collect feedback from new developers
