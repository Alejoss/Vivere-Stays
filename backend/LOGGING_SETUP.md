# Logging System Setup Guide

This document explains how to set up and configure the comprehensive logging system implemented in the Vivere Stays Django backend.

## Overview

The logging system provides:
- **Structured JSON logging** for production environments
- **Console logging** for Docker environments
- **Sentry integration** for error tracking and performance monitoring
- **Request/response logging** with correlation IDs
- **Business context logging** for debugging
- **Performance monitoring** for slow requests

## Environment Variables

Add these environment variables to your `.env` file:

```bash
# Sentry Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=development|staging|production
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_RELEASE=your-release-version

# Logging Configuration (optional)
LOG_LEVEL=DEBUG|INFO|WARNING|ERROR|CRITICAL
```

## Installation

1. **Install Dependencies**
   ```bash
   docker-compose exec vivre_backend pip install -r requirements.txt
   ```

2. **Configure Sentry**
   - Create a Sentry project at https://sentry.io
   - Copy your DSN to the `SENTRY_DSN` environment variable
   - Set the appropriate environment (`SENTRY_ENVIRONMENT`)

3. **Restart the Application**
   ```bash
   docker-compose restart vivre_backend
   ```

## Logging Features

### 1. Structured Logging

All logs are structured with consistent fields:
- `timestamp`: ISO 8601 timestamp
- `level`: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- `logger`: Logger name (e.g., `vivere_stays.dynamic_pricing`)
- `message`: Human-readable log message
- `operation`: Business operation being performed
- `request_id`: Unique identifier for request correlation
- `user_id`: User ID (if authenticated)
- `property_id`: Property ID (if applicable)
- Additional context fields as needed

### 2. Request/Response Logging

Every HTTP request is automatically logged with:
- Method, URL, and query parameters
- User context and authentication status
- Response status code and timing
- Request correlation ID for tracing

### 3. Business Operation Logging

Key business operations are logged with context:
- User authentication and authorization
- Property management operations
- Payment processing (Stripe)
- External API calls
- Database operations

### 4. Error Tracking

Errors are automatically captured by Sentry with:
- Full stack traces
- Request context
- User information
- Business context (property_id, operation, etc.)
- Breadcrumbs for debugging

## Log Levels

- **DEBUG**: Detailed flow information, variable values
- **INFO**: Business operations, successful operations
- **WARNING**: Recoverable issues, rate limiting
- **ERROR**: Failed operations, exceptions
- **CRITICAL**: System failures, security issues

## Usage Examples

### Basic Logging

```python
from vivere_stays.logging_utils import get_logger, log_operation, LogLevel, LoggerNames

logger = get_logger(LoggerNames.DYNAMIC_PRICING)

# Simple logging
logger.info("User created property successfully")

# Structured logging with context
log_operation(
    logger, LogLevel.INFO,
    "Property created successfully",
    "property_created",
    request, request.user,
    property_id=property.id,
    property_name=property.name
)
```

### API Call Logging

```python
from vivere_stays.logging_utils import log_api_call

log_api_call(
    logger, LogLevel.INFO,
    "Calling external competitor API",
    "competitor_api",
    "https://api.example.com/competitors",
    "POST",
    status_code=200,
    response_time=1.5,
    request=request,
    user=request.user
)
```

### Database Operation Logging

```python
from vivere_stays.logging_utils import log_database_operation

log_database_operation(
    logger, "CREATE", "Property",
    property.id, request, request.user,
    property_name=property.name
)
```

### Business Event Logging

```python
from vivere_stays.logging_utils import log_business_event

log_business_event(
    logger, "user_registration",
    "New user registered successfully",
    request, user,
    plan_type="premium",
    source="website"
)
```

## Monitoring and Debugging

### 1. Docker Logs

View logs in real-time:
```bash
docker-compose logs -f vivre_backend
```

### 2. Sentry Dashboard

- View errors and performance data at https://sentry.io
- Set up alerts for critical errors
- Monitor performance metrics

### 3. Log Analysis

In production, logs are structured JSON that can be:
- Parsed by log aggregation tools (ELK, Splunk, etc.)
- Filtered by request_id for request tracing
- Analyzed for performance bottlenecks

## Configuration

### Development Environment

- Console logging with human-readable format
- DEBUG level logging enabled
- Sentry sampling rate: 100%

### Production Environment

- JSON structured logging
- INFO level logging (WARNING for external services)
- Sentry sampling rate: 10% (configurable)
- Performance monitoring enabled

## Troubleshooting

### Common Issues

1. **Sentry not receiving events**
   - Check `SENTRY_DSN` is correctly set
   - Verify network connectivity
   - Check Sentry project settings

2. **Too many logs in development**
   - Adjust `LOG_LEVEL` environment variable
   - Modify logging configuration in `logging_config.py`

3. **Missing request context**
   - Ensure middleware is properly configured
   - Check that `RequestLoggingMiddleware` is in `MIDDLEWARE` list

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
docker-compose restart vivre_backend
```

## Migration from Print Statements

The logging system replaces all `print()` statements with structured logging:

- **Before**: `print(f"[DEBUG] User {user.username} created property")`
- **After**: `log_operation(logger, LogLevel.DEBUG, f"User created property", "property_created", request, user, username=user.username)`

This provides:
- Consistent log format
- Request correlation
- User context
- Structured data for analysis

## Performance Impact

The logging system is designed for minimal performance impact:
- Asynchronous logging where possible
- Configurable log levels
- Sentry sampling rates
- Efficient JSON serialization

## Security Considerations

- Sensitive data is not logged by default
- User passwords and tokens are excluded
- Credit card information is never logged
- PII logging can be disabled in production

## Support

For issues with the logging system:
1. Check the logs for error messages
2. Verify environment variables
3. Test Sentry connectivity
4. Review logging configuration
