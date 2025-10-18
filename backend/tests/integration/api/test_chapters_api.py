"""
Integration tests for Chapters API endpoints.

Tests CRUD operations and chapter-specific functionality.
"""

import pytest
import json
from django.urls import reverse
from rest_framework import status

from chapters.models import Chapter


@pytest.mark.integration
@pytest.mark.api
class TestChaptersAPI:
    """Integration tests for /api/chapters/ endpoints."""

    def test_list_chapters_returns_all_chapters(self, api_client, sample_chapter):
        """Test GET /api/chapters/ returns all chapters."""
        url = reverse("chapter-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        # Verify structure
        chapter = data[0]
        assert "id" in chapter
        assert "name" in chapter
        assert "location" in chapter

    def test_retrieve_chapter_returns_chapter_details(self, api_client, sample_chapter):
        """Test GET /api/chapters/{id}/ returns chapter details."""
        url = reverse("chapter-detail", kwargs={"pk": sample_chapter.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == sample_chapter.id
        assert data["name"] == sample_chapter.name
        assert data["location"] == sample_chapter.location

    def test_retrieve_nonexistent_chapter_returns_404(self, api_client):
        """Test GET /api/chapters/{id}/ returns 404 for nonexistent chapter."""
        url = reverse("chapter-detail", kwargs={"pk": 99999})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_chapter_creates_new_chapter(self, api_client):
        """Test POST /api/chapters/ creates a new chapter."""
        url = reverse("chapter-list")
        data = {
            "name": "New Test Chapter",
            "location": "New City",
            "region": "Test Region",
            "status": "active",
        }
        response = api_client.post(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_201_CREATED
        response_data = response.json()
        assert response_data["name"] == data["name"]
        assert response_data["location"] == data["location"]

        # Verify chapter was created in database
        assert Chapter.objects.filter(name="New Test Chapter").exists()

    def test_create_chapter_validates_required_fields(self, api_client):
        """Test POST /api/chapters/ validates required fields."""
        url = reverse("chapter-list")
        data = {
            "name": "",  # Empty name should fail
            "location": "City",
        }
        response = api_client.post(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_chapter_updates_fields(self, api_client, sample_chapter):
        """Test PUT /api/chapters/{id}/ updates chapter."""
        url = reverse("chapter-detail", kwargs={"pk": sample_chapter.id})
        data = {
            "name": sample_chapter.name,
            "location": "Updated City",
            "region": sample_chapter.region,
            "status": sample_chapter.status,
        }
        response = api_client.put(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["location"] == "Updated City"

        # Verify in database
        sample_chapter.refresh_from_db()
        assert sample_chapter.location == "Updated City"

    def test_partial_update_chapter_updates_specific_fields(self, api_client, sample_chapter):
        """Test PATCH /api/chapters/{id}/ updates specific fields."""
        url = reverse("chapter-detail", kwargs={"pk": sample_chapter.id})
        data = {"status": "inactive"}
        response = api_client.patch(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_200_OK
        sample_chapter.refresh_from_db()
        assert sample_chapter.status == "inactive"

    def test_delete_chapter_removes_chapter(self, api_client, sample_chapter):
        """Test DELETE /api/chapters/{id}/ removes chapter."""
        chapter_id = sample_chapter.id
        url = reverse("chapter-detail", kwargs={"pk": chapter_id})
        response = api_client.delete(url)

        assert response.status_code in [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK]

        # Verify chapter was deleted
        assert not Chapter.objects.filter(id=chapter_id).exists()

    def test_get_chapter_members_returns_member_list(self, api_client, sample_chapter, sample_member):
        """Test GET /api/chapters/{id}/members/ returns chapter members."""
        url = reverse("chapter-members", kwargs={"pk": sample_chapter.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        # Verify member structure
        member = data[0]
        assert "id" in member
        assert "first_name" in member
        assert "last_name" in member

    def test_get_chapter_reports_returns_monthly_reports(self, api_client, sample_chapter, sample_monthly_report):
        """Test GET /api/chapters/{id}/reports/ returns chapter reports."""
        url = reverse("chapter-reports", kwargs={"pk": sample_chapter.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        # Verify report structure
        report = data[0]
        assert "id" in report
        assert "month_year" in report
        assert "status" in report

    def test_chapter_statistics_returns_summary_data(self, api_client, sample_chapter, sample_member):
        """Test GET /api/chapters/{id}/statistics/ returns chapter statistics."""
        url = reverse("chapter-statistics", kwargs={"pk": sample_chapter.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Verify structure (adjust based on actual API response)
        assert "total_members" in data or "member_count" in data

    def test_list_chapters_filters_by_status(self, api_client, sample_chapter):
        """Test GET /api/chapters/?status=active filters chapters by status."""
        url = reverse("chapter-list") + "?status=active"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # All returned chapters should have active status
        for chapter in data:
            assert chapter["status"] == "active"

    def test_list_chapters_supports_search(self, api_client, sample_chapter):
        """Test GET /api/chapters/?search=Test searches chapters."""
        url = reverse("chapter-list") + f"?search={sample_chapter.name}"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1
        # Verify search result contains the search term
        assert any(sample_chapter.name in chapter["name"] for chapter in data)
