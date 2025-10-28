"""
Test-specific settings for Django tests.
This file contains settings optimized for testing.
"""

from .settings import *

# Override database for tests
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Disable migrations during tests for speed
class DisableMigrations:
    def __contains__(self, item):
        return True
    def __getitem__(self, item):
        return None

MIGRATION_MODULES = DisableMigrations()

# Speed up password hashing for tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Disable logging during tests
LOGGING_CONFIG = None

# Use faster cache backend for tests
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# Disable email sending during tests
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Enable DEBUG for tests to make external schema models managed
# This allows them to work with SQLite test database
DEBUG = True

# Note: External schema models (PriceHistory, UnifiedReservations, etc.) 
# are handled by using @skipIf decorators in tests since they use PostgreSQL schemas
# that don't work with SQLite test database. The tests will be skipped in production
# and run in development where the models are managed=True.
