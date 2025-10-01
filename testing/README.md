# BNI Analytics - Testing Suite

This directory contains all testing resources for the BNI Analytics application.

## Directory Structure

```
testing/
├── test-data/              # Real test data from August 2025
│   └── august-2025/
│       ├── slip-audit-reports/  # Slip audit files for all 9 chapters
│       └── member-names/        # Member names files for all 9 chapters
├── backend-tests/          # Django backend tests
│   ├── test_excel_processing.py
│   ├── test_api_endpoints.py
│   └── test_models.py
├── frontend-tests/         # React frontend tests
│   └── file-upload.test.tsx
├── fixtures/               # Test fixtures and mock data
├── checklist.md           # Manual testing checklist
└── README.md              # This file
```

## Running Tests

### Backend Tests (Django)

```bash
cd bni-app/backend

# Run all tests
python manage.py test testing.backend-tests

# Run specific test file
python manage.py test testing.backend-tests.test_excel_processing

# Run with verbosity
python manage.py test testing.backend-tests -v 2

# Run with coverage
coverage run --source='.' manage.py test testing.backend-tests
coverage report
coverage html  # Generates htmlcov/index.html
```

### Frontend Tests (React)

```bash
cd bni-app/frontend

# Run all tests
npm test

# Run tests in CI mode (no watch)
npm run test:ci

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- file-upload.test
```

## Test Data

### August 2025 Data

The `test-data/august-2025/` directory contains real BNI chapter data for 9 chapters:

1. **BNI Continental**
2. **BNI Elevate**
3. **BNI Energy**
4. **BNI Excelerate**
5. **BNI Givers**
6. **BNI Gladiators**
7. **BNI Legends**
8. **BNI Synergy**
9. **BNI United**

Each chapter has:
- **Slip Audit Report(s)**: Excel files containing referrals, one-to-ones, and TYFCB data
- **Member Names File**: Excel file with member information

### Data Source

Test data is copied from: `/Users/nattletale/Documents/bni-docs/august-data/`

**Important**: Do not modify test data files. They represent the source of truth for testing.

## Test Categories

### 1. Backend Excel Processing Tests (`test_excel_processing.py`)

Tests the core Excel file processing functionality:

- ✅ Member names file parsing for all chapters
- ✅ Slip audit file processing
- ✅ Referral data extraction and validation
- ✅ One-to-One meeting extraction
- ✅ TYFCB amount extraction
- ✅ Member name normalization
- ✅ Data integrity and duplicate handling

**Key Features**:
- Uses real August 2025 data
- Processes all 9 chapters
- Validates data accuracy
- Checks error handling

### 2. Backend API Endpoint Tests (`test_api_endpoints.py`)

Tests all API endpoints:

- ✅ Dashboard API (GET /api/dashboard/)
- ✅ File Upload API (POST /api/upload/)
- ✅ Chapter CRUD (GET, POST, DELETE /api/chapters/)
- ✅ Monthly Reports (GET, DELETE /api/chapters/{id}/reports/)
- ✅ Member CRUD (GET, POST, PUT, DELETE /api/chapters/{id}/members/)
- ✅ TYFCB Data (GET /api/chapters/{id}/reports/{report_id}/tyfcb-data/)

**Key Features**:
- Tests with real file uploads
- Validates request/response formats
- Checks authentication requirements
- Tests error handling

### 3. Backend Model Tests (`test_models.py`)

Tests Django ORM models:

- ✅ Chapter: creation, uniqueness, relationships
- ✅ Member: name normalization, chapter-unique constraints
- ✅ MonthlyReport: JSON field storage, uniqueness
- ✅ MemberMonthlyStats: JSON arrays, calculations
- ✅ Referral: validation, unique constraints, self-reference prevention
- ✅ OneToOne: relationships, validation
- ✅ TYFCB: decimal precision, null giver support

**Key Features**:
- Validates database constraints
- Tests model methods and properties
- Checks data integrity rules

### 4. Frontend File Upload Tests (`file-upload.test.tsx`)

Tests frontend file upload functionality:

