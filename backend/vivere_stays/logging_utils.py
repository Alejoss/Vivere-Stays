"""
Logging utility functions for structured logging with business context.

This module provides helper functions for consistent logging across the application
with proper context, performance tracking, and business operation logging.
"""

import logging
import time
import functools
import uuid
from typing import Optional, Dict, Any, Union
from django.http import HttpRequest
from django.contrib.auth.models import User
from .logging_config import LoggerNames, LogLevel


def get_logger(name: str = LoggerNames.VIVERE_STAYS) -> logging.Logger:
    """
    Get a configured logger with the specified name.
    
    Args:
        name: Logger name (use LoggerNames constants)
        
    Returns:
        logging.Logger: Configured logger instance
    """
    return logging.getLogger(name)


def get_request_id(request: Optional[HttpRequest] = None) -> str:
    """
    Get or generate a request ID for log correlation.
    
    Args:
        request: Django request object
        
    Returns:
        str: Request ID for correlation
    """
    if request and hasattr(request, 'request_id'):
        return request.request_id
    return str(uuid.uuid4())[:8]


def get_user_context(user: Optional[User]) -> Dict[str, Any]:
    """
    Extract user context for logging.
    
    Args:
        user: Django User instance or None
        
    Returns:
        dict: User context for logging
    """
    if not user or not user.is_authenticated:
        return {'user_id': None, 'username': 'anonymous'}
    
    context = {
        'user_id': user.id,
        'username': user.username,
        'is_authenticated': True,
    }
    
    # Add email if available
    if hasattr(user, 'email') and user.email:
        context['email'] = user.email
    
    # Add profile context if available
    if hasattr(user, 'profile'):
        try:
            profile = user.profile
            context['profile_id'] = getattr(profile, 'id', None)
        except Exception:
            pass  # Profile might not exist
    
    return context


def log_operation(
    logger: logging.Logger,
    level: int,
    message: str,
    operation: str,
    request: Optional[HttpRequest] = None,
    user: Optional[User] = None,
    **kwargs
) -> None:
    """
    Log a business operation with structured context.
    
    Args:
        logger: Logger instance
        level: Log level (LogLevel constants)
        message: Log message
        operation: Business operation name
        request: Django request object
        user: User instance
        **kwargs: Additional context data
    """
    context = {
        'operation': operation,
        'request_id': get_request_id(request),
        **get_user_context(user),
        **kwargs
    }
    
    logger.log(level, message, extra=context)


def log_api_call(
    logger: logging.Logger,
    level: int,
    message: str,
    api_name: str,
    endpoint: str,
    method: str = 'GET',
    status_code: Optional[int] = None,
    response_time: Optional[float] = None,
    request: Optional[HttpRequest] = None,
    user: Optional[User] = None,
    **kwargs
) -> None:
    """
    Log an external API call with structured context.
    
    Args:
        logger: Logger instance
        level: Log level
        message: Log message
        api_name: Name of the external API
        endpoint: API endpoint URL
        method: HTTP method
        status_code: Response status code
        response_time: Response time in seconds
        request: Django request object
        user: User instance
        **kwargs: Additional context data
    """
    context = {
        'api_name': api_name,
        'endpoint': endpoint,
        'method': method,
        'status_code': status_code,
        'response_time': response_time,
        'request_id': get_request_id(request),
        **get_user_context(user),
        **kwargs
    }
    
    logger.log(level, message, extra=context)


def log_performance(
    logger: logging.Logger,
    operation: str,
    duration: float,
    request: Optional[HttpRequest] = None,
    user: Optional[User] = None,
    **kwargs
) -> None:
    """
    Log performance metrics for an operation.
    
    Args:
        logger: Logger instance
        operation: Operation name
        duration: Duration in seconds
        request: Django request object
        user: User instance
        **kwargs: Additional context data
    """
    level = LogLevel.WARNING if duration > 5.0 else LogLevel.INFO
    
    context = {
        'operation': operation,
        'duration': duration,
        'duration_ms': round(duration * 1000, 2),
        'request_id': get_request_id(request),
        **get_user_context(user),
        **kwargs
    }
    
    logger.log(level, f"Performance: {operation} completed in {duration:.3f}s", extra=context)


