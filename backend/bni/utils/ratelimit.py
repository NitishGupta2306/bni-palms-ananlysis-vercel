"""
Rate limiting utilities and decorators for BNI PALMS API.

This module provides:
- Custom 429 error handler for rate-limited requests
- Decorator for applying rate limits to DRF ViewSet actions
"""

from django.http import JsonResponse
from functools import wraps
from django_ratelimit.decorators import ratelimit
from django_ratelimit.exceptions import Ratelimited
import logging

logger = logging.getLogger(__name__)


def ratelimited_error(request, exception):
    """
    Custom handler for rate-limited requests.

    Returns a JSON response with 429 status code and retry-after information.

    Args:
        request: HTTP request object
        exception: Ratelimited exception

    Returns:
        JsonResponse with 429 status code
    """
    logger.warning(
        f"Rate limit exceeded for {request.method} {request.path} from IP {request.META.get('REMOTE_ADDR')}"
    )

    return JsonResponse(
        {
            "error": "Too Many Requests",
            "message": "Rate limit exceeded. Please try again later.",
            "status_code": 429,
        },
        status=429,
    )


def ratelimit_action(key='ip', rate='5/m', method='POST', block=True):
    """
    Decorator for applying rate limits to DRF ViewSet action methods.

    This is a wrapper around django_ratelimit that works with DRF ViewSet actions.

    Args:
        key: Key to use for rate limiting ('ip', 'user', or callable)
        rate: Rate limit in format 'count/period' (e.g., '5/m', '10/h', '100/d')
        method: HTTP method(s) to rate limit
        block: Whether to block requests that exceed the limit (True) or just track (False)

    Returns:
        Decorated function

    Example:
        @action(detail=False, methods=['post'])
        @ratelimit_action(key='ip', rate='5/m', method='POST')
        def authenticate(self, request):
            # Authentication logic here
            pass
    """
    def decorator(func):
        @wraps(func)
        @ratelimit(key=key, rate=rate, method=method, block=block)
        def wrapper(self, request, *args, **kwargs):
            # Check if request was rate limited
            if getattr(request, 'limited', False):
                logger.warning(
                    f"Rate limit exceeded for {request.method} {request.path} "
                    f"from IP {request.META.get('REMOTE_ADDR')}"
                )
                return JsonResponse(
                    {
                        "error": "Too Many Requests",
                        "message": "Rate limit exceeded. Please try again later.",
                        "status_code": 429,
                    },
                    status=429,
                )
            return func(self, request, *args, **kwargs)
        return wrapper
    return decorator
