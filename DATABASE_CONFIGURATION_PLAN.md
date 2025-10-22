# Database Configuration Setup Plan

## Overview
Implement environment-based database configuration that automatically detects and connects to the appropriate database (local Docker or remote production) based on environment variables.

## Three Usage Modes

### Mode 1: Local Development (Default)
- Uses Docker PostgreSQL container
- Best for day-to-day development
- No remote database needed

### Mode 2: Test Production Database Locally
- Uses remote production database
- Django runs locally/in Docker
- PostgreSQL container NOT started
- Tests production database before deployment

### Mode 3: Production Deployment
- Uses remote production database
- Django runs in production environment
- PostgreSQL container NOT started

## Implementation Steps

### 1. Update Django Settings (`backend/vivere_stays/settings.py`)

Add environment-based database configuration logic:

```python
# Database Configuration
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
                'options': '-c search_path=public,booking,core',
                'sslmode': config('PROD_POSTGRES_SSLMODE', default='require'),
            },
            'CONN_MAX_AGE': 60,  # Connection pooling
        }
    }
else:
    # Use local Docker PostgreSQL (existing configuration)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('POSTGRES_DB', default='vivere_stays'),
            'USER': config('POSTGRES_USER', default='vivere_user'),
            'PASSWORD': config('POSTGRES_PASSWORD', default='vivere_password'),
            'HOST': config('POSTGRES_HOST', default='postgres'),
            'PORT': config('POSTGRES_PORT', default='5432'),
            'OPTIONS': {
                'options': '-c search_path=public,booking,core'
            },
        }
    }
```

### 2. Create Environment Configuration Files

#### File: `.env.local` (Mode 1: Local Development)

This is for daily development work using Docker PostgreSQL.

```bash
# Environment Mode
ENVIRONMENT=development
USE_REMOTE_DB=False

# Django Settings
DEBUG=True
SECRET_KEY=your-secret-key-here-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Local Docker Database Credentials
POSTGRES_DB=vivere_stays
POSTGRES_USER=vivere_user
POSTGRES_PASSWORD=vivere_password
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173

# Static Files
STATIC_URL=/static/
MEDIA_URL=/media/

# Email Configuration (Development)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=analytics@viverestays.com

# JWT Settings
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=15
AUTH_COOKIE_SECURE=False

# POSTMARK Email
POSTMARK_TOKEN=your-postmark-token-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe (Test Keys)
STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# External APIs
COMPETITOR_API_BASE_URL=https://hotel-competitor-service-e3keqismia-ew.a.run.app/
HOTEL_COMPETITOR_SERVICE_TOKEN=your-competitor-service-token

# CSRF Trusted Origins
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Frontend URL
FRONTEND_URL=http://localhost:8080

# Ngrok (optional)
NGROK_AUTHTOKEN=your-ngrok-token
```

#### File: `.env.production.test` (Mode 2: Test Production Database Locally)

This is for testing the production database connection from your local machine BEFORE deploying.

```bash
# Environment Mode - IMPORTANT: USE_REMOTE_DB=True tells Django to use production DB
ENVIRONMENT=development
USE_REMOTE_DB=True

# Django Settings
DEBUG=True
SECRET_KEY=your-secret-key-here-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Production Database Credentials - REPLACE WITH YOUR ACTUAL PRODUCTION DB
PROD_POSTGRES_DB=vivere_stays_production
PROD_POSTGRES_USER=prod_user
PROD_POSTGRES_PASSWORD=your_strong_production_password
PROD_POSTGRES_HOST=your-db-host.aws.com
PROD_POSTGRES_PORT=5432
PROD_POSTGRES_SSLMODE=require

# Local Docker Database (NOT USED when USE_REMOTE_DB=True, but keep for reference)
POSTGRES_DB=vivere_stays
POSTGRES_USER=vivere_user
POSTGRES_PASSWORD=vivere_password
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# CORS Settings (keep localhost for testing)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080

# Static Files
STATIC_URL=/static/
MEDIA_URL=/media/

# Email Configuration (Production)
EMAIL_HOST=smtp.your-email-provider.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-production-email@yourdomain.com
EMAIL_HOST_PASSWORD=your-production-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# JWT Settings
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=15
AUTH_COOKIE_SECURE=False

# POSTMARK Email (Production)
POSTMARK_TOKEN=your-production-postmark-token

# Google OAuth (Production)
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret

# Stripe (Live Keys)
STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# External APIs
COMPETITOR_API_BASE_URL=https://hotel-competitor-service-e3keqismia-ew.a.run.app/
HOTEL_COMPETITOR_SERVICE_TOKEN=your-production-competitor-service-token

# CSRF Trusted Origins (keep localhost for testing)
CSRF_TRUSTED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Frontend URL
FRONTEND_URL=http://localhost:8080
```

#### File: `.env.production` (Mode 3: Production Deployment)

This is for actual production deployment on your server.

