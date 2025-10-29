"""
Sentry configuration for error tracking and performance monitoring.

This module initializes Sentry SDK with Django integration, configures
environment detection, and sets up performance monitoring with proper
sampling rates to avoid double reporting.
"""

import os
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from decouple import config
from django.conf import settings


def init_sentry():
    """
    Initialize Sentry SDK with Django integration and performance monitoring.
    This should be called from settings.py after Django is configured.
    """
    sentry_dsn = config('SENTRY_DSN', default='')
    environment = config('SENTRY_ENVIRONMENT', default='development')
    traces_sample_rate = config('SENTRY_TRACES_SAMPLE_RATE', default=1.0, cast=float)
    
    # Don't initialize if no DSN is provided
    if not sentry_dsn:
        print("Info: SENTRY_DSN not configured. Sentry error tracking disabled.")
        return
    
    # Configure logging integration to avoid double reporting
    logging_integration = LoggingIntegration(
        level=None,  # Capture all logs
        event_level=None,  # Don't send logs as events
    )
    
    # Initialize Sentry with error handling
    try:
        sentry_sdk.init(
        dsn=sentry_dsn,
        environment=environment,
        traces_sample_rate=traces_sample_rate,
        integrations=[
            DjangoIntegration(
                transaction_style='url',
                middleware_spans=True,
                signals_spans=True,
                cache_spans=True,
            ),
            logging_integration,
            RedisIntegration(),
        ],
        # Performance monitoring
        enable_tracing=True,
        
        # Error filtering
        before_send=before_send_filter,
        before_send_transaction=before_send_transaction_filter,
        
        # Release tracking
        release=os.environ.get('SENTRY_RELEASE'),
        
        # Additional options
        attach_stacktrace=True,
        send_default_pii=False,  # Don't send personally identifiable information
        max_breadcrumbs=50,
        
        # Custom tags
        default_integrations=True,
    )
        
        # Set up custom tags
        sentry_sdk.set_tag("service", "vivere-backend")
        sentry_sdk.set_tag("component", "django")
        
        # Set user context if available
        _setup_user_context()
        
        print(f"Info: Sentry initialized successfully for environment: {environment}")
        
    except Exception as e:
        print(f"Warning: Failed to initialize Sentry: {e}")
        print("Info: App will continue without error tracking.")


def before_send_filter(event, hint):
    """
    Filter events before sending to Sentry to avoid noise.
    
    Args:
        event: Sentry event data
        hint: Event hint containing original exception
        
    Returns:
        Event data or None to drop the event
    """
    # Don't send 404 errors for static files
    if event.get('exception'):
        exc_type = event['exception'].get('values', [{}])[0].get('type', '')
        if exc_type == 'Http404' and '/static/' in event.get('request', {}).get('url', ''):
            return None
    
    # Don't send certain Django exceptions that are expected
    if event.get('exception'):
        exc_type = event['exception'].get('values', [{}])[0].get('type', '')
        if exc_type in ['DisallowedHost', 'SuspiciousOperation']:
            return None
    
    # Add custom context
    event.setdefault('tags', {})
    event['tags']['filtered'] = False
    
    return event


def before_send_transaction_filter(event, hint):
    """
    Filter transaction events before sending to Sentry.
    
    Args:
        event: Sentry transaction data
        hint: Transaction hint
        
    Returns:
        Transaction data or None to drop the event
    """
    # Don't send health check transactions
    if event.get('transaction') in ['/health/', '/ping/', '/status/']:
        return None
    
    # Don't send static file requests
    if event.get('transaction', '').startswith('/static/'):
        return None
    
    return event


def _setup_user_context():
    """
    Set up user context for Sentry if available.
    This is called during initialization.
    """
    # This will be called later when we have request context
    pass


def set_user_context(user):
    """
    Set user context for Sentry error tracking.
    
    Args:
        user: Django User instance or None
    """
    if not user or not user.is_authenticated:
        sentry_sdk.set_user(None)
        return
    
    sentry_sdk.set_user({
        'id': user.id,
        'username': user.username,
        'email': getattr(user, 'email', None),
    })


def add_breadcrumb(message, category='default', level='info', data=None):
    """
    Add a breadcrumb to Sentry for better error context.
    
    Args:
        message: Breadcrumb message
        category: Breadcrumb category
        level: Breadcrumb level (debug, info, warning, error, fatal)
        data: Additional data dictionary
    """
    sentry_sdk.add_breadcrumb(
        message=message,
        category=category,
        level=level,
        data=data or {}
    )


def capture_exception(exception, **kwargs):
    """
    Capture an exception with additional context.
    
    Args:
        exception: Exception instance
        **kwargs: Additional context data
    """
    with sentry_sdk.push_scope() as scope:
        for key, value in kwargs.items():
            scope.set_extra(key, value)
        sentry_sdk.capture_exception(exception)


def capture_message(message, level='info', **kwargs):
    """
    Capture a message with additional context.
    
    Args:
        message: Message to capture
        level: Message level (debug, info, warning, error, fatal)
        **kwargs: Additional context data
    """
    with sentry_sdk.push_scope() as scope:
        for key, value in kwargs.items():
            scope.set_extra(key, value)
        sentry_sdk.capture_message(message, level=level)


def set_extra_context(**kwargs):
    """
    Set extra context for all subsequent events.
    
    Args:
        **kwargs: Context data to set
    """
    for key, value in kwargs.items():
        sentry_sdk.set_extra(key, value)


def set_tag_context(**kwargs):
    """
    Set tag context for all subsequent events.
    
    Args:
        **kwargs: Tag data to set
    """
    for key, value in kwargs.items():
        sentry_sdk.set_tag(key, value)


def clear_context():
    """
    Clear all Sentry context.
    """
    sentry_sdk.clear_breadcrumbs()
    sentry_sdk.set_user(None)
    sentry_sdk.set_extra(None)
    sentry_sdk.set_tag(None)


# Sentry configuration for different environments
SENTRY_CONFIGS = {
    'development': {
        'traces_sample_rate': 1.0,
        'send_default_pii': True,  # Allow PII in development
    },
    'staging': {
        'traces_sample_rate': 0.5,
        'send_default_pii': False,
    },
    'production': {
        'traces_sample_rate': 0.1,  # Lower sampling in production
        'send_default_pii': False,
    }
}


def get_sentry_config(environment='development'):
    """
    Get Sentry configuration for the specified environment.
    
    Args:
        environment: Environment name
        
    Returns:
        dict: Sentry configuration
    """
    return SENTRY_CONFIGS.get(environment, SENTRY_CONFIGS['development'])