- ✅ Drag and drop file upload
- ✅ Security validation (file size, type, extension)
- ✅ Content sanitization (XSS, prototype pollution, DoS)
- ✅ Upload progress tracking
- ✅ API integration with success/error handling
- ✅ Multi-file upload (slip audit + member names)

**Key Features**:
- Uses @testing-library/react
- Tests security measures
- Validates user interactions

## Manual Testing

### Checklist

The `checklist.md` file contains a comprehensive manual testing checklist covering:

1. ✅ Chapter Management
2. ✅ File Upload & Processing (all 9 chapters)
3. ✅ Members View & Management
4. ✅ Data Viewing & Validation
5. ✅ Data Integrity & Relationships
6. ✅ Reports Management
7. ✅ Navigation & UX
8. ✅ Error Handling
9. ✅ Performance
10. ✅ Cross-Browser Testing
11. ✅ Responsive Design
12. ✅ Security

### How to Use the Checklist

1. Print or open `checklist.md`
2. Follow each section systematically
3. Check off completed items
4. Document any issues found
5. Fill in the test results summary
6. Sign off when complete

## Test Coverage

### Backend Coverage Goals

- **Minimum**: 80% across all metrics
- **Target**: 90% for critical paths
- **Focus Areas**: Excel processing, API endpoints, model validation

### Frontend Coverage Goals

- **Minimum**: 80% (configured in package.json)
- **Target**: 85% for user-facing components
- **Focus Areas**: File upload, navigation, error handling

## Pre-Commit Hooks

The application uses Husky for pre-commit hooks:

- ✅ Run frontend tests before commit
- ✅ Validate commit messages
- ✅ Prevent commits with failing tests

**Location**: `bni-app/.husky/`

## Continuous Integration

### GitHub Actions (Future)

Future CI/CD pipeline will:
- Run all tests on pull requests
- Generate coverage reports
- Run linting and type checking
- Deploy to staging on merge to main

## Testing Best Practices

### 1. Test Naming

- Use descriptive test names: `test_upload_with_real_slip_audit_file`
- Group related tests in classes
- Use clear assertions with messages

### 2. Test Independence

- Each test should be independent
- Use setUp/tearDown for test isolation
- Don't rely on test execution order

### 3. Test Data

- Use real test data from `test-data/` directory
- Create minimal test fixtures for unit tests
- Mock external dependencies

### 4. Test Documentation

- Add docstrings to test classes and methods
- Document expected behavior
- Note any known limitations

## Troubleshooting

### Common Issues

**Issue**: Backend tests can't find test data
**Solution**: Check that `test-data/august-2025/` directory exists with all files

**Issue**: Frontend tests fail with module errors
**Solution**: Run `npm install` to ensure all dependencies are installed

**Issue**: Database errors in backend tests
**Solution**: Ensure migrations are applied: `python manage.py migrate`

**Issue**: Pre-commit hook fails
**Solution**: Fix failing tests before committing, or use `HUSKY=0 git commit` to bypass (not recommended)

## Adding New Tests

### Backend Tests

1. Create test file in `backend-tests/`
2. Import necessary models and utilities
3. Create test class inheriting from `TestCase`
4. Add setUp method if needed
5. Write test methods starting with `test_`
6. Run tests to verify

### Frontend Tests

1. Create test file with `.test.tsx` extension
2. Import React Testing Library utilities
3. Write test cases using `describe` and `it`
4. Use `render`, `screen`, `fireEvent` for testing
5. Add assertions with `expect`

## Resources

- [Django Testing Documentation](https://docs.djangoproject.com/en/4.2/topics/testing/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)

## Next Steps

After completing testing:

1. ✅ Run full backend test suite
2. ✅ Run full frontend test suite
3. ✅ Complete manual testing checklist
4. ✅ Review and fix any failing tests
5. ✅ Generate coverage reports
6. ✅ Document any known issues
7. ✅ Prepare for deployment

## Contact

For questions about testing:
- Review this README
- Check test file docstrings
- Consult `checklist.md` for manual testing procedures
- Refer to project CLAUDE.md for architecture details