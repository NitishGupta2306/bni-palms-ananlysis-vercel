"""
URL configuration for BNI Analytics API.
"""

from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health_check(request):
    """Simple health check endpoint"""
    return JsonResponse({"status": "ok", "message": "BNI Analytics API is running"})


def test_chapters(request):
    """Minimal test endpoint for chapters"""
    from chapters.models import Chapter

    chapters = list(Chapter.objects.values("id", "name", "location"))
    return JsonResponse({"chapters": chapters, "count": len(chapters)})


urlpatterns = [
    path("", health_check, name="health_check"),
    path("api/test-chapters/", test_chapters, name="test_chapters"),
    # API documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # Application URLs
    path("api/", include("bni.urls")),
]
