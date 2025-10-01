"""
Vercel serverless function handler for Django
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Vercel expects 'app' variable
app = get_wsgi_application()
