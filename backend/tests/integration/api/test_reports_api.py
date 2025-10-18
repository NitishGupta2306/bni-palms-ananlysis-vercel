"""
Integration tests for Reports API endpoints.

Tests report creation, matrix data, and aggregation endpoints.
"""

import pytest
import json
from django.urls import reverse
from rest_framework import status
from datetime import date

from reports.models import MonthlyReport


@pytest.mark.integration
@pytest.mark.api
class TestReportsAPI:
    """Integration tests for /api/reports/ endpoints."""

    def test_list_reports_returns_all_reports(
        self, api_client, sample_monthly_report
    ):
        """Test GET /api/reports/ returns all reports."""
        url = reverse("monthlyreport-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_retrieve_report_returns_details(
        self, api_client, sample_monthly_report
    ):
        """Test GET /api/reports/{id}/ returns report details."""
        url = reverse("monthlyreport-detail", kwargs={"pk": sample_monthly_report.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == sample_monthly_report.id
        assert "month_year" in data
        assert "status" in data

    def test_create_report_creates_new_report(self, api_client, sample_chapter):
        """Test POST /api/reports/ creates a new report."""
        url = reverse("monthlyreport-list")
        data = {
            "chapter": sample_chapter.id,
            "month_year": "2024-03-01",
            "status": "pending",
        }
        response = api_client.post(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_201_CREATED
        response_data = response.json()
        assert response_data["chapter"] == sample_chapter.id

        # Verify report was created in database
        assert MonthlyReport.objects.filter(
            chapter=sample_chapter, month_year=date(2024, 3, 1)
        ).exists()

    def test_get_referral_matrix_returns_matrix(
        self, api_client, sample_monthly_report
    ):
        """Test GET /api/reports/{id}/referral-matrix/ returns matrix data."""
        url = reverse(
            "monthlyreport-referral-matrix", kwargs={"pk": sample_monthly_report.id}
        )
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "members" in data
        assert "matrix" in data or "data" in data

    def test_get_oto_matrix_returns_matrix(self, api_client, sample_monthly_report):
        """Test GET /api/reports/{id}/oto-matrix/ returns matrix data."""
        url = reverse(
            "monthlyreport-oto-matrix", kwargs={"pk": sample_monthly_report.id}
        )
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "members" in data

    def test_get_combination_matrix_returns_matrix(
        self, api_client, sample_monthly_report
    ):
        """Test GET /api/reports/{id}/combination-matrix/ returns matrix data."""
        url = reverse(
            "monthlyreport-combination-matrix", kwargs={"pk": sample_monthly_report.id}
        )
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "members" in data

    def test_get_tyfcb_data_returns_tyfcb(self, api_client, sample_monthly_report):
        """Test GET /api/reports/{id}/tyfcb/ returns TYFCB data."""
        url = reverse("monthlyreport-tyfcb", kwargs={"pk": sample_monthly_report.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "inside" in data or "tyfcb_inside" in data

    def test_list_reports_filters_by_chapter(
        self, api_client, sample_chapter, sample_monthly_report
    ):
        """Test GET /api/reports/?chapter={id} filters by chapter."""
        url = reverse("monthlyreport-list") + f"?chapter={sample_chapter.id}"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # All returned reports should belong to the chapter
        for report in data:
            assert report["chapter"] == sample_chapter.id

    def test_list_reports_filters_by_status(
        self, api_client, sample_monthly_report
    ):
        """Test GET /api/reports/?status=processed filters by status."""
        url = reverse("monthlyreport-list") + "?status=processed"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # All returned reports should have processed status
        for report in data:
            assert report["status"] == "processed"

    def test_aggregate_reports_endpoint(
        self, api_client, multiple_monthly_reports, sample_chapter
    ):
        """Test GET /api/reports/aggregate/ returns aggregated data."""
        report_ids = [r.id for r in multiple_monthly_reports]
        url = (
            reverse("monthlyreport-aggregate")
            + f"?chapter={sample_chapter.id}&report_ids={','.join(map(str, report_ids))}"
        )
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Verify aggregated structure
        assert "referral_matrix" in data or "aggregated_data" in data

    def test_delete_report_removes_report(self, api_client, sample_monthly_report):
        """Test DELETE /api/reports/{id}/ removes report."""
        report_id = sample_monthly_report.id
        url = reverse("monthlyreport-detail", kwargs={"pk": report_id})
        response = api_client.delete(url)

        assert response.status_code in [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK]

        # Verify report was deleted
        assert not MonthlyReport.objects.filter(id=report_id).exists()

    def test_update_report_status(self, api_client, sample_monthly_report):
        """Test updating report status."""
        url = reverse("monthlyreport-detail", kwargs={"pk": sample_monthly_report.id})
        data = {
            "status": "approved",
        }
        response = api_client.patch(
            url, data=json.dumps(data), content_type="application/json"
        )

        assert response.status_code == status.HTTP_200_OK
        sample_monthly_report.refresh_from_db()
        assert sample_monthly_report.status == "approved"

    def test_create_duplicate_report_fails(self, api_client, sample_monthly_report):
        """Test creating duplicate report for same chapter/month fails."""
        url = reverse("monthlyreport-list")
        data = {
            "chapter": sample_monthly_report.chapter.id,
            "month_year": sample_monthly_report.month_year.isoformat(),
            "status": "pending",
        }
        response = api_client.post(
            url, data=json.dumps(data), content_type="application/json"
        )

        # Should fail with 400 (validation error) or 409 (conflict)
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_409_CONFLICT,
        ]

    def test_report_statistics_endpoint(self, api_client, sample_monthly_report):
        """Test GET /api/reports/{id}/statistics/ returns report stats."""
        url = reverse(
            "monthlyreport-statistics", kwargs={"pk": sample_monthly_report.id}
        )
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Verify structure (adjust based on actual API response)
        assert (
            "total_referrals" in data
            or "referral_count" in data
            or "statistics" in data
        )

    def test_download_matrices_endpoint(self, api_client, sample_monthly_report):
        """Test GET /api/reports/{id}/download-matrices/ returns Excel file."""
        url = reverse(
            "monthlyreport-download-matrices", kwargs={"pk": sample_monthly_report.id}
        )
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Verify it's an Excel file
        assert (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            in response.get("Content-Type", "")
            or "application/vnd.ms-excel" in response.get("Content-Type", "")
        )
