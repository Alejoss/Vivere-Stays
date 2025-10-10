/**
 * Error Codes for Vivere Stays API
 * 
 * This enum MUST match the backend error codes exactly (backend/vivere_stays/error_codes.py)
 * 
 * These codes are sent from the backend and translated on the frontend
 * into user-friendly messages in the user's preferred language.
 * 
 * Usage:
 *   import { ErrorCode } from '@/shared/api/errorCodes';
 *   
 *   if (error.code === ErrorCode.EMAIL_ALREADY_EXISTS) {
 *     // Handle specific error
 *   }
 */

/**
 * Error code enumeration - matches backend error_codes.py
 * 
 * IMPORTANT: When adding new codes, also add them to:
 * 1. backend/vivere_stays/error_codes.py
 * 2. frontend/public/locales/{en,es,de}/errors.json
 */
export enum ErrorCode {
  // ============================================================================
  // AUTHENTICATION & AUTHORIZATION (AUTH_*)
  // ============================================================================
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // ============================================================================
  // USER MANAGEMENT (USER_*)
  // ============================================================================
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS = 'USERNAME_ALREADY_EXISTS',
  EMAIL_REQUIRED = 'EMAIL_REQUIRED',
  EMAIL_INVALID = 'EMAIL_INVALID',
  PASSWORD_REQUIRED = 'PASSWORD_REQUIRED',
  PASSWORD_TOO_SHORT = 'PASSWORD_TOO_SHORT',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
  PASSWORD_MISMATCH = 'PASSWORD_MISMATCH',
  CURRENT_PASSWORD_INCORRECT = 'CURRENT_PASSWORD_INCORRECT',
  USERNAME_REQUIRED = 'USERNAME_REQUIRED',
  USERNAME_INVALID = 'USERNAME_INVALID',
  USER_NOT_FOUND = 'USER_NOT_FOUND',

  // ============================================================================
  // PROPERTY MANAGEMENT (PROPERTY_*)
  // ============================================================================
  PROPERTY_NOT_FOUND = 'PROPERTY_NOT_FOUND',
  PROPERTY_NAME_REQUIRED = 'PROPERTY_NAME_REQUIRED',
  PROPERTY_CITY_REQUIRED = 'PROPERTY_CITY_REQUIRED',
  PROPERTY_COUNTRY_REQUIRED = 'PROPERTY_COUNTRY_REQUIRED',
  PROPERTY_ADDRESS_REQUIRED = 'PROPERTY_ADDRESS_REQUIRED',
  PROPERTY_POSTAL_CODE_REQUIRED = 'PROPERTY_POSTAL_CODE_REQUIRED',
  PROPERTY_PHONE_REQUIRED = 'PROPERTY_PHONE_REQUIRED',
  PROPERTY_TYPE_REQUIRED = 'PROPERTY_TYPE_REQUIRED',
  PROPERTY_ROOMS_REQUIRED = 'PROPERTY_ROOMS_REQUIRED',
  PROPERTY_ROOMS_INVALID = 'PROPERTY_ROOMS_INVALID',
  PROPERTY_NO_ACCESS = 'PROPERTY_NO_ACCESS',
  PROPERTY_SETUP_INCOMPLETE = 'PROPERTY_SETUP_INCOMPLETE',

  // ============================================================================
  // COMPETITOR MANAGEMENT (COMPETITOR_*)
  // ============================================================================
  COMPETITOR_NAME_REQUIRED = 'COMPETITOR_NAME_REQUIRED',
  COMPETITOR_NAME_TOO_SHORT = 'COMPETITOR_NAME_TOO_SHORT',
  COMPETITOR_URL_INVALID = 'COMPETITOR_URL_INVALID',
  COMPETITOR_URL_NOT_HOTEL = 'COMPETITOR_URL_NOT_HOTEL',
  COMPETITOR_ALREADY_EXISTS = 'COMPETITOR_ALREADY_EXISTS',
  COMPETITOR_NOT_FOUND = 'COMPETITOR_NOT_FOUND',
  COMPETITOR_CREATE_FAILED = 'COMPETITOR_CREATE_FAILED',

