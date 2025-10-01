"""
URL configuration for BNI Analytics API.
"""
from django.urls import path, include
from django.http import JsonResponse

def health_check(request):
    """Simple health check endpoint"""
    return JsonResponse({
        'status': 'ok',
        'message': 'BNI Analytics API is running'
    })

urlpatterns = [
    path("", health_check, name="health_check"),
    path("api/", include("bni.urls")),
]