def performance_logger(operation: str, logger_name: str = LoggerNames.PERFORMANCE):
    """
    Decorator to automatically log performance of a function.
    
    Args:
        operation: Operation name for logging
        logger_name: Logger name to use
        
    Returns:
        Decorator function
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            logger = get_logger(logger_name)
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                # Extract request and user from args if available
                request = None
                user = None
                for arg in args:
                    if isinstance(arg, HttpRequest):
                        request = arg
                        user = getattr(arg, 'user', None)
                        break
                
                log_performance(logger, operation, duration, request, user)
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                logger.error(
                    f"Performance: {operation} failed after {duration:.3f}s",
                    extra={
                        'operation': operation,
                        'duration': duration,
                        'error': str(e),
                        'request_id': get_request_id(request),
                        **get_user_context(user)
                    }
                )
                raise
                
        return wrapper
    return decorator


def log_database_operation(
    logger: logging.Logger,
    operation: str,
    model_name: str,
    record_id: Optional[Union[int, str]] = None,
    request: Optional[HttpRequest] = None,
    user: Optional[User] = None,
    **kwargs
) -> None:
    """
    Log database operations with context.
    
    Args:
        logger: Logger instance
        operation: Database operation (CREATE, UPDATE, DELETE, READ)
        model_name: Model class name
        record_id: Record ID if applicable
        request: Django request object
        user: User instance
        **kwargs: Additional context data
    """
    context = {
        'db_operation': operation,
        'model_name': model_name,
        'record_id': record_id,
        'request_id': get_request_id(request),
        **get_user_context(user),
        **kwargs
    }
    
    message = f"Database {operation}: {model_name}"
    if record_id:
        message += f" (ID: {record_id})"
    
    logger.info(message, extra=context)


def log_business_event(
    logger: logging.Logger,
    event: str,
    message: str,
    request: Optional[HttpRequest] = None,
    user: Optional[User] = None,
    **kwargs
) -> None:
    """
    Log business events with structured context.
    
    Args:
        logger: Logger instance
        event: Business event name
        message: Event description
        request: Django request object
        user: User instance
        **kwargs: Additional context data
    """
    context = {
        'business_event': event,
        'request_id': get_request_id(request),
        **get_user_context(user),
        **kwargs
    }
    
    logger.info(f"Business Event: {event} - {message}", extra=context)


def log_security_event(
    logger: logging.Logger,
    event: str,
    message: str,
    severity: str = 'medium',
    request: Optional[HttpRequest] = None,
    user: Optional[User] = None,
    **kwargs
) -> None:
    """
    Log security events with appropriate severity.
    
    Args:
        logger: Logger instance
        event: Security event name
        message: Event description
        severity: Event severity (low, medium, high, critical)
        request: Django request object
        user: User instance
        **kwargs: Additional context data
    """
    level = LogLevel.WARNING if severity in ['high', 'critical'] else LogLevel.INFO
    
    context = {
        'security_event': event,
        'severity': severity,
        'request_id': get_request_id(request),
        **get_user_context(user),
        **kwargs
    }
    
    logger.log(level, f"Security Event: {event} - {message}", extra=context)


# Convenience functions for common operations
def log_user_action(logger: logging.Logger, action: str, request: HttpRequest, **kwargs):
    """Log user actions with request context."""
    log_business_event(logger, f"user_{action}", f"User performed {action}", request, request.user, **kwargs)


def log_api_request(logger: logging.Logger, endpoint: str, method: str, request: HttpRequest, **kwargs):
    """Log incoming API requests."""
    log_operation(
        logger, LogLevel.INFO, f"API Request: {method} {endpoint}", 
        "api_request", request, request.user, endpoint=endpoint, method=method, **kwargs
    )


def log_api_response(logger: logging.Logger, endpoint: str, status_code: int, response_time: float, request: HttpRequest, **kwargs):
    """Log API responses."""
    level = LogLevel.WARNING if status_code >= 400 else LogLevel.INFO
    log_operation(
        logger, level, f"API Response: {status_code} for {endpoint}", 
        "api_response", request, request.user, 
        endpoint=endpoint, status_code=status_code, response_time=response_time, **kwargs
    )