  // ============================================================================
  // PRICING & MSP (PRICING_*)
  // ============================================================================
  MSP_VALUE_NEGATIVE = 'MSP_VALUE_NEGATIVE',
  MSP_VALUE_REQUIRED = 'MSP_VALUE_REQUIRED',
  DATE_RANGE_INVALID = 'DATE_RANGE_INVALID',
  VALID_FROM_REQUIRED = 'VALID_FROM_REQUIRED',
  VALID_UNTIL_REQUIRED = 'VALID_UNTIL_REQUIRED',
  PRICE_NEGATIVE = 'PRICE_NEGATIVE',
  PRICE_REQUIRED = 'PRICE_REQUIRED',

  // ============================================================================
  // SPECIAL OFFERS (OFFER_*)
  // ============================================================================
  OFFER_NAME_REQUIRED = 'OFFER_NAME_REQUIRED',
  OFFER_INCREMENT_VALUE_NEGATIVE = 'OFFER_INCREMENT_VALUE_NEGATIVE',
  OFFER_INCREMENT_VALUE_REQUIRED = 'OFFER_INCREMENT_VALUE_REQUIRED',
  OFFER_INCREMENT_TYPE_INVALID = 'OFFER_INCREMENT_TYPE_INVALID',
  OFFER_DATES_REQUIRED = 'OFFER_DATES_REQUIRED',
  OFFER_ALREADY_EXISTS = 'OFFER_ALREADY_EXISTS',

  // ============================================================================
  // DYNAMIC PRICING SETUP (DYNAMIC_*)
  // ============================================================================
  DYNAMIC_OCCUPANCY_CATEGORY_INVALID = 'DYNAMIC_OCCUPANCY_CATEGORY_INVALID',
  DYNAMIC_LEAD_TIME_CATEGORY_INVALID = 'DYNAMIC_LEAD_TIME_CATEGORY_INVALID',
  DYNAMIC_INCREMENT_VALUE_NEGATIVE = 'DYNAMIC_INCREMENT_VALUE_NEGATIVE',
  DYNAMIC_INCREMENT_TYPE_INVALID = 'DYNAMIC_INCREMENT_TYPE_INVALID',
  DYNAMIC_RULE_ALREADY_EXISTS = 'DYNAMIC_RULE_ALREADY_EXISTS',

  // ============================================================================
  // LENGTH OF STAY (LOS_*)
  // ============================================================================
  LOS_VALUE_REQUIRED = 'LOS_VALUE_REQUIRED',
  LOS_VALUE_INVALID = 'LOS_VALUE_INVALID',
  LOS_RULE_ALREADY_EXISTS = 'LOS_RULE_ALREADY_EXISTS',
  LOS_DATES_REQUIRED = 'LOS_DATES_REQUIRED',

  // ============================================================================
  // AVAILABLE RATES (RATE_*)
  // ============================================================================
  RATE_NOT_FOUND = 'RATE_NOT_FOUND',
  RATE_INCREMENT_VALUE_NEGATIVE = 'RATE_INCREMENT_VALUE_NEGATIVE',
  RATE_MULTIPLE_BASE_RATES = 'RATE_MULTIPLE_BASE_RATES',
  RATE_ID_REQUIRED = 'RATE_ID_REQUIRED',

  // ============================================================================
  // GENERAL SETTINGS (SETTINGS_*)
  // ============================================================================
  SETTINGS_COMP_PRICE_CALCULATION_INVALID = 'SETTINGS_COMP_PRICE_CALCULATION_INVALID',
  SETTINGS_LOS_AGGREGATION_INVALID = 'SETTINGS_LOS_AGGREGATION_INVALID',

