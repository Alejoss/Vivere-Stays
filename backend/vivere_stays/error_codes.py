"""
Centralized Error Codes for Vivere Stays API

This module defines all error codes used across the application.
Error codes are sent to the frontend where they are translated to user-friendly
messages in the user's preferred language.

Usage:
    from vivere_stays.error_codes import ErrorCode
    
    raise ValidationError(
        "Debug message for logs",
        code=ErrorCode.EMAIL_ALREADY_EXISTS
    )
"""
from enum import Enum


class ErrorCode(str, Enum):
    """
    Enumeration of all error codes used in the API.
    
    These codes are NOT translated on the backend - they are sent to the frontend
    where they are translated into user-friendly messages in the user's language.
    
    Naming Convention:
    - Use UPPER_SNAKE_CASE
    - Be descriptive but concise
    - Group by functionality (auth, user, property, etc.)
    """
    
    # ============================================================================
    # AUTHENTICATION & AUTHORIZATION (AUTH_*)
    # ============================================================================
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    """Invalid email or password during login"""
    
    UNAUTHORIZED = "UNAUTHORIZED"
    """User must be authenticated to perform this action"""
    
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    """Authentication token has expired"""
    
    TOKEN_INVALID = "TOKEN_INVALID"
    """Authentication token is invalid or malformed"""
    
    SESSION_EXPIRED = "SESSION_EXPIRED"
    """User session has expired, please login again"""
    
    # ============================================================================
    # USER MANAGEMENT (USER_*)
    # ============================================================================
    EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS"
    """An account with this email already exists"""
    
    USERNAME_ALREADY_EXISTS = "USERNAME_ALREADY_EXISTS"
    """This username is already taken"""
    
    EMAIL_REQUIRED = "EMAIL_REQUIRED"
    """Email address is required"""
    
    EMAIL_INVALID = "EMAIL_INVALID"
    """Please enter a valid email address"""
    
    PASSWORD_REQUIRED = "PASSWORD_REQUIRED"
    """Password is required"""
    
    PASSWORD_TOO_SHORT = "PASSWORD_TOO_SHORT"
    """Password must be at least 8 characters"""
    
    PASSWORD_TOO_WEAK = "PASSWORD_TOO_WEAK"
    """Password must contain letters, numbers, and special characters"""
    
    PASSWORD_MISMATCH = "PASSWORD_MISMATCH"
    """Passwords do not match"""
    
    CURRENT_PASSWORD_INCORRECT = "CURRENT_PASSWORD_INCORRECT"
    """Current password is incorrect"""
    
    USERNAME_REQUIRED = "USERNAME_REQUIRED"
    """Username is required"""
    
    USERNAME_INVALID = "USERNAME_INVALID"
    """Username can only contain letters, numbers, and underscores"""
    
    USER_NOT_FOUND = "USER_NOT_FOUND"
    """User account not found"""
    
    # ============================================================================
    # PROPERTY MANAGEMENT (PROPERTY_*)
    # ============================================================================
    PROPERTY_NOT_FOUND = "PROPERTY_NOT_FOUND"
    """Property not found or you don't have access to it"""
    
    PROPERTY_NAME_REQUIRED = "PROPERTY_NAME_REQUIRED"
    """Property name is required"""
    
    PROPERTY_CITY_REQUIRED = "PROPERTY_CITY_REQUIRED"
    """City is required"""
    
    PROPERTY_COUNTRY_REQUIRED = "PROPERTY_COUNTRY_REQUIRED"
    """Country is required"""
    
    PROPERTY_ADDRESS_REQUIRED = "PROPERTY_ADDRESS_REQUIRED"
    """Street address is required"""
    
    PROPERTY_POSTAL_CODE_REQUIRED = "PROPERTY_POSTAL_CODE_REQUIRED"
    """Postal code is required"""
    
    PROPERTY_PHONE_REQUIRED = "PROPERTY_PHONE_REQUIRED"
    """Phone number is required"""
    
    PROPERTY_TYPE_REQUIRED = "PROPERTY_TYPE_REQUIRED"
    """Property type is required"""
    
    PROPERTY_ROOMS_REQUIRED = "PROPERTY_ROOMS_REQUIRED"
    """Number of rooms is required"""
    
    PROPERTY_ROOMS_INVALID = "PROPERTY_ROOMS_INVALID"
    """Number of rooms must be a positive number"""
    
    PROPERTY_NO_ACCESS = "PROPERTY_NO_ACCESS"
    """You don't have permission to access this property"""
    
    PROPERTY_SETUP_INCOMPLETE = "PROPERTY_SETUP_INCOMPLETE"
    """Please complete the property setup first"""
    
    # ============================================================================
    # COMPETITOR MANAGEMENT (COMPETITOR_*)
    # ============================================================================
    COMPETITOR_NAME_REQUIRED = "COMPETITOR_NAME_REQUIRED"
    """Competitor name is required"""
    
    COMPETITOR_NAME_TOO_SHORT = "COMPETITOR_NAME_TOO_SHORT"
    """Competitor name must be at least 2 characters"""
    
    COMPETITOR_URL_INVALID = "COMPETITOR_URL_INVALID"
    """Please provide a valid Booking.com URL"""
    
    COMPETITOR_URL_NOT_HOTEL = "COMPETITOR_URL_NOT_HOTEL"
    """Please provide a valid Booking.com hotel URL"""
    
    COMPETITOR_ALREADY_EXISTS = "COMPETITOR_ALREADY_EXISTS"
    """This competitor has already been added"""
    
    COMPETITOR_NOT_FOUND = "COMPETITOR_NOT_FOUND"
    """Competitor not found"""
    
    COMPETITOR_CREATE_FAILED = "COMPETITOR_CREATE_FAILED"
    """Failed to create competitor"""
    
    # ============================================================================
    # PRICING & MSP (PRICING_*)
    # ============================================================================
    MSP_VALUE_NEGATIVE = "MSP_VALUE_NEGATIVE"
    """MSP value cannot be negative"""
    
    MSP_VALUE_REQUIRED = "MSP_VALUE_REQUIRED"
    """MSP value is required"""
    
    DATE_RANGE_INVALID = "DATE_RANGE_INVALID"
    """End date must be after start date"""
    
    VALID_FROM_REQUIRED = "VALID_FROM_REQUIRED"
    """Start date is required"""
    
    VALID_UNTIL_REQUIRED = "VALID_UNTIL_REQUIRED"
    """End date is required"""
    
    PRICE_NEGATIVE = "PRICE_NEGATIVE"
    """Price cannot be negative"""
    
    PRICE_REQUIRED = "PRICE_REQUIRED"
    """Price is required"""
    
    # ============================================================================
    # SPECIAL OFFERS (OFFER_*)
    # ============================================================================
    OFFER_NAME_REQUIRED = "OFFER_NAME_REQUIRED"
    """Offer name is required"""
    
    OFFER_INCREMENT_VALUE_NEGATIVE = "OFFER_INCREMENT_VALUE_NEGATIVE"
    """Increment value cannot be negative"""
    
    OFFER_INCREMENT_VALUE_REQUIRED = "OFFER_INCREMENT_VALUE_REQUIRED"
    """Increment value is required"""
    
    OFFER_INCREMENT_TYPE_INVALID = "OFFER_INCREMENT_TYPE_INVALID"
    """Increment type must be 'Percentage' or 'Additional'"""
    
    OFFER_DATES_REQUIRED = "OFFER_DATES_REQUIRED"
    """Offer dates are required"""
    
    OFFER_ALREADY_EXISTS = "OFFER_ALREADY_EXISTS"
    """An offer with these dates already exists"""
    
    # ============================================================================
    # DYNAMIC PRICING SETUP (DYNAMIC_*)
    # ============================================================================
    DYNAMIC_OCCUPANCY_CATEGORY_INVALID = "DYNAMIC_OCCUPANCY_CATEGORY_INVALID"
    """Invalid occupancy category"""
    
    DYNAMIC_LEAD_TIME_CATEGORY_INVALID = "DYNAMIC_LEAD_TIME_CATEGORY_INVALID"
    """Invalid lead time category"""
    
    DYNAMIC_INCREMENT_VALUE_NEGATIVE = "DYNAMIC_INCREMENT_VALUE_NEGATIVE"
    """Increment value cannot be negative"""
    
    DYNAMIC_INCREMENT_TYPE_INVALID = "DYNAMIC_INCREMENT_TYPE_INVALID"
    """Increment type must be 'Percentage' or 'Additional'"""
    
    DYNAMIC_RULE_ALREADY_EXISTS = "DYNAMIC_RULE_ALREADY_EXISTS"
    """A rule with these parameters already exists"""
    
    # ============================================================================
    # LENGTH OF STAY (LOS_*)
    # ============================================================================
    LOS_VALUE_REQUIRED = "LOS_VALUE_REQUIRED"
    """LOS value is required"""
    
    LOS_VALUE_INVALID = "LOS_VALUE_INVALID"
    """LOS value must be greater than 0"""
    
    LOS_RULE_ALREADY_EXISTS = "LOS_RULE_ALREADY_EXISTS"
    """A LOS rule with these parameters already exists"""
    
    LOS_DATES_REQUIRED = "LOS_DATES_REQUIRED"
    """LOS dates are required"""
    
    # ============================================================================
    # AVAILABLE RATES (RATE_*)
    # ============================================================================
    RATE_NOT_FOUND = "RATE_NOT_FOUND"
    """Rate not found"""
    
    RATE_INCREMENT_VALUE_NEGATIVE = "RATE_INCREMENT_VALUE_NEGATIVE"
    """Rate increment value cannot be negative"""
    
    RATE_MULTIPLE_BASE_RATES = "RATE_MULTIPLE_BASE_RATES"
    """Only one rate can be marked as base rate"""
    
    RATE_ID_REQUIRED = "RATE_ID_REQUIRED"
    """Rate ID is required"""
    
    # ============================================================================
    # GENERAL SETTINGS (SETTINGS_*)
    # ============================================================================
    SETTINGS_COMP_PRICE_CALCULATION_INVALID = "SETTINGS_COMP_PRICE_CALCULATION_INVALID"
    """Competitor price calculation must be one of: min, max, avg, median"""
    
    SETTINGS_LOS_AGGREGATION_INVALID = "SETTINGS_LOS_AGGREGATION_INVALID"
    """LOS aggregation must be 'min' or 'max'"""
    
    # ============================================================================
    # SUPPORT TICKETS (SUPPORT_*)
    # ============================================================================
    SUPPORT_TITLE_REQUIRED = "SUPPORT_TITLE_REQUIRED"
    """Support ticket title is required"""
    
    SUPPORT_TITLE_TOO_SHORT = "SUPPORT_TITLE_TOO_SHORT"
    """Title must be at least 5 characters"""
    
    SUPPORT_DESCRIPTION_REQUIRED = "SUPPORT_DESCRIPTION_REQUIRED"
    """Description is required"""
    
    SUPPORT_DESCRIPTION_TOO_SHORT = "SUPPORT_DESCRIPTION_TOO_SHORT"
    """Description must be at least 10 characters"""
    
    SUPPORT_ISSUE_TYPE_INVALID = "SUPPORT_ISSUE_TYPE_INVALID"
    """Invalid issue type"""
    
    # ============================================================================
    # NOTIFICATIONS (NOTIFICATION_*)
    # ============================================================================
    NOTIFICATION_TYPE_INVALID = "NOTIFICATION_TYPE_INVALID"
    """Invalid notification type"""
    
    NOTIFICATION_CATEGORY_INVALID = "NOTIFICATION_CATEGORY_INVALID"
    """Invalid notification category"""
    
    NOTIFICATION_PRIORITY_INVALID = "NOTIFICATION_PRIORITY_INVALID"
    """Invalid notification priority"""
    
    NOTIFICATION_NOT_FOUND = "NOTIFICATION_NOT_FOUND"
    """Notification not found"""
    
    # ============================================================================
    # GENERAL VALIDATION (VALIDATION_*)
    # ============================================================================
    FIELD_REQUIRED = "FIELD_REQUIRED"
    """This field is required"""
    
    FIELD_INVALID = "FIELD_INVALID"
    """Invalid field value"""
    
    FIELD_TOO_SHORT = "FIELD_TOO_SHORT"
    """Field value is too short"""
    
    FIELD_TOO_LONG = "FIELD_TOO_LONG"
    """Field value is too long"""
    
    VALUE_MUST_BE_POSITIVE = "VALUE_MUST_BE_POSITIVE"
    """Value must be a positive number"""
    
    VALUE_OUT_OF_RANGE = "VALUE_OUT_OF_RANGE"
    """Value is out of acceptable range"""
    
    INVALID_CHOICE = "INVALID_CHOICE"
    """Invalid choice. Please select a valid option"""
    
    INVALID_FORMAT = "INVALID_FORMAT"
    """Invalid format"""
    
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    """This entry already exists"""
    
    # ============================================================================
    # SERVER & SYSTEM ERRORS (SERVER_*)
    # ============================================================================
    SERVER_ERROR = "SERVER_ERROR"
    """An unexpected error occurred. Please try again"""
    
    DATABASE_ERROR = "DATABASE_ERROR"
    """Database error occurred"""
    
    EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR"
    """External service error"""
    
    PAYMENT_ERROR = "PAYMENT_ERROR"
    """Payment processing error"""
    
    EMAIL_SEND_FAILED = "EMAIL_SEND_FAILED"
    """Failed to send email"""
    
    FILE_UPLOAD_FAILED = "FILE_UPLOAD_FAILED"
    """File upload failed"""
    
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    """File size exceeds the maximum allowed"""
    
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
    """Invalid file type"""
    
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    """Too many requests. Please try again later"""
    
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    """Service temporarily unavailable"""


# Export for easy imports
__all__ = ['ErrorCode']

