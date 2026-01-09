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

# Enable management of external schema tables for tests
# This allows DpPriceChangeHistory and other external schema models to be created in test database
MANAGE_EXTERNAL_SCHEMA_TABLES = True