  // ============================================================================
  // SUPPORT TICKETS (SUPPORT_*)
  // ============================================================================
  SUPPORT_TITLE_REQUIRED = 'SUPPORT_TITLE_REQUIRED',
  SUPPORT_TITLE_TOO_SHORT = 'SUPPORT_TITLE_TOO_SHORT',
  SUPPORT_DESCRIPTION_REQUIRED = 'SUPPORT_DESCRIPTION_REQUIRED',
  SUPPORT_DESCRIPTION_TOO_SHORT = 'SUPPORT_DESCRIPTION_TOO_SHORT',
  SUPPORT_ISSUE_TYPE_INVALID = 'SUPPORT_ISSUE_TYPE_INVALID',

  // ============================================================================
  // NOTIFICATIONS (NOTIFICATION_*)
  // ============================================================================
  NOTIFICATION_TYPE_INVALID = 'NOTIFICATION_TYPE_INVALID',
  NOTIFICATION_CATEGORY_INVALID = 'NOTIFICATION_CATEGORY_INVALID',
  NOTIFICATION_PRIORITY_INVALID = 'NOTIFICATION_PRIORITY_INVALID',
  NOTIFICATION_NOT_FOUND = 'NOTIFICATION_NOT_FOUND',

  // ============================================================================
  // GENERAL VALIDATION (VALIDATION_*)
  // ============================================================================
  FIELD_REQUIRED = 'FIELD_REQUIRED',
  FIELD_INVALID = 'FIELD_INVALID',
  FIELD_TOO_SHORT = 'FIELD_TOO_SHORT',
  FIELD_TOO_LONG = 'FIELD_TOO_LONG',
  VALUE_MUST_BE_POSITIVE = 'VALUE_MUST_BE_POSITIVE',
  VALUE_OUT_OF_RANGE = 'VALUE_OUT_OF_RANGE',
  INVALID_CHOICE = 'INVALID_CHOICE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // ============================================================================
  // SERVER & SYSTEM ERRORS (SERVER_*)
  // ============================================================================
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  PAYMENT_ERROR = 'PAYMENT_ERROR',
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Single API error object from backend
 */
export interface ApiError {
  /** Field name that caused the error (null for non-field errors) */
  field?: string | null;
  
  /** Machine-readable error code (e.g., EMAIL_ALREADY_EXISTS) */
  code?: ErrorCode | string;
  
  /** Human-readable debug message (not for display to users) */
  debug_message?: string;
  
  /** Fallback message if no code provided */
  message?: string;
}

/**
 * Error response from backend API
 */
export interface ApiErrorResponse {
  /** Always false for error responses */
  success: false;
  
  /** Array of error objects */
  errors: ApiError[];
}

/**
 * Success response from backend API
 */
export interface ApiSuccessResponse<T = any> {
  /** Always true for success responses */
  success: true;
  
  /** Optional success message */
  message?: string;
  
  /** Response data */
  data?: T;
}

/**
 * Generic API response (can be success or error)
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Type guard to check if response is an error
 */
export function isApiError(response: ApiResponse): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Type guard to check if response is a success
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Helper to get field-specific error from error response
 */
export function getFieldError(
  response: ApiErrorResponse | null | undefined,
  fieldName: string
): ApiError | undefined {
  if (!response || !response.errors) return undefined;
  return response.errors.find(error => error.field === fieldName);
}

/**
 * Helper to get all non-field errors (general errors)
 */
export function getNonFieldErrors(
  response: ApiErrorResponse | null | undefined
): ApiError[] {
  if (!response || !response.errors) return [];
  return response.errors.filter(error => !error.field || error.field === null);
}

/**
 * Helper to check if a specific error code exists in response
 */
export function hasErrorCode(
  response: ApiErrorResponse | null | undefined,
  code: ErrorCode
): boolean {
  if (!response || !response.errors) return false;
  return response.errors.some(error => error.code === code);
}

