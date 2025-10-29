"""
Centralized logging configuration for Vivere Stays Django application.

This module provides structured JSON logging with proper log levels,
environment-based configuration, and Docker-compatible console output.
"""

import os
import logging
import logging.config
from pythonjsonlogger import jsonlogger
from decouple import config


def get_logging_config():
    """
    Get logging configuration based on environment.
    
    Returns:
        dict: Django logging configuration
    """
    environment = config('ENVIRONMENT', default='development')
    debug = config('DEBUG', default=True, cast=bool)
    
    # Base log level based on environment
    if environment == 'production':
        base_level = 'INFO'
    elif environment == 'staging':
        base_level = 'DEBUG'
    else:  # development
        base_level = 'DEBUG'
    
    # JSON formatter for structured logging
    json_formatter = {
        '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
        'format': '%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)d %(funcName)s %(process)d %(thread)d'
    }
    
    # Console formatter for development
    console_formatter = {
        'format': '[%(asctime)s] %(levelname)s [%(name)s:%(lineno)d] %(message)s',
        'datefmt': '%Y-%m-%d %H:%M:%S'
    }
    
    # Handlers
    handlers = {
        'console': {
            'class': 'logging.StreamHandler',
            'level': base_level,
            'formatter': 'console' if debug else 'json',
            'stream': 'ext://sys.stdout',
        }
    }
    
    # Loggers configuration
    loggers = {
        # Root logger
        '': {
            'handlers': ['console'],
            'level': base_level,
            'propagate': False,
        },
        
        # Django framework
        'django': {
            'handlers': ['console'],
            'level': 'INFO' if environment == 'production' else 'DEBUG',
            'propagate': False,
        },
        
        'django.request': {
            'handlers': ['console'],
            'level': 'WARNING' if environment == 'production' else 'INFO',
            'propagate': False,
        },
        
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'WARNING' if environment == 'production' else 'DEBUG',
            'propagate': False,
        },
        
        # Application loggers
        'vivere_stays': {
            'handlers': ['console'],
            'level': base_level,
            'propagate': False,
        },
        
        'profiles': {
            'handlers': ['console'],
            'level': base_level,
            'propagate': False,
        },
        
        'dynamic_pricing': {
            'handlers': ['console'],
            'level': base_level,
            'propagate': False,
        },
        
        'booking': {
            'handlers': ['console'],
            'level': base_level,
            'propagate': False,
        },
        
        'analytics': {
            'handlers': ['console'],
            'level': base_level,
            'propagate': False,
        },
        
        # External services
        'requests': {
            'handlers': ['console'],
            'level': 'WARNING' if environment == 'production' else 'INFO',
            'propagate': False,
        },
        
        'urllib3': {
            'handlers': ['console'],
            'level': 'WARNING' if environment == 'production' else 'INFO',
            'propagate': False,
        },
        
        # Sentry logger
        'sentry_sdk': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    }
    
    return {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'json': json_formatter,
            'console': console_formatter,
        },
        'handlers': handlers,
        'loggers': loggers,
    }


def configure_logging():
    """
    Configure Django logging with the application-specific configuration.
    This should be called from settings.py.
    """
    logging_config = get_logging_config()
    logging.config.dictConfig(logging_config)
    
    # Set up root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    
    return logging_config


# Log level constants for easy reference
class LogLevel:
    DEBUG = logging.DEBUG
    INFO = logging.INFO
    WARNING = logging.WARNING
    ERROR = logging.ERROR
    CRITICAL = logging.CRITICAL


# Component-specific logger names
class LoggerNames:
    VIVERE_STAYS = 'vivere_stays'
    PROFILES = 'profiles'
    DYNAMIC_PRICING = 'dynamic_pricing'
    BOOKING = 'booking'
    ANALYTICS = 'analytics'
    MIDDLEWARE = 'vivere_stays.middleware'
    EXTERNAL_API = 'vivere_stays.external_api'
    PERFORMANCE = 'vivere_stays.performance'
