"""
WSGI config for vivere_stays project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vivere_stays.settings')

application = get_wsgi_application() 