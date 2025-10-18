"""
Pytest configuration and shared fixtures for BNI PALMS Analytics tests.

This module provides common test fixtures and configuration for all test suites.
"""

import pytest
from django.test import Client
from django.contrib.auth.models import User
from datetime import datetime, date
from decimal import Decimal

# Import models
from chapters.models import Chapter
from members.models import Member
from reports.models import MonthlyReport


@pytest.fixture
def api_client():
    """Provides a Django test client for API testing."""
    return Client()


@pytest.fixture
def sample_chapter(db):
    """Creates a test chapter."""
    return Chapter.objects.create(
        name="Test Chapter",
        location="Test City",
        region="Test Region",
        status="active",
    )


@pytest.fixture
def sample_member(db, sample_chapter):
    """Creates a test member."""
    return Member.objects.create(
        chapter=sample_chapter,
        first_name="John",
        last_name="Doe",
        business_name="John's Business",
        classification="Accountant",
        email="john@example.com",
        phone="555-1234",
        status="active",
    )


@pytest.fixture
def multiple_members(db, sample_chapter):
    """Creates multiple test members."""
    members = []
    names = [
        ("Alice", "Smith", "Alice's Services", "Attorney"),
        ("Bob", "Johnson", "Bob's Business", "Banker"),
        ("Carol", "Williams", "Carol's Company", "Chiropractor"),
    ]
    for first, last, business, classification in names:
        member = Member.objects.create(
            chapter=sample_chapter,
            first_name=first,
            last_name=last,
            business_name=business,
            classification=classification,
            email=f"{first.lower()}@example.com",
            status="active",
        )
        members.append(member)
    return members


@pytest.fixture
def sample_monthly_report(db, sample_chapter):
    """Creates a test monthly report with sample data."""
    report = MonthlyReport.objects.create(
        chapter=sample_chapter,
        month_year=date(2024, 1, 1),
        referral_matrix_data={
            "members": ["Alice Smith", "Bob Johnson"],
            "matrix": {
                "data": {
                    "Alice Smith": {"Bob Johnson": 2},
                    "Bob Johnson": {"Alice Smith": 1},
                }
            },
        },
        oto_matrix_data={
            "members": ["Alice Smith", "Bob Johnson"],
            "matrix": {
                "data": {
                    "Alice Smith": {"Bob Johnson": 1},
                    "Bob Johnson": {"Alice Smith": 1},
                }
            },
        },
        tyfcb_inside_data={
            "total_amount": 1500.00,
            "count": 2,
            "by_member": {
                "Alice Smith": 1000.00,
                "Bob Johnson": 500.00,
            },
        },
        tyfcb_outside_data={
            "total_amount": 2000.00,
            "count": 2,
            "by_member": {
                "Alice Smith": 1200.00,
                "Bob Johnson": 800.00,
            },
        },
        status="processed",
    )
    return report


@pytest.fixture
def multiple_monthly_reports(db, sample_chapter):
    """Creates multiple monthly reports for aggregation testing."""
    reports = []
    for month in [1, 2, 3]:
        report = MonthlyReport.objects.create(
            chapter=sample_chapter,
            month_year=date(2024, month, 1),
            referral_matrix_data={
                "members": ["Alice Smith", "Bob Johnson"],
                "matrix": {
                    "data": {
                        "Alice Smith": {"Bob Johnson": month},
                        "Bob Johnson": {"Alice Smith": month - 1},
                    }
                },
            },
            oto_matrix_data={
                "members": ["Alice Smith", "Bob Johnson"],
                "matrix": {
                    "data": {
                        "Alice Smith": {"Bob Johnson": 1},
                        "Bob Johnson": {"Alice Smith": 1},
                    }
                },
            },
            status="processed",
        )
        reports.append(report)
    return reports


@pytest.fixture
def sample_backup_dir(tmp_path):
    """Creates a temporary directory for backup testing."""
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()
    return str(backup_dir)


@pytest.fixture
def sample_matrix_data():
    """Provides sample matrix data for testing calculations."""
    return {
        "members": ["Alice Smith", "Bob Johnson", "Carol Williams"],
        "matrix": [[0, 2, 1], [1, 0, 2], [1, 1, 0]],
        "totals": {
            "given": {"Alice Smith": 3, "Bob Johnson": 3, "Carol Williams": 2},
            "received": {"Alice Smith": 2, "Bob Johnson": 3, "Carol Williams": 3},
            "unique_given": {"Alice Smith": 2, "Bob Johnson": 2, "Carol Williams": 2},
        },
    }


@pytest.fixture
def sample_referral_data():
    """Provides sample referral matrix for performance calculations."""
    return {
        "members": ["Member1", "Member2", "Member3"],
        "matrix": [[0, 5, 3], [2, 0, 1], [0, 0, 0]],
    }


@pytest.fixture
def sample_oto_data():
    """Provides sample one-to-one matrix for performance calculations."""
    return {
        "members": ["Member1", "Member2", "Member3"],
        "matrix": [[0, 2, 1], [2, 0, 0], [1, 0, 0]],
    }


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line("markers", "unit: Unit tests (fast, isolated)")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "slow: Slow running tests")
    config.addinivalue_line("markers", "api: API endpoint tests")
    config.addinivalue_line("markers", "service: Service layer tests")
    config.addinivalue_line("markers", "model: Model tests")


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """Enable database access for all tests automatically."""
    pass
