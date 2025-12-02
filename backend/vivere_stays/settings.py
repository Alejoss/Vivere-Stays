"""
Django settings for vivere_stays project.
"""

import os
from pathlib import Path
from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-this-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

# Database model management settings
# Set to True to let Django manage external schema tables (for local development)
# Set to False to use externally managed tables (for production/remote database)
MANAGE_EXTERNAL_SCHEMA_TABLES = config('MANAGE_EXTERNAL_SCHEMA_TABLES', default=False, cast=bool)

# Normalize and strip hosts to avoid whitespace issues from env
ALLOWED_HOSTS = [host.strip() for host in config('ALLOWED_HOSTS', default='localhost,127.0.0.1,0.0.0.0').split(',') if host.strip()]

# Application definition
INSTALLED_APPS = [
    # Django built-in apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',

    # Allauth (order matters!)
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',

    # Third-party REST/auth
    'rest_framework',
    'rest_framework.authtoken',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'corsheaders',
    'django_filters',
    'drf_spectacular',

    # Local apps
    'profiles',
    'dynamic_pricing',
    'booking',
    'analytics',
]

SITE_ID = 1

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'vivere_stays.middleware.RequestLoggingMiddleware',
    'vivere_stays.middleware.UserContextMiddleware',
    'vivere_stays.middleware.PerformanceLoggingMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Development tools (only in DEBUG mode)
# (debug_toolbar removed)

ROOT_URLCONF = 'vivere_stays.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(BASE_DIR, 'email_templates', 'templates'),
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'vivere_stays.wsgi.application'

# Database Configuration
# Environment-based database configuration
ENVIRONMENT = config('ENVIRONMENT', default='development')
USE_REMOTE_DB = config('USE_REMOTE_DB', default=False, cast=bool)

if ENVIRONMENT == 'production' or USE_REMOTE_DB:
    # Use remote production database
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('PROD_POSTGRES_DB'),
            'USER': config('PROD_POSTGRES_USER'),
            'PASSWORD': config('PROD_POSTGRES_PASSWORD'),
            'HOST': config('PROD_POSTGRES_HOST'),
            'PORT': config('PROD_POSTGRES_PORT', default='5432'),
            'OPTIONS': {
                'options': '-c search_path=public,dynamic,booking,core',
                'sslmode': config('PROD_POSTGRES_SSLMODE', default='require'),
            },
            'CONN_MAX_AGE': 60,  # Connection pooling for production
        }
    }
else:
    # Use local Docker PostgreSQL
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('POSTGRES_DB', default='vivere_stays'),
            'USER': config('POSTGRES_USER', default='vivere_user'),
            'PASSWORD': config('POSTGRES_PASSWORD', default='vivere_password'),
            'HOST': config('POSTGRES_HOST', default='postgres'),
            'PORT': config('POSTGRES_PORT', default='5432'),
            'OPTIONS': {
                'options': '-c search_path=public,dynamic,booking,core'
            },
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = config('STATIC_URL', default='/static/')
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# Media files
MEDIA_URL = config('MEDIA_URL', default='/media/')
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom user model - using default Django User model
# AUTH_USER_MODEL = 'users.User'

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'TEST_REQUEST_DEFAULT_FORMAT': 'json',
    # Custom exception handler for structured error responses with i18n support
    'EXCEPTION_HANDLER': 'vivere_stays.error_handler.custom_exception_handler',
}

# API Documentation settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'Vivere Stays API',
    'DESCRIPTION': 'API for Vivere Stays property management and booking system',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': '/api/',
}

# CORS settings
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173').split(',')
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:\d+$",
    r"^http://127.0.0.1:\d+$",
]
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in config('CSRF_TRUSTED_ORIGINS', default='http://localhost:8000,http://127.0.0.1:8000').split(',')]
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-language',
    'accept-language',
]
CORS_EXPOSE_HEADERS = [
    'content-type',
    'content-disposition',
]
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# JWT settings
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=config('JWT_ACCESS_TOKEN_LIFETIME', default=60, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=config('JWT_REFRESH_TOKEN_LIFETIME', default=15, cast=int)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    # Cookie settings
    'REFRESH_COOKIE': 'refresh_token',
    'AUTH_COOKIE_SECURE': config('AUTH_COOKIE_SECURE', default=False, cast=bool),
    'AUTH_COOKIE_SAMESITE': 'Lax',
    'AUTH_COOKIE_PATH': '/',
}

# Test Database Configuration
# Django automatically creates a test database with the same configuration
# but with a '_test' suffix. No special configuration needed for standard testing.

# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')

# Redis settings (commented out - not needed for current setup)
# REDIS_URL = config('REDIS_URL', default='redis://redis:6379/0')

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'APP': {
            'client_id': config('GOOGLE_CLIENT_ID', default=''),
            'secret': config('GOOGLE_CLIENT_SECRET', default=''),
            'key': ''
        }
    }
}

# Postmark Email Configuration
POSTMARK_TOKEN = config('POSTMARK_TOKEN', default='')
POSTMARK_TEST_MODE = config('POSTMARK_TEST_MODE', default=False, cast=bool)

# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='analytics@viverestays.com')

# Email verification settings
EMAIL_VERIFICATION_EXPIRY_MINUTES = 10
EMAIL_VERIFICATION_CODE_LENGTH = 5

# Redirect all emails to a single address for testing/debugging
# Set to None or empty string to send emails to actual recipients
EMAIL_REDIRECT_TO = config('EMAIL_REDIRECT_TO', default='info@viverestays.es')

# Frontend URL for Stripe redirects and company settings
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:8080')

# Company-wide settings for emails
COMPANY_WEBSITE = FRONTEND_URL
COMPANY_UNSUBSCRIBE_URL = f'{COMPANY_WEBSITE}/unsubscribe'

STRIPE_PUBLIC_KEY = os.getenv("STRIPE_PUBLIC_KEY")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")


# External Competitor API Settings
COMPETITOR_API_BASE_URL = config('COMPETITOR_API_BASE_URL', default='https://hotel-competitor-service-e3keqismia-ew.a.run.app/')

# Hotel Competitor Service Settings
HOTEL_COMPETITOR_SERVICE_TOKEN = config('HOTEL_COMPETITOR_SERVICE_TOKEN', default='na')

# Database router removed - using custom migration approach instead

# Admin site configuration
ADMIN_SITE_HEADER = "Vivere Administration"
ADMIN_SITE_TITLE = "Vivere Administration"
ADMIN_INDEX_TITLE = "Vivere Administration"

# Logging Configuration
from .logging_config import configure_logging
LOGGING = configure_logging()

# Sentry Configuration
from .sentry_config import init_sentry
init_sentry()