/**
 * i18next Configuration for Vivere Stays
 * 
 * This file configures internationalization for the application.
 * Supports: English (en), Spanish (es), German (de)
 * 
 * Features:
 * - Automatic language detection from browser/localStorage
 * - Lazy loading of translations (HTTP backend)
 * - Namespace organization (common, auth, dashboard, errors)
 * - Fallback to English if translation missing
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  // Load translation files via HTTP
  .use(Backend)
  
  // Detect user's language preference
  .use(LanguageDetector)
  
  // Pass i18n instance to react-i18next
  .use(initReactI18next)
  
  // Initialize i18next
  .init({
    // Fallback language if user's language is not available
    fallbackLng: 'en',
    
    // Enable debug mode in development
    debug: import.meta.env.MODE === 'development',
    
    // Supported languages
    supportedLngs: ['en', 'es', 'de'],
    
    // Language to use if detection fails
    load: 'languageOnly', // 'en' instead of 'en-US'
    
    // Backend configuration for loading translation files
    backend: {
      // Path to translation files
      // {{lng}} = language code, {{ns}} = namespace
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      
      // Allow cross-origin requests (if needed)
      crossDomain: false,
      
      // Add timestamp to prevent caching during development
      queryStringParams: import.meta.env.MODE === 'development' 
        ? { v: new Date().getTime().toString() } 
        : {},
    },
    
    // Language detection configuration
    detection: {
      // Detection order: check localStorage first, then browser settings, then HTML tag
      order: ['localStorage', 'navigator', 'htmlTag'],
      
      // Cache user's language choice
      caches: ['localStorage'],
      
      // Key to store language in localStorage
      lookupLocalStorage: 'i18nextLng',
      
      // Don't use cookies
      lookupCookie: undefined,
    },
    
    // Namespaces for organizing translations
    ns: [
      'common',      // Buttons, navigation, general UI
      'auth',        // Login, register, verification
      'dashboard',   // Dashboard-specific text
      'onboarding',  // Onboarding flow
      'errors',      // Error codes from backend
    ],
    
    // Default namespace if not specified
    defaultNS: 'common',
    
    // Interpolation options
    interpolation: {
      // React already escapes values, no need for i18next to do it
      escapeValue: false,
      
      // Format values (e.g., dates, numbers)
      format: (value, format, lng) => {
        if (format === 'uppercase') return value.toUpperCase();
        if (format === 'lowercase') return value.toLowerCase();
        if (value instanceof Date) {
          return new Intl.DateTimeFormat(lng).format(value);
        }
        return value;
      },
    },
    
    // React-specific options
    react: {
      // Use Suspense for lazy loading
      useSuspense: true,
      
      // Bind i18n instance to component tree
      bindI18n: 'languageChanged',
      bindI18nStore: '',
      
      // Trans component default behavior
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p'],
    },
    
    // Save missing translations to console in development
    saveMissing: import.meta.env.MODE === 'development',
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      if (import.meta.env.MODE === 'development') {
        console.warn(`Missing translation: [${lng}][${ns}] ${key}`);
      }
    },
  });

// Export configured i18n instance
export default i18n;

// Export language helper functions
export const changeLanguage = (lng: string) => {
  return i18n.changeLanguage(lng);
};

export const getCurrentLanguage = () => {
  return i18n.language;
};

export const getSupportedLanguages = () => {
  return ['en', 'es', 'de'];
};

export const getLanguageName = (code: string): string => {
  const names: Record<string, string> = {
    en: 'English',
    es: 'Español',
    de: 'Deutsch',
  };
  return names[code] || code;
};

