"""
Custom Exception Handler for Django REST Framework

This module provides a custom exception handler that transforms DRF's default
error responses into a consistent, structured format with error codes that can
be translated on the frontend.

The handler transforms this:
    {"email": ["A user with that email already exists."]}

Into this:
    {
        "success": false,
        "errors": [{
            "field": "email",
            "code": "EMAIL_ALREADY_EXISTS",
            "debug_message": "A user with that email already exists."
        }]
    }
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status as http_status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns structured error responses with error codes.
    
    This handler wraps Django REST Framework's default exception handler and transforms
    the response into a consistent format that includes:
    - A 'success' flag (always False for errors)
    - An 'errors' array with structured error objects
    
    Each error object contains:
    - field: The field name that caused the error (None for non-field errors)
    - code: Machine-readable error code (e.g., EMAIL_ALREADY_EXISTS)
    - debug_message: Human-readable message for debugging (not for display to users)
    
    Args:
        exc: The exception instance raised
        context: Dict with 'view' and 'request' keys
    
    Returns:
        Response: Structured error response, or None if not a DRF exception
    
    Example Response:
        {
            "success": false,
            "errors": [
                {
                    "field": "email",
                    "code": "EMAIL_ALREADY_EXISTS",
                    "debug_message": "A user with that email already exists."
                },
                {
                    "field": "password",
                    "code": "PASSWORD_TOO_SHORT",
                    "debug_message": "Password must be at least 8 characters."
                }
            ]
        }
    """
    # Call DRF's default exception handler first to get the standard error response
    response = exception_handler(exc, context)
    
    # If DRF didn't handle it, return None (let Django handle it)
    if response is None:
        return None
    
    # Log the exception for debugging
    view = context.get('view', None)
    request = context.get('request', None)
    
    # Add Sentry breadcrumbs for better error context
    try:
        from .sentry_config import add_breadcrumb, set_extra_context
        add_breadcrumb(
            message=f"API Exception: {exc.__class__.__name__}",
            category="api_error",
            level="error",
            data={
                'view': view.__class__.__name__ if view else 'Unknown',
                'status_code': response.status_code,
                'user_id': request.user.id if request and request.user.is_authenticated else None,
                'path': request.path if request else None,
                'method': request.method if request else None,
            }
        )
        set_extra_context(
            exception_type=exc.__class__.__name__,
            view_name=view.__class__.__name__ if view else None,
            status_code=response.status_code,
            request_path=request.path if request else None,
            request_method=request.method if request else None,
        )
    except ImportError:
        # Sentry not configured, continue with regular logging
        pass
    
    # Enhanced logging with request ID
    request_id = getattr(request, 'request_id', None) if request else None
    logger.warning(
        f"API Exception: {exc.__class__.__name__} in {view.__class__.__name__ if view else 'Unknown'} "
        f"- Status: {response.status_code} - User: {request.user if request else 'Anonymous'}",
        exc_info=True,
        extra={
            'exception_type': exc.__class__.__name__,
            'view': view.__class__.__name__ if view else None,
            'status_code': response.status_code,
            'user': str(request.user) if request else None,
            'request_id': request_id,
            'path': request.path if request else None,
            'method': request.method if request else None,
        }
    )
    
    # Build our custom response structure
    custom_response = {
        'success': False,
        'errors': []
    }
    
    # Handle different response data formats
    if isinstance(response.data, dict):
        # Standard field validation errors: {"field": ["error1", "error2"], ...}
        for field_name, field_errors in response.data.items():
            # Normalize field_errors to always be a list
            if not isinstance(field_errors, list):
                field_errors = [field_errors]
            
            # Process each error for this field
            for error in field_errors:
                error_dict = _build_error_dict(field_name, error)
                custom_response['errors'].append(error_dict)
    
    elif isinstance(response.data, list):
        # Non-field errors returned as a list: ["error1", "error2"]
        for error in response.data:
            error_dict = _build_error_dict(None, error)
            custom_response['errors'].append(error_dict)
    
    else:
        # Fallback for unexpected formats (string, etc.)
        error_dict = _build_error_dict(None, str(response.data))
        custom_response['errors'].append(error_dict)
    
    # If no errors were extracted, create a generic error
    if not custom_response['errors']:
        custom_response['errors'].append({
            'field': None,
            'code': _get_code_from_status(response.status_code),
            'debug_message': _get_default_message_from_status(response.status_code)
        })
    
    # Return the custom response with the same status code
    return Response(custom_response, status=response.status_code)


