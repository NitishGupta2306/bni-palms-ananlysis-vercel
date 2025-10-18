"""
Integration tests for Members API endpoints.

Tests CRUD operations and member-specific functionality.
"""

import pytest
import json
from django.urls import reverse
from rest_framework import status

from members.models import Member


@pytest.mark.integration
@pytest.mark.api
class TestMembersAPI:
    """Integration tests for /api/members/ endpoints."""

    def test_list_members_returns_all_members(self, api_client, multiple_members):
        """Test GET /api/members/ returns all members."""
        url = reverse("member-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3

    def test_retrieve_member_returns_details(self, api_client, sample_member):
        """Test GET /api/members/{id}/ returns member details."""
        url = reverse("member-detail", kwargs={"pk": sample_member.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == sample_member.id
        assert data["first_name"] == sample_member.first_name
        assert data["last_name"] == sample_member.last_name

    def test_retrieve_nonexistent_member_returns_404(self, api_client):
        """Test GET /api/members/{id}/ returns 404 for nonexistent member."""
        url = reverse("member-detail", kwargs={"pk": 99999})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_member_creates_new_member(self, api_client, sample_chapter):
        """Test POST /api/members/ creates a new member."""
        url = reverse("member-list")
        data = {
            "chapter": sample_chapter.id,
            "first_name": "New",
            "last_name": "Member",
            "business_name": "New Business",
            "classification": "Dentist",
            "email": "new@example.com",
            "status": "active",
        }
        response = api_client.post(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_201_CREATED
        response_data = response.json()
        assert response_data["first_name"] == data["first_name"]
        assert response_data["last_name"] == data["last_name"]

        # Verify member was created in database
        assert Member.objects.filter(email="new@example.com").exists()

    def test_create_member_validates_required_fields(self, api_client, sample_chapter):
        """Test POST /api/members/ validates required fields."""
        url = reverse("member-list")
        data = {
            "chapter": sample_chapter.id,
            "first_name": "",  # Empty first name should fail
            "last_name": "Member",
        }
        response = api_client.post(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_member_updates_fields(self, api_client, sample_member):
        """Test PUT /api/members/{id}/ updates member."""
        url = reverse("member-detail", kwargs={"pk": sample_member.id})
        data = {
            "chapter": sample_member.chapter.id,
            "first_name": sample_member.first_name,
            "last_name": sample_member.last_name,
            "business_name": "Updated Business Name",
            "classification": sample_member.classification,
            "email": sample_member.email,
            "status": sample_member.status,
        }
        response = api_client.put(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["business_name"] == "Updated Business Name"

        # Verify in database
        sample_member.refresh_from_db()
        assert sample_member.business_name == "Updated Business Name"

    def test_partial_update_member_updates_specific_fields(
        self, api_client, sample_member
    ):
        """Test PATCH /api/members/{id}/ updates specific fields."""
        url = reverse("member-detail", kwargs={"pk": sample_member.id})
        data = {"phone": "555-9999"}
        response = api_client.patch(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_200_OK
        sample_member.refresh_from_db()
        assert sample_member.phone == "555-9999"

    def test_delete_member_removes_member(self, api_client, sample_member):
        """Test DELETE /api/members/{id}/ removes member."""
        member_id = sample_member.id
        url = reverse("member-detail", kwargs={"pk": member_id})
        response = api_client.delete(url)

        assert response.status_code in [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK]

        # Verify member was deleted
        assert not Member.objects.filter(id=member_id).exists()

    def test_list_members_filters_by_chapter(
        self, api_client, sample_chapter, sample_member
    ):
        """Test GET /api/members/?chapter={id} filters by chapter."""
        url = reverse("member-list") + f"?chapter={sample_chapter.id}"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # All returned members should belong to the chapter
        for member in data:
            assert member["chapter"] == sample_chapter.id

    def test_list_members_filters_by_status(self, api_client, sample_member):
        """Test GET /api/members/?status=active filters by status."""
        url = reverse("member-list") + "?status=active"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # All returned members should have active status
        for member in data:
            assert member["status"] == "active"

    def test_list_members_supports_search(self, api_client, sample_member):
        """Test GET /api/members/?search=John searches members."""
        url = reverse("member-list") + f"?search={sample_member.first_name}"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1
        # Verify search result contains the search term
        assert any(
            sample_member.first_name in member["first_name"] for member in data
        )

    def test_create_member_with_duplicate_email_fails(
        self, api_client, sample_chapter, sample_member
    ):
        """Test creating member with duplicate email fails."""
        url = reverse("member-list")
        data = {
            "chapter": sample_chapter.id,
            "first_name": "Duplicate",
            "last_name": "Email",
            "business_name": "Business",
            "classification": "Accountant",
            "email": sample_member.email,  # Duplicate email
            "status": "active",
        }
        response = api_client.post(
            url, data=json.dumps(data), content_type="application/json"
        )

        # Should fail with 400 (validation error) or 409 (conflict)
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_409_CONFLICT,
        ]

    def test_member_statistics_endpoint(self, api_client, sample_member):
        """Test GET /api/members/{id}/statistics/ returns member stats."""
        url = reverse("member-statistics", kwargs={"pk": sample_member.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Verify structure (adjust based on actual API response)
        assert "referrals_given" in data or "total_referrals" in data

    def test_member_name_normalization(self, api_client, sample_chapter):
        """Test that member names are normalized correctly."""
        url = reverse("member-list")
        data = {
            "chapter": sample_chapter.id,
            "first_name": " Test ",  # With whitespace
            "last_name": " Member ",  # With whitespace
            "business_name": "Test Business",
            "classification": "Accountant",
            "email": "test@example.com",
            "status": "active",
        }
        response = api_client.post(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_201_CREATED
        response_data = response.json()
        # Names should be trimmed
        assert response_data["first_name"] == "Test"
        assert response_data["last_name"] == "Member"
