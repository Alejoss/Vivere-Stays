"""
Request/Response logging middleware for Django application.

This middleware logs all incoming requests and responses with timing,
user context, and request correlation IDs for debugging purposes.
"""

import time
import uuid
import logging
from typing import Optional
from django.http import HttpRequest, HttpResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from .logging_utils import get_logger, get_user_context, log_operation, LogLevel, LoggerNames


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log HTTP requests and responses with timing and context.
    
    This middleware:
    - Generates unique request IDs for correlation
    - Logs incoming requests with method, URL, user, and IP
    - Logs response status codes and timing
    - Excludes sensitive endpoints from detailed logging
    - Adds user context to all logs
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.logger = get_logger(LoggerNames.MIDDLEWARE)
        
        # Endpoints to exclude from detailed logging
        self.excluded_paths = [
            '/health/',
            '/ping/',
            '/status/',
            '/admin/jsi18n/',
            '/static/',
            '/media/',
            '/favicon.ico',
        ]
        
        # Sensitive endpoints that should have minimal logging
        self.sensitive_paths = [
            '/api/auth/',
            '/api/login/',
            '/api/register/',
            '/api/password-reset/',
            '/stripe/webhook/',
        ]
    
    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        """
        Process incoming request and add logging context.
        
        Args:
            request: Django HttpRequest object
            
        Returns:
            HttpResponse or None to continue processing
        """
        # Generate unique request ID
        request.request_id = str(uuid.uuid4())[:8]
        
        # Start timing
        request.start_time = time.time()
        
        # Get client IP
        client_ip = self._get_client_ip(request)
        request.client_ip = client_ip
        
        # Check if this is a sensitive endpoint
        is_sensitive = any(path in request.path for path in self.sensitive_paths)
        is_excluded = any(path in request.path for path in self.excluded_paths)
        
        # Log request (with different detail levels)
        if not is_excluded:
            if is_sensitive:
                # Minimal logging for sensitive endpoints
                log_operation(
                    self.logger,
                    LogLevel.INFO,
                    f"Request: {request.method} {request.path}",
                    "http_request",
                    request,
                    getattr(request, 'user', None),
                    method=request.method,
                    path=request.path,
                    client_ip=client_ip,
                    sensitive=True
                )
            else:
                # Detailed logging for regular endpoints
                log_operation(
                    self.logger,
                    LogLevel.INFO,
                    f"Request: {request.method} {request.path}",
                    "http_request",
                    request,
                    getattr(request, 'user', None),
                    method=request.method,
                    path=request.path,
                    client_ip=client_ip,
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    content_type=request.META.get('CONTENT_TYPE', ''),
                    content_length=request.META.get('CONTENT_LENGTH', 0),
                    query_params=dict(request.GET) if request.GET else None,
                )
        
        return None
    
    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """
        Process outgoing response and log timing information.
        
        Args:
            request: Django HttpRequest object
            response: Django HttpResponse object
            
        Returns:
            HttpResponse: The response object
        """
        # Calculate response time
        if hasattr(request, 'start_time'):
            response_time = time.time() - request.start_time
        else:
            response_time = 0
        
        # Check if this is an excluded endpoint
        is_excluded = any(path in request.path for path in self.excluded_paths)
        is_sensitive = any(path in request.path for path in self.sensitive_paths)
        
        # Log response
        if not is_excluded:
            # Determine log level based on status code
            if response.status_code >= 500:
                log_level = LogLevel.ERROR
            elif response.status_code >= 400:
                log_level = LogLevel.WARNING
            else:
                log_level = LogLevel.INFO
            
            # Prepare response context
            response_context = {
                'status_code': response.status_code,
                'response_time': response_time,
                'response_time_ms': round(response_time * 1000, 2),
                'content_length': len(response.content) if hasattr(response, 'content') else 0,
            }
            
            # Add additional context for errors
            if response.status_code >= 400:
                response_context['error'] = True
                if hasattr(response, 'data') and isinstance(response.data, dict):
                    response_context['error_details'] = response.data
            
            if is_sensitive:
                # Minimal logging for sensitive endpoints
                log_operation(
                    self.logger,
                    log_level,
                    f"Response: {response.status_code} for {request.method} {request.path}",
                    "http_response",
                    request,
                    getattr(request, 'user', None),
                    sensitive=True,
                    **response_context
                )
            else:
                # Detailed logging for regular endpoints
                log_operation(
                    self.logger,
                    log_level,
                    f"Response: {response.status_code} for {request.method} {request.path}",
                    "http_response",
                    request,
                    getattr(request, 'user', None),
                    **response_context
                )
        
        return response
    
    def process_exception(self, request: HttpRequest, exception: Exception) -> Optional[HttpResponse]:
        """
        Process exceptions and log them with context.
        
        Args:
            request: Django HttpRequest object
            exception: Exception that occurred
            
        Returns:
            HttpResponse or None to let Django handle the exception
        """
        # Calculate response time if available
        if hasattr(request, 'start_time'):
            response_time = time.time() - request.start_time
        else:
            response_time = 0
        
        # Log the exception
        log_operation(
            self.logger,
            LogLevel.ERROR,
            f"Exception in {request.method} {request.path}: {str(exception)}",
            "http_exception",
            request,
            getattr(request, 'user', None),
            exception_type=type(exception).__name__,
            exception_message=str(exception),
            response_time=response_time,
            response_time_ms=round(response_time * 1000, 2),
        )
        
        return None
    
    def _get_client_ip(self, request: HttpRequest) -> str:
        """
        Extract client IP address from request headers.
        
        Args:
            request: Django HttpRequest object
            
        Returns:
            str: Client IP address
        """
        # Check for forwarded IP first (for load balancers/proxies)
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            # Take the first IP in the chain
            return x_forwarded_for.split(',')[0].strip()
        
        # Check for real IP header
        x_real_ip = request.META.get('HTTP_X_REAL_IP')
        if x_real_ip:
            return x_real_ip.strip()
        
        # Fall back to remote address
        return request.META.get('REMOTE_ADDR', 'unknown')


class UserContextMiddleware(MiddlewareMixin):
    """
    Middleware to add user context to Sentry for error tracking.
    """
    
    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        """
        Add user context to Sentry if user is authenticated.
        
        Args:
            request: Django HttpRequest object
            
        Returns:
            HttpResponse or None to continue processing
        """
        if hasattr(request, 'user') and request.user.is_authenticated:
            try:
                from .sentry_config import set_user_context
                set_user_context(request.user)
            except ImportError:
                # Sentry not configured, skip
                pass
        
        return None


class PerformanceLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log performance metrics for slow requests.
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.logger = get_logger(LoggerNames.PERFORMANCE)
        self.slow_request_threshold = 2.0  # seconds
    
    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """
        Log performance metrics for slow requests.
        
        Args:
            request: Django HttpRequest object
            response: Django HttpResponse object
            
        Returns:
            HttpResponse: The response object
        """
        if hasattr(request, 'start_time'):
            response_time = time.time() - request.start_time
            
            # Log slow requests
            if response_time > self.slow_request_threshold:
                log_operation(
                    self.logger,
                    LogLevel.WARNING,
                    f"Slow request: {request.method} {request.path} took {response_time:.3f}s",
                    "slow_request",
                    request,
                    getattr(request, 'user', None),
                    response_time=response_time,
                    response_time_ms=round(response_time * 1000, 2),
                    status_code=response.status_code,
                    threshold=self.slow_request_threshold,
                )
        
        return response
