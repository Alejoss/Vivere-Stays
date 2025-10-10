/**
 * ErrorMessage Component
 * 
 * Displays error messages from the backend API with proper i18n translation.
 * 
 * Features:
 * - Translates error codes to user's language
 * - Handles both error codes and plain string messages
 * - Provides fallback for unknown error codes
 * - Customizable styling via className prop
 * 
 * Usage:
 *   <ErrorMessage error={apiError} />
 *   <ErrorMessage error="Custom error message" />
 */

import { useTranslation } from 'react-i18next';
import { ApiError } from '../../shared/api/errorCodes';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  /** Error object from API or plain string message */
  error: ApiError | string | null | undefined;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Show icon (default: true) */
  showIcon?: boolean;
  
  /** Variant style */
  variant?: 'default' | 'destructive' | 'warning';
}

/**
 * ErrorMessage Component
 * 
 * Displays translated error messages from backend error codes or plain strings.
 * 
 * @example
 * // With error code from API
 * <ErrorMessage error={{ code: 'EMAIL_ALREADY_EXISTS', field: 'email' }} />
 * 
 * @example
 * // With plain string
 * <ErrorMessage error="Something went wrong" />
 * 
 * @example
 * // With custom styling
 * <ErrorMessage error={error} className="mt-2" variant="destructive" />
 */
export default function ErrorMessage({ 
  error, 
  className = '', 
  showIcon = true,
  variant = 'destructive'
}: ErrorMessageProps) {
  const { t } = useTranslation('errors');
  
  // Return null if no error
  if (!error) return null;
  
  // Handle string errors
  if (typeof error === 'string') {
    return (
      <div className={`flex items-center gap-2 text-sm ${getVariantClasses(variant)} ${className}`}>
        {showIcon && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
        <span>{error}</span>
      </div>
    );
  }
  
  // Handle API error objects
  let message: string;
  
  if (error.code) {
    // Try to translate the error code
    // If translation doesn't exist, fall back to debug_message or generic message
    const translationKey = error.code;
    const translated = t(translationKey, { defaultValue: '' });
    
    if (translated) {
      message = translated;
    } else if (error.debug_message) {
      message = error.debug_message;
    } else if (error.message) {
      message = error.message;
    } else {
      message = t('SERVER_ERROR', { defaultValue: 'An error occurred' });
    }
  } else if (error.message) {
    // No code, just use the message
    message = error.message;
  } else {
    // No code or message - fallback
    message = t('SERVER_ERROR', { defaultValue: 'An error occurred' });
  }
  
  return (
    <div className={`flex items-center gap-2 text-sm ${getVariantClasses(variant)} ${className}`}>
      {showIcon && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      <span>{message}</span>
    </div>
  );
}

/**
 * Get CSS classes for error variant
 */
function getVariantClasses(variant: 'default' | 'destructive' | 'warning'): string {
  switch (variant) {
    case 'destructive':
      return 'text-red-600 dark:text-red-400';
    case 'warning':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'default':
    default:
      return 'text-gray-700 dark:text-gray-300';
  }
}

/**
 * ErrorList Component
 * 
 * Displays a list of errors (useful for form validation with multiple errors)
 */
export function ErrorList({ 
  errors, 
  className = '' 
}: { 
  errors: (ApiError | string)[] | null | undefined;
  className?: string;
}) {
  const { t } = useTranslation('errors');
  
  if (!errors || errors.length === 0) return null;
  
  return (
    <div className={`space-y-2 ${className}`}>
      {errors.map((error, index) => (
        <ErrorMessage key={index} error={error} />
      ))}
    </div>
  );
}

/**
 * FormFieldError Component
 * 
 * Specialized component for displaying field-specific errors in forms
 */
export function FormFieldError({ 
  error, 
  className = '' 
}: { 
  error: ApiError | string | null | undefined;
  className?: string;
}) {
  if (!error) return null;
  
  return (
    <ErrorMessage 
      error={error} 
      className={`mt-1 ${className}`}
      showIcon={false}
    />
  );
}