def _build_error_dict(field_name, error):
    """
    Build a standardized error dictionary from a field name and error.
    
    Args:
        field_name: The name of the field (or None for non-field errors)
        error: The error object (string, ErrorDetail, or dict)
    
    Returns:
        dict: Standardized error dictionary with field, code, and debug_message
    """
    error_dict = {}
    
    # Normalize field name (convert 'non_field_errors' to None)
    if field_name == 'non_field_errors' or field_name == 'detail':
        error_dict['field'] = None
    else:
        error_dict['field'] = field_name
    
    # Extract error code and message
    # DRF's ErrorDetail objects have a 'code' attribute
    if hasattr(error, 'code') and error.code:
        # Error has a code - use it!
        error_dict['code'] = str(error.code).upper()
        error_dict['debug_message'] = str(error)
    else:
        # No code - try to infer from message or use generic code
        error_message = str(error)
        error_dict['code'] = _infer_code_from_message(error_message, field_name)
        error_dict['debug_message'] = error_message
    
    return error_dict


def _infer_code_from_message(message, field_name=None):
    """
    Attempt to infer an error code from the error message.
    
    This is a fallback for cases where serializers don't explicitly provide error codes.
    
    Args:
        message: The error message string
        field_name: The field name (for context)
    
    Returns:
        str: Inferred error code
    """
    message_lower = message.lower()
    
    # Common patterns to match
    if 'required' in message_lower or 'blank' in message_lower:
        return 'FIELD_REQUIRED'
    
    if 'already exists' in message_lower or 'duplicate' in message_lower:
        if field_name == 'email':
            return 'EMAIL_ALREADY_EXISTS'
        elif field_name == 'username':
            return 'USERNAME_ALREADY_EXISTS'
        return 'DUPLICATE_ENTRY'
    
    if 'invalid' in message_lower:
        if field_name == 'email':
            return 'EMAIL_INVALID'
        if field_name == 'password':
            return 'PASSWORD_INVALID'
        return 'FIELD_INVALID'
    
    if 'password' in message_lower:
        if 'short' in message_lower or 'least' in message_lower:
            return 'PASSWORD_TOO_SHORT'
        if 'match' in message_lower:
            return 'PASSWORD_MISMATCH'
        return 'PASSWORD_INVALID'
    
    if 'not found' in message_lower or 'does not exist' in message_lower:
        if 'property' in message_lower:
            return 'PROPERTY_NOT_FOUND'
        if 'user' in message_lower:
            return 'USER_NOT_FOUND'
        return 'NOT_FOUND'
    
    if 'negative' in message_lower:
        return 'VALUE_MUST_BE_POSITIVE'
    
    if 'positive' in message_lower:
        return 'VALUE_MUST_BE_POSITIVE'
    
    # Default fallback based on field name
    if field_name:
        return f'{field_name.upper()}_INVALID'
    
    return 'FIELD_INVALID'


def _get_code_from_status(status_code):
    """
    Get a generic error code based on HTTP status code.
    
    Args:
        status_code: HTTP status code
    
    Returns:
        str: Generic error code
    """
    if status_code == http_status.HTTP_400_BAD_REQUEST:
        return 'VALIDATION_ERROR'
    elif status_code == http_status.HTTP_401_UNAUTHORIZED:
        return 'UNAUTHORIZED'
    elif status_code == http_status.HTTP_403_FORBIDDEN:
        return 'FORBIDDEN'
    elif status_code == http_status.HTTP_404_NOT_FOUND:
        return 'NOT_FOUND'
    elif status_code == http_status.HTTP_429_TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_EXCEEDED'
    elif status_code >= 500:
        return 'SERVER_ERROR'
    else:
        return 'ERROR'


def _get_default_message_from_status(status_code):
    """
    Get a default error message based on HTTP status code.
    
    Args:
        status_code: HTTP status code
    
    Returns:
        str: Default error message
    """
    messages = {
        http_status.HTTP_400_BAD_REQUEST: 'Invalid request data',
        http_status.HTTP_401_UNAUTHORIZED: 'Authentication required',
        http_status.HTTP_403_FORBIDDEN: 'Permission denied',
        http_status.HTTP_404_NOT_FOUND: 'Resource not found',
        http_status.HTTP_429_TOO_MANY_REQUESTS: 'Too many requests',
        http_status.HTTP_500_INTERNAL_SERVER_ERROR: 'Internal server error',
        http_status.HTTP_503_SERVICE_UNAVAILABLE: 'Service unavailable',
    }
    return messages.get(status_code, 'An error occurred')


# Export for easy imports
__all__ = ['custom_exception_handler']