```bash
# Environment Mode
ENVIRONMENT=production
USE_REMOTE_DB=True

# Django Settings
DEBUG=False
SECRET_KEY=your-production-secret-key-change-this
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,your-server-ip

# Production Database Credentials
PROD_POSTGRES_DB=vivere_stays_production
PROD_POSTGRES_USER=prod_user
PROD_POSTGRES_PASSWORD=your_strong_production_password
PROD_POSTGRES_HOST=your-db-host.aws.com
PROD_POSTGRES_PORT=5432
PROD_POSTGRES_SSLMODE=require

# CORS Settings
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Static Files
STATIC_URL=/static/
MEDIA_URL=/media/

# Email Configuration (Production)
EMAIL_HOST=smtp.your-email-provider.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-production-email@yourdomain.com
EMAIL_HOST_PASSWORD=your-production-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# JWT Settings
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=15
AUTH_COOKIE_SECURE=True

# POSTMARK Email (Production)
POSTMARK_TOKEN=your-production-postmark-token

# Google OAuth (Production)
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret

# Stripe (Live Keys)
STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# External APIs
COMPETITOR_API_BASE_URL=https://hotel-competitor-service-e3keqismia-ew.a.run.app/
HOTEL_COMPETITOR_SERVICE_TOKEN=your-production-competitor-service-token

# CSRF Trusted Origins
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Frontend URL
FRONTEND_URL=https://yourdomain.com
```

### 3. Update Docker Compose (`docker-compose.yml`)

Make postgres service optional so it doesn't start when using remote database:

```yaml
services:
  vivere_backend:
    build: ./backend
    container_name: vivere_backend
    volumes:
      - ./backend:/app
      - static_volume:/app/staticfiles
      - media_volume:/app/media
    command: python manage.py runserver 0.0.0.0:8000
    env_file:
      - .env
    ports:
      - "8000:8000"
    depends_on:
      - postgres
    profiles:
      - local
      - ""
    networks:
      - vivere_network

  postgres:
    image: postgres:16-bookworm
    container_name: vivere_postgres
    env_file:
      - .env
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    profiles:
      - local
      - ""
    networks:
      - vivere_network
```

### 4. Create Database Connection Validator

File: `backend/vivere_stays/management/commands/test_db_connection.py`

A management command to test database connectivity and report configuration:

```python
from django.core.management.base import BaseCommand
from django.db import connections
from django.conf import settings
import sys

class Command(BaseCommand):
    help = 'Test database connection and display configuration'

    def handle(self, *args, **options):
        db_config = settings.DATABASES['default']
        
        self.stdout.write(self.style.SUCCESS('=== Database Configuration ==='))
        self.stdout.write(f"Environment: {settings.ENVIRONMENT}")
        self.stdout.write(f"Host: {db_config['HOST']}")
        self.stdout.write(f"Port: {db_config['PORT']}")
        self.stdout.write(f"Database: {db_config['NAME']}")
        self.stdout.write(f"User: {db_config['USER']}")
        
        try:
            conn = connections['default']
            conn.ensure_connection()
            self.stdout.write(self.style.SUCCESS('✓ Database connection successful!'))
            
            with conn.cursor() as cursor:
                cursor.execute("SELECT schema_name FROM information_schema.schemata")
                schemas = [row[0] for row in cursor.fetchall()]
                self.stdout.write(f"Available schemas: {', '.join(schemas)}")
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Database connection failed: {str(e)}'))
            sys.exit(1)
```

### 5. Create Documentation

File: `DATABASE_SETUP.md`

Comprehensive guide explaining:
- How each mode works
- Step-by-step setup instructions
- Environment variable reference
- Troubleshooting guide
- Security best practices

## Usage Examples

### Local Development
```bash
# Copy local environment file
cp .env.local .env

# Start all services (including postgres)
docker-compose up -d

# Run migrations
docker-compose exec vivere_backend python manage.py migrate
```

### Test Production Database Locally
```bash
# Copy production test environment file
cp .env.production.test .env

# Update the PROD_POSTGRES_* values with your actual production DB credentials

# Start only backend (postgres won't start)
docker-compose up vivere_backend -d

# Test connection
docker-compose exec vivere_backend python manage.py test_db_connection

# Run migrations on production DB
docker-compose exec vivere_backend python manage.py migrate
```

### Production Deployment
```bash
# Copy production environment file
cp .env.production .env

# Update all production values

# Deploy (method depends on your hosting)
# Docker Swarm, Kubernetes, or direct deployment
```

## Key Benefits

1. **No Scripts Required**: Pure environment variable driven
2. **Flexible Testing**: Test production database before deployment
3. **Clear Separation**: Each mode has its own clear configuration
4. **Backward Compatible**: Existing local setup still works
5. **Fail-Safe**: Connection validator catches issues early

## Files Summary

### To Modify
- `backend/vivere_stays/settings.py` - Add database selection logic
- `docker-compose.yml` - Make postgres optional with profiles

### To Create
- `.env.local` - Local development template
- `.env.production.test` - Production database testing template
- `.env.production` - Production deployment template
- `backend/vivere_stays/management/commands/test_db_connection.py` - Connection validator
- `DATABASE_SETUP.md` - User documentation
