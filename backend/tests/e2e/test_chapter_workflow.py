"""
End-to-end tests for chapter management workflow.

Tests complete user workflows from frontend to backend.
"""

import pytest
from playwright.sync_api import Page, expect


@pytest.mark.e2e
class TestChapterWorkflow:
    """E2E tests for chapter creation and management."""

    @pytest.fixture(autouse=True)
    def setup(self, page: Page):
        """Setup for each test."""
        self.page = page
        self.base_url = "http://localhost:3000"

    def test_create_new_chapter_workflow(self):
        """Test complete workflow of creating a new chapter."""
        # Navigate to chapters page
        self.page.goto(f"{self.base_url}/chapters")

        # Click "Add Chapter" button
        self.page.click('button:has-text("Add Chapter")')

        # Fill in chapter form
        self.page.fill('input[name="name"]', "E2E Test Chapter")
        self.page.fill('input[name="location"]', "Test City")
        self.page.fill('input[name="region"]', "Test Region")

        # Submit form
        self.page.click('button[type="submit"]')

        # Verify success message
        expect(self.page.locator('.success-message')).to_be_visible()

        # Verify chapter appears in list
        expect(self.page.locator('text=E2E Test Chapter')).to_be_visible()

    def test_view_chapter_details(self):
        """Test viewing chapter details."""
        self.page.goto(f"{self.base_url}/chapters")

        # Click on a chapter
        self.page.click('.chapter-card:first-child')

        # Verify chapter details page
        expect(self.page.locator('h1')).to_contain_text("Chapter Details")

        # Verify key sections are present
        expect(self.page.locator('[data-testid="chapter-info"]')).to_be_visible()
        expect(self.page.locator('[data-testid="members-section"]')).to_be_visible()

    def test_edit_chapter_information(self):
        """Test editing chapter information."""
        self.page.goto(f"{self.base_url}/chapters")

        # Click on chapter and then edit button
        self.page.click('.chapter-card:first-child')
        self.page.click('button:has-text("Edit")')

        # Update location
        self.page.fill('input[name="location"]', "Updated City")
        self.page.click('button[type="submit"]')

        # Verify update
        expect(self.page.locator('text=Updated City')).to_be_visible()

    def test_search_chapters(self):
        """Test chapter search functionality."""
        self.page.goto(f"{self.base_url}/chapters")

        # Type in search box
        self.page.fill('input[placeholder*="Search"]', "Test")

        # Wait for results
        self.page.wait_for_selector('.chapter-card')

        # Verify filtered results
        chapters = self.page.locator('.chapter-card').all()
        assert len(chapters) > 0

    def test_delete_chapter_workflow(self):
        """Test deleting a chapter."""
        self.page.goto(f"{self.base_url}/chapters")

        # Get initial count
        initial_count = self.page.locator('.chapter-card').count()

        # Click chapter and delete
        self.page.click('.chapter-card:first-child')
        self.page.click('button:has-text("Delete")')

        # Confirm deletion in modal
        self.page.click('button:has-text("Confirm")')

        # Verify chapter removed
        self.page.goto(f"{self.base_url}/chapters")
        final_count = self.page.locator('.chapter-card').count()
        assert final_count == initial_count - 1


@pytest.mark.e2e
class TestReportGenerationWorkflow:
    """E2E tests for report generation."""

    @pytest.fixture(autouse=True)
    def setup(self, page: Page):
        """Setup for each test."""
        self.page = page
        self.base_url = "http://localhost:3000"

    def test_generate_single_month_report(self):
        """Test generating a single month report."""
        # Navigate to report wizard
        self.page.goto(f"{self.base_url}/analytics")
        self.page.click('text=Report Wizard')

        # Select single month report
        self.page.click('[data-report-type="single"]')
        self.page.click('button:has-text("Next")')

        # Select a month
        self.page.click('.month-selector:first-child')
        self.page.click('button:has-text("Next")')

        # Configure options
        self.page.check('input[name="includePalms"]')
        self.page.click('button:has-text("Generate Report")')

        # Verify report display
        expect(self.page.locator('.report-results')).to_be_visible(timeout=10000)
        expect(self.page.locator('.matrix-display')).to_be_visible()

    def test_download_report_matrices(self):
        """Test downloading report matrices."""
        # First generate a report (using previous test logic)
        self.test_generate_single_month_report()

        # Click download button
        with self.page.expect_download() as download_info:
            self.page.click('button:has-text("Download Matrices")')

        download = download_info.value
        # Verify file downloaded
        assert download.suggested_filename.endswith('.xlsx')

    def test_generate_multi_month_aggregation(self):
        """Test generating multi-month aggregated report."""
        self.page.goto(f"{self.base_url}/analytics")
        self.page.click('text=Report Wizard')

        # Select multi-month
        self.page.click('[data-report-type="multi"]')
        self.page.click('button:has-text("Next")')

        # Select multiple months
        self.page.check('.month-checkbox:nth-child(1)')
        self.page.check('.month-checkbox:nth-child(2)')
        self.page.check('.month-checkbox:nth-child(3)')
        self.page.click('button:has-text("Next")')

        # Generate
        self.page.click('button:has-text("Generate Report")')

        # Verify aggregated results
        expect(self.page.locator('.aggregated-results')).to_be_visible(timeout=10000)


@pytest.mark.e2e
class TestMemberManagementWorkflow:
    """E2E tests for member management."""

    @pytest.fixture(autouse=True)
    def setup(self, page: Page):
        """Setup for each test."""
        self.page = page
        self.base_url = "http://localhost:3000"

    def test_add_member_to_chapter(self):
        """Test adding a new member to a chapter."""
        # Navigate to chapter
        self.page.goto(f"{self.base_url}/chapters")
        self.page.click('.chapter-card:first-child')

        # Click add member
        self.page.click('button:has-text("Add Member")')

        # Fill member form
        self.page.fill('input[name="firstName"]', "Jane")
        self.page.fill('input[name="lastName"]', "Doe")
        self.page.fill('input[name="businessName"]', "Jane's Business")
        self.page.fill('input[name="classification"]', "Accountant")
        self.page.fill('input[name="email"]', "jane@example.com")

        # Submit
        self.page.click('button[type="submit"]')

        # Verify member added
        expect(self.page.locator('text=Jane Doe')).to_be_visible()

    def test_edit_member_details(self):
        """Test editing member information."""
        self.page.goto(f"{self.base_url}/chapters")
        self.page.click('.chapter-card:first-child')

        # Click on member
        self.page.click('.member-row:first-child')
        self.page.click('button:has-text("Edit")')

        # Update phone
        self.page.fill('input[name="phone"]', "555-9999")
        self.page.click('button[type="submit"]')

        # Verify update
        expect(self.page.locator('text=555-9999')).to_be_visible()

    def test_search_members(self):
        """Test member search functionality."""
        self.page.goto(f"{self.base_url}/chapters")
        self.page.click('.chapter-card:first-child')

        # Search for member
        self.page.fill('input[placeholder*="Search members"]', "John")

        # Verify filtered results
        expect(self.page.locator('.member-row')).to_have_count(1, timeout=5000)


# Pytest-playwright configuration
@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    """Configure browser context."""
    return {
        **browser_context_args,
        "viewport": {"width": 1920, "height": 1080},
        "ignore_https_errors": True,
    }
