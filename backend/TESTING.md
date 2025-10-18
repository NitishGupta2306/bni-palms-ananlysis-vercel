# Testing Guide - BNI PALMS Analytics

**Last Updated:** 2025-10-18
**Status:** Active

This document describes the testing infrastructure, how to run tests, and testing best practices for the BNI PALMS Analytics backend.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Coverage](#test-coverage)
6. [CI/CD Integration](#cicd-integration)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Installation

```bash
# Install test dependencies
cd backend
pip install -r requirements-test.txt

# Install Playwright browsers (for E2E tests)
playwright install
```

### Run All Tests

```bash
# Run all tests with coverage
pytest

# Run specific test types
pytest -m unit           # Unit tests only
pytest -m integration    # Integration tests only
pytest -m e2e           # E2E tests only
```

---

## Test Structure

```
backend/
├── tests/
│   ├── conftest.py                    # Shared fixtures and configuration
│   ├── unit/                          # Unit tests (fast, isolated)
│   │   ├── services/
│   │   │   ├── test_backup_service.py
│   │   │   ├── test_data_aggregator.py
│   │   │   └── test_calculations.py
│   │   └── models/
│   ├── integration/                   # Integration tests (API, DB)
│   │   ├── api/
│   │   │   ├── test_chapters_api.py
│   │   │   ├── test_members_api.py
│   │   │   └── test_reports_api.py
│   │   └── services/
│   └── e2e/                          # End-to-end tests (full workflows)
│       ├── test_chapter_workflow.py
│       ├── test_report_workflow.py
│       └── test_member_workflow.py
├── pytest.ini                         # Pytest configuration
├── .coveragerc                        # Coverage configuration
└── requirements-test.txt              # Test dependencies
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run tests in parallel (faster)
pytest -n auto

# Run specific test file
pytest tests/unit/services/test_backup_service.py

# Run specific test class
pytest tests/unit/services/test_backup_service.py::TestBackupService

# Run specific test method
pytest tests/unit/services/test_backup_service.py::TestBackupService::test_create_database_backup_success
```

### Test Markers

Tests are organized with markers for easy filtering:

```bash
# Run by marker
pytest -m unit           # Fast, isolated unit tests
pytest -m integration    # API and database tests
pytest -m e2e           # Full workflow tests
pytest -m api           # API endpoint tests
pytest -m service       # Service layer tests
pytest -m slow          # Slow-running tests

# Combine markers
pytest -m "unit and service"     # Unit tests for services only
pytest -m "not slow"             # Skip slow tests
```

### Watch Mode

```bash
# Re-run tests automatically on file changes
pytest-watch

# Or use pytest-xdist with watch
pytest --looponfail
```

---

## Writing Tests

### Test Naming Conventions

- **Files:** `test_*.py` or `*_test.py`
- **Classes:** `Test*` (e.g., `TestBackupService`)
- **Methods:** `test_*` (e.g., `test_create_backup_success`)

### Unit Test Example

```python
import pytest
from bni.services.backup_service import BackupService

@pytest.mark.unit
@pytest.mark.service
class TestBackupService:
    """Test suite for BackupService."""

    def test_create_database_backup_success(self, sample_backup_dir):
        """Test successful database backup creation."""
        service = BackupService(backup_dir=sample_backup_dir)
        result = service.create_database_backup()

        assert result["success"] is True
        assert result["type"] == "database"
        assert "path" in result
```

### Integration Test Example

```python
import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.integration
@pytest.mark.api
class TestChaptersAPI:
    """Integration tests for chapters API."""

    def test_list_chapters_returns_all_chapters(self, api_client, sample_chapter):
        """Test GET /api/chapters/ returns all chapters."""
        url = reverse("chapter-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
```

### E2E Test Example

```python
import pytest
from playwright.sync_api import Page, expect

@pytest.mark.e2e
class TestChapterWorkflow:
    """E2E tests for chapter workflows."""

    def test_create_new_chapter_workflow(self, page: Page):
        """Test complete workflow of creating a chapter."""
        page.goto("http://localhost:3000/chapters")
        page.click('button:has-text("Add Chapter")')
        page.fill('input[name="name"]', "Test Chapter")
        page.click('button[type="submit"]')

        expect(page.locator('text=Test Chapter')).to_be_visible()
```

---

## Test Fixtures

Common fixtures are available in `tests/conftest.py`:

### Database Fixtures

```python
def test_my_feature(sample_chapter, sample_member):
    """Test uses pre-created chapter and member."""
    assert sample_chapter.name == "Test Chapter"
    assert sample_member.chapter == sample_chapter
```

**Available Fixtures:**
- `sample_chapter` - Test chapter
- `sample_member` - Test member
- `multiple_members` - Multiple test members
- `sample_monthly_report` - Test monthly report
- `multiple_monthly_reports` - Multiple reports for aggregation
- `sample_backup_dir` - Temporary backup directory
- `sample_matrix_data` - Sample matrix data
- `api_client` - Django test client

### Custom Fixtures

Create custom fixtures in test files or `conftest.py`:

```python
@pytest.fixture
def custom_report(sample_chapter):
    """Create a custom test report."""
    return MonthlyReport.objects.create(
        chapter=sample_chapter,
        month_year="2024-01",
        status="processed",
    )
```

---

## Test Coverage

### Generate Coverage Report

```bash
# Run tests with coverage
pytest --cov=. --cov-report=html --cov-report=term-missing

# Open HTML report
open htmlcov/index.html
```

### Coverage Goals

- **Overall:** 80%+ coverage
- **Critical services:** 90%+ coverage
- **API endpoints:** 85%+ coverage

### Exclude from Coverage

Already configured in `.coveragerc`:
- Migrations
- Test files
- Virtual environments
- Configuration files

---

## Mocking and Patching

### Mock External Services

```python
from unittest.mock import patch, MagicMock

@patch("bni.services.backup_service.call_command")
def test_with_mocked_command(mock_call_command):
    """Test with mocked Django management command."""
    mock_call_command.return_value = None
    # Test code here
```

### Mock HTTP Requests

```python
import responses

@responses.activate
def test_external_api():
    """Test with mocked HTTP responses."""
    responses.add(
        responses.GET,
        "https://api.example.com/data",
        json={"status": "ok"},
        status=200,
    )
    # Test code here
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-test.txt
      - name: Run tests
        run: pytest --cov=. --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Best Practices

### ✅ DO

- Write tests for all new features
- Test edge cases and error conditions
- Use descriptive test names
- Keep tests focused and isolated
- Use fixtures for common setup
- Mock external dependencies
- Test both success and failure paths
- Use markers to organize tests

### ❌ DON'T

- Don't test Django/library internals
- Don't write tests that depend on external services
- Don't hardcode sensitive data in tests
- Don't write tests that depend on test order
- Don't test implementation details (test behavior)
- Don't skip writing tests "temporarily"

---

## Troubleshooting

### Tests Failing Locally

```bash
# Clear pytest cache
pytest --cache-clear

# Recreate test database
pytest --create-db

# Run with verbose output
pytest -vv
```

### Import Errors

```bash
# Ensure DJANGO_SETTINGS_MODULE is set
export DJANGO_SETTINGS_MODULE=config.settings

# Or set in pytest.ini (already configured)
```

### Database Issues

```bash
# Reset test database
python manage.py flush --settings=config.settings --no-input

# Run migrations
python manage.py migrate --settings=config.settings
```

### E2E Test Failures

```bash
# Ensure frontend is running
cd frontend && npm run dev

# Ensure backend is running
cd backend && python manage.py runserver

# Install Playwright browsers
playwright install
```

---

## Performance Testing

```bash
# Run with benchmarking
pytest --benchmark-only

# Profile slow tests
pytest --durations=10
```

---

## Continuous Improvement

- Review test coverage weekly
- Add tests for bug fixes
- Refactor tests as code evolves
- Update this document when practices change

---

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Django Testing](https://docs.djangoproject.com/en/4.2/topics/testing/)
- [Playwright Python](https://playwright.dev/python/)
- [Coverage.py](https://coverage.readthedocs.io/)

---

**Last Updated:** 2025-10-18
**Version:** 1.0
**Status:** Active
