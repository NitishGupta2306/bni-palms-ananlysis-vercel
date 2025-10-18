"""
Integration tests for Chapters API endpoints.

Tests CRUD operations, authentication, and dashboard functionality.
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

    def test_list_chapters_returns_all_chapters(
        self, api_client, sample_chapter
    ):
        """Test GET /api/chapters/ returns all chapters."""
        url = reverse("chapter-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        # Verify structure
        assert "id" in data[0]
        assert "name" in data[0]
        assert "total_members" in data[0]

    def test_list_chapters_includes_statistics(
        self, api_client, sample_chapter, sample_member
    ):
        """Test GET /api/chapters/ includes chapter statistics."""
        url = reverse("chapter-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        chapter = data[0]

        # Verify statistics fields
        assert "total_referrals" in chapter
        assert "total_one_to_ones" in chapter
        assert "total_tyfcb_inside" in chapter
        assert "avg_referrals_per_member" in chapter
        assert "members" in chapter

    def test_retrieve_chapter_returns_details(
        self, api_client, sample_chapter
    ):
        """Test GET /api/chapters/{id}/ returns chapter details."""
        url = reverse("chapter-detail", kwargs={"pk": sample_chapter.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == sample_chapter.id
        assert data["name"] == sample_chapter.name
        assert "members" in data

    def test_retrieve_chapter_includes_member_details(
        self, api_client, sample_chapter, sample_member
    ):
        """Test GET /api/chapters/{id}/ includes detailed member information."""
        url = reverse("chapter-detail", kwargs={"pk": sample_chapter.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        members = data["members"]
        assert len(members) >= 1

        # Verify member detail structure
        member = members[0]
        assert "id" in member
        assert "full_name" in member
        assert "referrals_given" in member
        assert "referrals_received" in member
        assert "one_to_ones" in member
        assert "tyfcb_received" in member

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
            "location": "Dubai",
            "meeting_day": "Tuesday",
            "meeting_time": "07:00:00",
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

    def test_create_chapter_requires_name(self, api_client):
        """Test POST /api/chapters/ validates required name field."""
        url = reverse("chapter-list")
        data = {
            "location": "Dubai",
        }
        response = api_client.post(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_duplicate_chapter_returns_existing(self, api_client, sample_chapter):
        """Test creating duplicate chapter returns existing chapter."""
        url = reverse("chapter-list")
        data = {
            "name": sample_chapter.name,
            "location": sample_chapter.location,
        }
        response = api_client.post(
            url, data=json.dumps(data), content_type="application/json"
        )

        # Should return 200 (exists) not 201 (created)
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["id"] == sample_chapter.id

    def test_update_chapter_updates_fields(self, api_client, sample_chapter):
        """Test PUT /api/chapters/{id}/ updates chapter."""
        url = reverse("chapter-detail", kwargs={"pk": sample_chapter.id})
        data = {
            "name": sample_chapter.name,
            "location": "Updated Location",
            "meeting_day": "Wednesday",
            "meeting_time": "08:00:00",
        }
        response = api_client.put(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_200_OK
        sample_chapter.refresh_from_db()
        assert sample_chapter.location == "Updated Location"
        assert sample_chapter.meeting_day == "Wednesday"

    def test_partial_update_chapter(self, api_client, sample_chapter):
        """Test PATCH /api/chapters/{id}/ updates specific fields."""
        url = reverse("chapter-detail", kwargs={"pk": sample_chapter.id})
        data = {"location": "Partial Update Location"}
        response = api_client.patch(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_200_OK
        sample_chapter.refresh_from_db()
        assert sample_chapter.location == "Partial Update Location"

    def test_delete_chapter_removes_chapter(self, api_client, sample_chapter):
        """Test DELETE /api/chapters/{id}/ removes chapter."""
        chapter_id = sample_chapter.id
        url = reverse("chapter-detail", kwargs={"pk": chapter_id})
        response = api_client.delete(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "message" in data
        assert "members_deleted" in data

        # Verify chapter was deleted
        assert not Chapter.objects.filter(id=chapter_id).exists()

    def test_chapter_authenticate_success(self, api_client, sample_chapter):
        """Test POST /api/chapters/{id}/authenticate/ with correct password."""
        # Set a known password
        sample_chapter.set_password("testpass123")
        sample_chapter.save()

        url = reverse("chapter-authenticate", kwargs={"pk": sample_chapter.id})
        data = {"password": "testpass123"}
        response = api_client.post(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert "token" in response_data
        assert "chapter" in response_data
        assert "expires_in_hours" in response_data

    def test_chapter_authenticate_failure(self, api_client, sample_chapter):
        """Test POST /api/chapters/{id}/authenticate/ with wrong password."""
        # Set a known password
        sample_chapter.set_password("correctpass")
        sample_chapter.save()

        url = reverse("chapter-authenticate", kwargs={"pk": sample_chapter.id})
        data = {"password": "wrongpass"}
        response = api_client.post(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        response_data = response.json()
        assert "error" in response_data
        assert "attempts_remaining" in response_data

    def test_chapter_authenticate_lockout(self, api_client, sample_chapter):
        """Test POST /api/chapters/{id}/authenticate/ gets locked after failed attempts."""
        # Set a known password
        sample_chapter.set_password("correctpass")
        sample_chapter.save()

        url = reverse("chapter-authenticate", kwargs={"pk": sample_chapter.id})

        # Make 5 failed attempts
        for i in range(5):
            data = {"password": "wrongpass"}
            response = api_client.post(
                url, data=json.dumps(data), content_type="application/json"
            )
            # First 5 should return 401
            assert response.status_code == status.HTTP_401_UNAUTHORIZED

        # 6th attempt should be locked out
        data = {"password": "wrongpass"}
        response = api_client.post(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        response_data = response.json()
        assert "locked_out" in response_data
        assert response_data["locked_out"] is True

    def test_update_chapter_password(self, api_client, sample_chapter):
        """Test POST /api/chapters/{id}/update_password/ updates password."""
        url = reverse("chapter-update-password", kwargs={"pk": sample_chapter.id})
        data = {"new_password": "newpassword123"}
        response = api_client.post(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["success"] is True

        # Verify password was updated
        sample_chapter.refresh_from_db()
        assert sample_chapter.check_password("newpassword123")

    def test_list_chapters_filters_active_members(
        self, api_client, sample_chapter, sample_member
    ):
        """Test GET /api/chapters/ only counts active members."""
        # Create inactive member
        from members.models import Member

        inactive_member = Member.objects.create(
            chapter=sample_chapter,
            first_name="Inactive",
            last_name="User",
            email="inactive@example.com",
            is_active=False,
        )

        url = reverse("chapter-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        chapter_data = next(c for c in data if c["id"] == sample_chapter.id)

        # Should only count active members
        assert chapter_data["total_members"] == 1  # Only sample_member (active)

    def test_chapter_statistics_with_no_data(self, api_client):
        """Test GET /api/chapters/{id}/ with chapter that has no analytics data."""
        # Create chapter with no members
        empty_chapter = Chapter.objects.create(
            name="Empty Chapter", location="Test Location"
        )

        url = reverse("chapter-detail", kwargs={"pk": empty_chapter.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_members"] == 0
        assert data["total_referrals"] == 0
        assert data["total_one_to_ones"] == 0
        assert data["total_tyfcb"] == 0

    def test_list_chapters_includes_all_members_in_response(
        self, api_client, sample_chapter, multiple_members
    ):
        """Test GET /api/chapters/ includes member list for each chapter."""
        url = reverse("chapter-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        chapter_data = next(c for c in data if c["id"] == sample_chapter.id)

        assert "members" in chapter_data
        assert len(chapter_data["members"]) >= 3  # multiple_members fixture
        # Verify member structure
        member = chapter_data["members"][0]
        assert "name" in member
        assert "business_name" in member
        assert "classification" in member
