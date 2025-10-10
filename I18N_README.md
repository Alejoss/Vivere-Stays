# Internationalization (i18n) Implementation Guide
## Vivere Stays - Multi-Language Support (English, Spanish, German)

**Version:** 1.1 | **Last Updated:** October 8, 2025

---

## 📋 Table of Contents

1. [Overview & Strategy](#overview--strategy)
2. [Hybrid Approach Explained](#hybrid-approach-explained)
3. [Frontend Implementation](#frontend-implementation)
4. [Backend Implementation](#backend-implementation)
5. [Decision Matrix](#decision-matrix)
6. [Code Examples](#code-examples)
7. [Testing & Troubleshooting](#testing--troubleshooting)

---

## Overview & Strategy

This document describes the complete internationalization implementation for Vivere Stays to support **English (en)**, **Spanish (es)**, and **German (de)**.

### Our Approach: Clean Separation Strategy

We use a **clean separation approach** where each layer handles what it controls:

**Frontend Translation (react-i18next)** - Everything users see in the UI:
- ✅ All UI text (labels, buttons, navigation, tooltips)
- ✅ All error messages (from backend error codes)
- ✅ All success messages (toast notifications)
- ✅ Form labels, placeholders, help text

**Backend Translation (Django i18n)** - Only email templates:
- ✅ Email subject lines
- ✅ Email body content (HTML templates)
- ✅ Email-specific formatting

**Backend Error Codes** - Structured validation responses:
- ✅ Type-safe error codes (e.g., `EMAIL_ALREADY_EXISTS`)
- ✅ Frontend translates codes to user's language
- ✅ No translated messages from backend API

### Why This Clean Separation?

| Traditional Approach | Our Approach | Result |
|---------------------|--------------|--------|
| Backend translates everything | Backend: emails only, Frontend: UI | ✅ Clear responsibilities |
| Backend sends translated messages | Backend sends error codes | ✅ Type safety with TypeScript |
| Same message everywhere | Frontend controls all UI text | ✅ Context-specific messages |
| Backend needs user language | Frontend manages its own language | ✅ Simpler backend logic |
| Complex backend i18n setup | Minimal backend translation | ✅ Faster backend development |

### Real-World Examples

**Example 1: Validation Error**
```
User submits registration with existing email
    ↓
Backend: Validates, returns {"code": "EMAIL_ALREADY_EXISTS"}
    ↓
Frontend: Translates code based on context
    • Registration page: "This email is already registered. Try logging in instead."
    • Profile page: "This email is in use. Please choose a different one."
    ↓
Spanish: "Este correo ya está registrado. Intente iniciar sesión."
German: "Diese E-Mail ist bereits registriert. Versuchen Sie sich anzumelden."
```

**Example 2: Success Message (Toast)**
```
User creates a property successfully
    ↓
Backend: Returns {"success": true, "data": {...}}
    ↓
Frontend: Shows toast with translated message
    • English: "Property created successfully!"
    • Spanish: "¡Propiedad creada exitosamente!"
    • German: "Unterkunft erfolgreich erstellt!"
```

**Example 3: Email Template**
```
User registers for account
    ↓
Backend: Detects language from request header (X-Language: es)
    ↓
Backend: Renders email_templates/templates/es/welcome_email.html
    ↓
Email sent in Spanish with proper formatting
```

### Technology Stack

**Frontend:**
- `react-i18next` - Industry standard React i18n library
- Namespace-based JSON files - Organized by feature/page
- TypeScript enums - Type-safe error codes
- Lazy loading - Only load needed translations

**Backend:**
- Django's native i18n - For email templates only
- Language-specific template directories - Organized by language
- Python Enum - Centralized error codes
- Custom DRF exception handler - Structured error responses

---

## Why Not Standard Django i18n?

### Traditional Django i18n (What We're NOT Doing)

In traditional Django applications, you would use Django's built-in i18n system with `LocaleMiddleware`:

```python
# Traditional approach
from django.utils.translation import gettext as _

class UserSerializer(serializers.Serializer):
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            # Backend translates message based on request language
            raise ValidationError(_("A user with that email already exists."))
```

**Problems with this for modern SPAs:**
- ❌ Backend must track user's language preference for every API request
- ❌ Same error message everywhere (can't customize by context in frontend)
- ❌ No type safety - just strings passed around
- ❌ Requires Django's LocaleMiddleware and Accept-Language header parsing
- ❌ Doesn't work well with mobile apps (iOS/Android have their own localization)
- ❌ Frontend has no control over message formatting

### Our API-First Approach (What We ARE Doing)

Instead, we use an **error code pattern** common in modern REST APIs:

```python
# Our approach
class UserSerializer(serializers.Serializer):
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            # Backend sends structured error CODE, not translated message
            raise ValidationError(
                "Email exists",  # Debug message for logs
                code=ErrorCode.EMAIL_ALREADY_EXISTS  # Frontend translates this
            )
```

**Benefits for SPAs:**
- ✅ **Type Safety**: TypeScript enums prevent typos and enable autocomplete
- ✅ **Context-Specific**: Different messages for registration vs profile update
- ✅ **Simpler Backend**: No need to track user language or use LocaleMiddleware
- ✅ **Multi-Platform**: Works with web, iOS, Android (each translates codes natively)
- ✅ **Consistent Format**: All errors follow same structure
- ✅ **Better DX**: Frontend developers control all UI text

### Why We Need the Custom Exception Handler

Django REST Framework's default error format is inconsistent:

```json
// DRF Default - Hard to parse consistently
{
  "email": ["A user with that email already exists."],
  "password": ["This field is required."],
  "non_field_errors": ["Invalid credentials"]
}
```

Our custom exception handler standardizes this:

```json
// Our Format - Consistent, structured, with error codes
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
      "code": "FIELD_REQUIRED",
      "debug_message": "This field is required."
    }
  ]
}
```

This transforms DRF's default response into a consistent, type-safe format that frontend can easily handle.

### Industry Standard

This pattern is used by major REST APIs:
- **Stripe API**: Returns error codes like `card_declined`, `invalid_request`
- **GitHub API**: Returns structured error responses with `code` fields
- **AWS APIs**: Use error codes like `InvalidParameterValue`, `ResourceNotFound`

It's not "standard Django," but it's **standard for modern API design** with SPAs and mobile apps.

---

## Translation Responsibility Matrix

### What Gets Translated Where

| Content Type | Frontend (i18next) | Backend (Django i18n) | Notes |
|--------------|-------------------|----------------------|-------|
| **Form validation errors** | ✅ Yes (error codes) | ❌ No | Backend sends codes, frontend translates |
| **Success messages** | ✅ Yes (toast messages) | ❌ No | Frontend shows predefined translated toasts |
| **UI labels & buttons** | ✅ Yes | ❌ No | All React components handle their own text |
| **Navigation menus** | ✅ Yes | ❌ No | Sidebar, header, all UI navigation |
| **Form placeholders** | ✅ Yes | ❌ No | All input hints and examples |
| **Error messages** | ✅ Yes | ❌ No | From error codes sent by backend |
| **Email templates** | ❌ No | ✅ Yes | Server-side rendered, sent by backend |
| **Email subject lines** | ❌ No | ✅ Yes | Part of email sending |
| **Model labels** | ✅ Yes | ❌ No | React components define all labels |
| **Help text & tooltips** | ✅ Yes | ❌ No | All UI hints are frontend |

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│  VALIDATION ERROR                                            │
│                                                              │
│  Backend → Returns: {"code": "EMAIL_ALREADY_EXISTS"}        │
│  Frontend → Translates code to: "Email already registered"  │
│  Display → User sees error in their language                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SUCCESS MESSAGE (Toast)                                     │
│                                                              │
│  Backend → Returns: {"success": true, "data": {...}}        │
│  Frontend → Shows toast: t('messages.propertyCreated')       │
│  Display → "¡Propiedad creada exitosamente!"               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  EMAIL TEMPLATE                                              │
│                                                              │
│  Backend → Detects language: X-Language: es                  │
│  Backend → Renders: templates/es/welcome_email.html         │
│  Email → Sent in Spanish with proper formatting             │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Implementation

**Note:** This project uses a modular API structure located in `frontend/shared/api/`:
- `client.ts` - Axios instance with interceptors
- `auth.ts`, `profiles.ts`, `analytics.ts` - Service modules
- `hooks.ts` - React Query hooks
- `types.ts` - TypeScript interfaces

All API calls use the centralized `apiClient` from `client.ts`, which automatically adds authentication tokens and will also add language headers.

### Step 1: Install Dependencies (5 minutes)

```bash
cd frontend
npm install i18next react-i18next i18next-browser-languagedetector i18next-http-backend
```

### Step 2: Configure i18next (10 minutes)

Create `frontend/client/i18n.ts`:

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    supportedLngs: ['en', 'es', 'de'],
    
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    
    ns: ['common', 'auth', 'dashboard', 'errors'],
    defaultNS: 'common',
  });

export default i18n;
```

Initialize in `frontend/client/App.tsx`:

```typescript
import React, { Suspense } from 'react';
import './i18n'; // Import i18n configuration

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* Your app */}
    </Suspense>
  );
}
```

### Step 3: Create Error Code Types (15 minutes)

Create `frontend/shared/api/errorCodes.ts`:

```typescript
export enum ErrorCode {
  // Authentication
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_REQUIRED = 'EMAIL_REQUIRED',
  PASSWORD_REQUIRED = 'PASSWORD_REQUIRED',
  PASSWORD_TOO_SHORT = 'PASSWORD_TOO_SHORT',
  
  // Registration
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS = 'USERNAME_ALREADY_EXISTS',
  INVALID_EMAIL = 'INVALID_EMAIL',
  
  // Property
  PROPERTY_NOT_FOUND = 'PROPERTY_NOT_FOUND',
  PROPERTY_NAME_REQUIRED = 'PROPERTY_NAME_REQUIRED',
  
  // General
  FIELD_REQUIRED = 'FIELD_REQUIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  SERVER_ERROR = 'SERVER_ERROR',
}

export interface ApiError {
  field?: string;
  code?: ErrorCode;
  message?: string;
  debug_message?: string;
}

export interface ApiErrorResponse {
  success: false;
  errors: ApiError[];
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  message?: string;
  data?: T;
}
```

### Step 4: Create Error Display Component (15 minutes)

Create `frontend/client/components/ErrorMessage.tsx`:

```typescript
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../shared/api/errorCodes';

interface ErrorMessageProps {
  error: ApiError | string;
  className?: string;
}

export default function ErrorMessage({ error, className = '' }: ErrorMessageProps) {
  const { t } = useTranslation('errors');
  
  if (typeof error === 'string') {
    return <div className={`text-red-600 text-sm ${className}`}>{error}</div>;
  }
  
  const message = error.code 
    ? t(error.code, { defaultValue: error.message || 'An error occurred' })
    : error.message || 'An error occurred';
  
  return (
    <div className={`flex items-center gap-2 text-red-600 text-sm ${className}`}>
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 10.9747C8.11644 10.9747 8.214 10.9353 8.29267 10.8567C8.37089 10.778 8.41 10.6804 8.41 10.564C8.41 10.448 8.37067 10.3507 8.292 10.272C8.21333 10.1933 8.116 10.1538 8 10.1533C7.884 10.1529 7.78667 10.1922 7.708 10.2713C7.62933 10.3504 7.59 10.4478 7.59 10.5633C7.59 10.6789 7.62933 10.7764 7.708 10.856C7.78667 10.9356 7.884 10.9756 8 10.9747ZM7.66667 8.76867H8.33333V4.76867H7.66667V8.76867ZM8.002 14C7.17267 14 6.39267 13.8427 5.662 13.528C4.93178 13.2129 4.29644 12.7853 3.756 12.2453C3.21556 11.7053 2.78778 11.0707 2.47267 10.3413C2.15756 9.612 2 8.83222 2 8.002C2 7.17178 2.15756 6.39178 2.47267 5.662C2.78733 4.93178 3.21422 4.29644 3.75333 3.756C4.29244 3.21556 4.92733 2.78778 5.658 2.47267C6.38867 2.15756 7.16867 2 7.998 2C8.82733 2 9.60733 2.15756 10.338 2.47267C11.0682 2.78733 11.7036 3.21444 12.244 3.754C12.7844 4.29356 13.2122 4.92844 13.5273 5.65867C13.8424 6.38889 14 7.16867 14 7.998C14 8.82733 13.8427 9.60733 13.528 10.338C13.2133 11.0687 12.7858 11.704 12.2453 12.244C11.7049 12.784 11.0702 13.2118 10.3413 13.5273C9.61244 13.8429 8.83267 14.0004 8.002 14ZM8 13.3333C9.48889 13.3333 10.75 12.8167 11.7833 11.7833C12.8167 10.75 13.3333 9.48889 13.3333 8C13.3333 6.51111 12.8167 5.25 11.7833 4.21667C10.75 3.18333 9.48889 2.66667 8 2.66667C6.51111 2.66667 5.25 3.18333 4.21667 4.21667C3.18333 5.25 2.66667 6.51111 2.66667 8C2.66667 9.48889 3.18333 10.75 4.21667 11.7833C5.25 12.8167 6.51111 13.3333 8 13.3333Z"/>
      </svg>
      <span>{message}</span>
    </div>
  );
}
```

### Step 5: Create Translation Files (30 minutes)

**Directory Structure:**
```
frontend/public/locales/
├── en/
│   ├── common.json      # Buttons, navigation, success messages
│   ├── auth.json        # Authentication pages
│   ├── dashboard.json   # Dashboard-specific text
│   └── errors.json      # Error codes
├── es/
│   ├── common.json
│   ├── auth.json
│   ├── dashboard.json
│   └── errors.json
└── de/
    ├── common.json
    ├── auth.json
    ├── dashboard.json
    └── errors.json
```

**frontend/public/locales/en/common.json:**
```json
{
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirm": "Confirm",
    "submit": "Submit"
  },
  "messages": {
    "loading": "Loading...",
    "saving": "Saving...",
    "propertyCreated": "Property created successfully!",
    "propertyUpdated": "Property updated successfully!",
    "propertyDeleted": "Property deleted successfully!",
    "changesSaved": "Changes saved successfully!",
    "accountUpdated": "Account updated successfully!",
    "emailSent": "Email sent successfully!",
    "passwordReset": "Password reset successfully!"
  }
}
```

**frontend/public/locales/es/common.json:**
```json
{
  "buttons": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "confirm": "Confirmar",
    "submit": "Enviar"
  },
  "messages": {
    "loading": "Cargando...",
    "saving": "Guardando...",
    "propertyCreated": "¡Propiedad creada exitosamente!",
    "propertyUpdated": "¡Propiedad actualizada exitosamente!",
    "propertyDeleted": "¡Propiedad eliminada exitosamente!",
    "changesSaved": "¡Cambios guardados exitosamente!",
    "accountUpdated": "¡Cuenta actualizada exitosamente!",
    "emailSent": "¡Correo enviado exitosamente!",
    "passwordReset": "¡Contraseña restablecida exitosamente!"
  }
}
```

**frontend/public/locales/de/common.json:**
```json
{
  "buttons": {
    "save": "Speichern",
    "cancel": "Abbrechen",
    "delete": "Löschen",
    "confirm": "Bestätigen",
    "submit": "Absenden"
  },
  "messages": {
    "loading": "Lädt...",
    "saving": "Speichert...",
    "propertyCreated": "Unterkunft erfolgreich erstellt!",
    "propertyUpdated": "Unterkunft erfolgreich aktualisiert!",
    "propertyDeleted": "Unterkunft erfolgreich gelöscht!",
    "changesSaved": "Änderungen erfolgreich gespeichert!",
    "accountUpdated": "Konto erfolgreich aktualisiert!",
    "emailSent": "E-Mail erfolgreich gesendet!",
    "passwordReset": "Passwort erfolgreich zurückgesetzt!"
  }
}
```

**frontend/public/locales/en/errors.json:**
```json
{
  "INVALID_CREDENTIALS": "Invalid email or password",
  "EMAIL_REQUIRED": "Email is required",
  "PASSWORD_REQUIRED": "Password is required",
  "PASSWORD_TOO_SHORT": "Password must be at least 8 characters",
  "EMAIL_ALREADY_EXISTS": "An account with this email already exists",
  "USERNAME_ALREADY_EXISTS": "This username is already taken",
  "INVALID_EMAIL": "Please enter a valid email address",
  "PROPERTY_NOT_FOUND": "Property not found",
  "FIELD_REQUIRED": "This field is required",
  "UNAUTHORIZED": "You must be logged in",
  "SERVER_ERROR": "An unexpected error occurred"
}
```

**frontend/public/locales/es/errors.json:**
```json
{
  "INVALID_CREDENTIALS": "Correo electrónico o contraseña inválidos",
  "EMAIL_REQUIRED": "El correo electrónico es obligatorio",
  "PASSWORD_REQUIRED": "La contraseña es obligatoria",
  "PASSWORD_TOO_SHORT": "La contraseña debe tener al menos 8 caracteres",
  "EMAIL_ALREADY_EXISTS": "Ya existe una cuenta con este correo electrónico",
  "USERNAME_ALREADY_EXISTS": "Este nombre de usuario ya está en uso",
  "INVALID_EMAIL": "Por favor ingrese un correo electrónico válido",
  "PROPERTY_NOT_FOUND": "Propiedad no encontrada",
  "FIELD_REQUIRED": "Este campo es obligatorio",
  "UNAUTHORIZED": "Debe iniciar sesión",
  "SERVER_ERROR": "Ocurrió un error inesperado"
}
```

**frontend/public/locales/de/errors.json:**
```json
{
  "INVALID_CREDENTIALS": "Ungültige E-Mail oder Passwort",
  "EMAIL_REQUIRED": "E-Mail ist erforderlich",
  "PASSWORD_REQUIRED": "Passwort ist erforderlich",
  "PASSWORD_TOO_SHORT": "Passwort muss mindestens 8 Zeichen lang sein",
  "EMAIL_ALREADY_EXISTS": "Ein Konto mit dieser E-Mail existiert bereits",
  "USERNAME_ALREADY_EXISTS": "Dieser Benutzername ist bereits vergeben",
  "INVALID_EMAIL": "Bitte geben Sie eine gültige E-Mail-Adresse ein",
  "PROPERTY_NOT_FOUND": "Unterkunft nicht gefunden",
  "FIELD_REQUIRED": "Dieses Feld ist erforderlich",
  "UNAUTHORIZED": "Sie müssen angemeldet sein",
  "SERVER_ERROR": "Ein unerwarteter Fehler ist aufgetreten"
}
```

### Step 6: Add Language Header to API Calls (5 minutes)

Update `frontend/shared/api/client.ts` request interceptor:

```typescript
// Add to the existing request interceptor in createAxiosInstance()
instance.interceptors.request.use(
  (config) => {
    // Existing auth token code
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add language headers for i18n support
    // Import i18n at top: import i18n from '../../client/i18n';
    const language = i18n.language || 'en';
    config.headers['X-Language'] = language;
    config.headers['Accept-Language'] = language;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

---

## Backend Implementation

### Step 1: Create Error Codes (15 minutes)

Create `backend/vivere_stays/error_codes.py`:

```python
from enum import Enum

class ErrorCode(str, Enum):
    """
    Centralized error codes for API responses.
    These codes are translated on the frontend.
    """
    # Authentication
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    EMAIL_REQUIRED = "EMAIL_REQUIRED"
    PASSWORD_REQUIRED = "PASSWORD_REQUIRED"
    PASSWORD_TOO_SHORT = "PASSWORD_TOO_SHORT"
    
    # Registration
    EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS"
    USERNAME_ALREADY_EXISTS = "USERNAME_ALREADY_EXISTS"
    INVALID_EMAIL = "INVALID_EMAIL"
    
    # Property
    PROPERTY_NOT_FOUND = "PROPERTY_NOT_FOUND"
    PROPERTY_NAME_REQUIRED = "PROPERTY_NAME_REQUIRED"
    
    # General
    FIELD_REQUIRED = "FIELD_REQUIRED"
    UNAUTHORIZED = "UNAUTHORIZED"
    SERVER_ERROR = "SERVER_ERROR"
```

### Step 2: Create Custom Exception Handler (20 minutes)

Create `backend/vivere_stays/error_handler.py`:

```python
from rest_framework.views import exception_handler
from rest_framework.response import Response

def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns structured error responses
    with error codes for frontend translation.
    """
    response = exception_handler(exc, context)
    
    if response is not None:
        custom_response = {
            'success': False,
            'errors': []
        }
        
        if isinstance(response.data, dict):
            for field, errors in response.data.items():
                for error in errors if isinstance(errors, list) else [errors]:
                    error_dict = {
                        'field': field if field != 'non_field_errors' else None
                    }
                    
                    # Check if error has a code
                    if hasattr(error, 'code') and error.code:
                        error_dict['code'] = error.code
                        error_dict['debug_message'] = str(error)
                    else:
                        # Fallback: send message directly
                        error_dict['message'] = str(error)
                    
                    custom_response['errors'].append(error_dict)
        
        return Response(custom_response, status=response.status_code)
    
    return response
```

### Step 3: Update Django Settings (5 minutes)

Update `backend/vivere_stays/settings.py`:

```python
import os

# Email template directories (for language-specific templates)
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(BASE_DIR, 'email_templates/templates'),
        ],
        'APP_DIRS': True,
        # ... rest of template config
    },
]

# Add custom exception handler for error codes
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'vivere_stays.error_handler.custom_exception_handler',
    # ... other settings
}

# Note: LocaleMiddleware is NOT needed since we don't translate API responses
# We only translate email templates, which are handled in email_service.py
```

### Step 4: Update Serializers with Error Codes (30 minutes)

Update `backend/profiles/serializers.py`:

```python
from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _
from vivere_stays.error_codes import ErrorCode

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        error_messages={
            'required': ErrorCode.PASSWORD_REQUIRED,
            'blank': ErrorCode.PASSWORD_REQUIRED
        }
    )
    email = serializers.EmailField(
        required=True,
        error_messages={
            'required': ErrorCode.EMAIL_REQUIRED,
            'invalid': ErrorCode.INVALID_EMAIL
        }
    )
    
    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name', 'last_name')
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "A user with that email already exists.",
                code=ErrorCode.EMAIL_ALREADY_EXISTS
            )
        return value
    
    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError(
                "Password must be at least 8 characters.",
                code=ErrorCode.PASSWORD_TOO_SHORT
            )
        return value
```

### Step 5: Update Views (Simple Success Response) (10 minutes)

Update `backend/profiles/views.py`:

```python
from rest_framework.views import APIView
from rest_framework.response import Response

class UserRegistrationView(APIView):
    permission_classes = []
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            
            # Simple success response - no message
            # Frontend will show translated toast message
            return Response({
                'success': True,
                'data': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            }, status=201)
        
        # Validation errors handled by error_handler with codes
        return Response(serializer.errors, status=400)
```

### Step 6: Create Email Templates (30 minutes)

**Directory Structure:**
```
backend/email_templates/templates/
├── en/
│   ├── welcome_email.html
│   ├── email_verification.html
│   └── password_reset.html
├── es/
│   ├── welcome_email.html
│   ├── email_verification.html
│   └── password_reset.html
└── de/
    ├── welcome_email.html
    ├── email_verification.html
    └── password_reset.html
```

**Email Service with Language Detection:**

Create `backend/profiles/email_service.py`:

```python
from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.conf import settings

def send_welcome_email(user, language='en'):
    """
    Send welcome email in user's preferred language
    """
    # Build template path with language
    template_path = f'email_templates/templates/{language}/welcome_email.html'
    
    # Render HTML content
    html_content = render_to_string(template_path, {
        'user_name': user.first_name or user.username,
        'support_email': settings.DEFAULT_FROM_EMAIL,
        'portal_url': settings.FRONTEND_URL,
    })
    
    # Email subjects by language
    subjects = {
        'en': 'Welcome to Vivere Stays!',
        'es': '¡Bienvenido a Vivere Stays!',
        'de': 'Willkommen bei Vivere Stays!',
    }
    
    send_mail(
        subject=subjects.get(language, subjects['en']),
        message='',  # Plain text version
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_content,
    )

def send_verification_email(user, verification_code, language='en'):
    """
    Send email verification code in user's language
    """
    template_path = f'email_templates/templates/{language}/email_verification.html'
    
    html_content = render_to_string(template_path, {
        'user_name': user.first_name or user.username,
        'verification_code': verification_code,
        'support_email': settings.DEFAULT_FROM_EMAIL,
    })
    
    subjects = {
        'en': 'Verify Your Email',
        'es': 'Verifique su Correo Electrónico',
        'de': 'Verifizieren Sie Ihre E-Mail',
    }
    
    send_mail(
        subject=subjects.get(language, subjects['en']),
        message='',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_content,
    )
```

**Using in Views:**

```python
from profiles.email_service import send_welcome_email

class UserRegistrationView(APIView):
    def post(self, request):
        # Get language from header
        language = request.META.get('HTTP_X_LANGUAGE', 'en')
        
        serializer = UserRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            
            # Send welcome email in user's language
            send_welcome_email(user, language=language)
            
            return Response({
                'success': True,
                'data': {'id': user.id, 'email': user.email}
            }, status=201)
        
        return Response(serializer.errors, status=400)
```

---

## Decision Matrix

### Quick Reference: What Goes Where

```
┌─────────────────────────────────────────────────────────────┐
│  VALIDATION ERROR                                            │
│  ↓                                                           │
│  Backend: Returns {"code": "EMAIL_ALREADY_EXISTS"}          │
│  Frontend: Translates code → "Email already registered"     │
│  ✅ FRONTEND TRANSLATION (error codes)                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SUCCESS MESSAGE (Toast)                                     │
│  ↓                                                           │
│  Backend: Returns {"success": true, "data": {...}}          │
│  Frontend: Shows toast → t('messages.propertyCreated')       │
│  ✅ FRONTEND TRANSLATION (predefined messages)              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  EMAIL TEMPLATE                                              │
│  ↓                                                           │
│  Backend: Renders templates/es/welcome_email.html           │
│  Email sent with translated subject and body                │
│  ✅ BACKEND TRANSLATION (email templates only)              │
└─────────────────────────────────────────────────────────────┘
```

### Practical Examples

**✅ Error Code - Context-Specific:**
```typescript
// Registration page
<ErrorMessage error={{code: 'EMAIL_ALREADY_EXISTS'}} />
// → "This email is already registered. Try logging in instead."

// Profile update page
<ErrorMessage error={{code: 'EMAIL_ALREADY_EXISTS'}} />
// → "This email is in use. Please choose a different one."
```

**✅ Success Toast:**
```typescript
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/shared/api/client';

function CreateProperty() {
  const { t } = useTranslation('common');
  
  const handleSubmit = async () => {
    const response = await apiClient.post('/api/properties/', data);
    if (response.data.success) {
      toast.success(t('messages.propertyCreated'));
      // English: "Property created successfully!"
      // Spanish: "¡Propiedad creada exitosamente!"
      // German: "Unterkunft erfolgreich erstellt!"
    }
  };
}
```

**✅ Email Template:**
```python
# Backend sends email in user's language
send_welcome_email(user, language='es')
# Renders: email_templates/templates/es/welcome_email.html
# Subject: "¡Bienvenido a Vivere Stays!"
```

---

## Code Examples

### Using ErrorMessage Component

```typescript
import ErrorMessage from '@/components/ErrorMessage';
import { ApiErrorResponse } from '@/shared/api/errorCodes';
import { apiClient } from '@/shared/api/client';

function RegisterForm() {
  const [errors, setErrors] = useState<ApiErrorResponse | null>(null);
  
  const handleSubmit = async (data) => {
    try {
      await apiClient.post('/profiles/register/', data);
    } catch (error: any) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data);
      }
    }
  };
  
  const getFieldError = (fieldName: string) => {
    return errors?.errors.find(err => err.field === fieldName);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input type="email" name="email" />
      {getFieldError('email') && (
        <ErrorMessage error={getFieldError('email')!} />
      )}
      
      <input type="password" name="password" />
      {getFieldError('password') && (
        <ErrorMessage error={getFieldError('password')!} />
      )}
    </form>
  );
}
```

### Using Translation in Components

```typescript
import { useTranslation } from 'react-i18next';

function Login() {
  const { t } = useTranslation('auth');
  
  return (
    <div>
      <h1>{t('login.title')}</h1>
      <p>{t('login.subtitle')}</p>
      <button>{t('login.loginButton')}</button>
    </div>
  );
}
```

### Success Toast Messages

```typescript
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/shared/api/client';

function PropertyForm() {
  const { t } = useTranslation('common');
  
  const handleCreate = async (data) => {
    try {
      const response = await apiClient.post('/api/properties/', data);
      
      if (response.data.success) {
        // Show translated success toast
        toast.success(t('messages.propertyCreated'));
        navigate('/dashboard/properties');
      }
    } catch (error: any) {
      if (error.response?.data?.errors) {
        // Handle error codes (shown earlier)
        setErrors(error.response.data);
      }
    }
  };
  
  return (
    <form onSubmit={handleSubmit(handleCreate)}>
      {/* Form fields */}
    </form>
  );
}
```

### Backend View (Clean Separation)

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from profiles.email_service import send_welcome_email

class PropertyCreateView(APIView):
    def post(self, request):
        # Get language for email
        language = request.META.get('HTTP_X_LANGUAGE', 'en')
        
        serializer = PropertySerializer(data=request.data)
        
        if serializer.is_valid():
            property = serializer.save()
            
            # Send email in user's language (if needed)
            # send_welcome_email(request.user, language=language)
            
            # Simple success response - no translated message
            # Frontend handles success toast
            return Response({
                'success': True,
                'data': serializer.data
            }, status=201)
        
        # Validation errors handled by error_handler with codes
        return Response(serializer.errors, status=400)
```

---

## Testing & Troubleshooting

### Testing Frontend

```bash
cd frontend
npm run dev

# Open http://localhost:8080
# 1. Check language switcher appears
# 2. Switch languages and verify text changes
# 3. Check localStorage for 'i18nextLng' key
# 4. Submit form and verify error messages translate
```

### Testing Backend

```bash
cd backend
python manage.py runserver

# Test with curl
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -H "X-Language: es" \
  -d '{"username":"test","email":"existing@test.com","password":"short"}'

# Should return:
# {
#   "success": false,
#   "errors": [
#     {
#       "field": "email",
#       "code": "EMAIL_ALREADY_EXISTS"
#     },
#     {
#       "field": "password",
#       "code": "PASSWORD_TOO_SHORT"
#     }
#   ]
# }
```

### Common Issues

**Issue: Translations not loading**
- ✅ Check files exist in `public/locales/`
- ✅ Verify namespace is correct in `useTranslation('namespace')`
- ✅ Check browser console for errors

**Issue: Error codes not working**
- ✅ Verify error_handler.py is in settings.py
- ✅ Check that ErrorCode enum matches frontend
- ✅ Verify serializers use `code=ErrorCode.XXX`

**Issue: Success messages not showing**
- ✅ Check toast library is installed (sonner)
- ✅ Verify translation keys exist in common.json
- ✅ Check `t('messages.propertyCreated')` matches JSON structure

**Issue: Email templates not in correct language**
- ✅ Verify language header is sent: `X-Language: es`
- ✅ Check template path: `templates/{language}/welcome_email.html`
- ✅ Verify template files exist for all languages

**Issue: Layout breaking with German**
- ✅ Use flexible CSS (min-width, max-width)
- ✅ Add text-overflow: ellipsis
- ✅ Test with longest German words

---

## Best Practices

### Error Code Synchronization

**Critical:** Keep backend and frontend error codes synchronized!

1. **Single Source:** Define all codes in one place per platform
2. **Code Review:** Always review code additions in both places
3. **Testing:** Add tests for each error code
4. **Fallback:** Always include fallback message

```typescript
// Frontend with fallback
const message = error.code 
  ? t(`errors.${error.code}`, { 
      defaultValue: error.message || 'An error occurred' 
    })
  : error.message || 'An error occurred';
```

### When to Add New Error Codes

**DO add codes for:**
- ✅ New validation rules
- ✅ New authentication errors
- ✅ User-facing business logic errors

**DON'T add codes for:**
- ❌ System errors (500) - use generic SERVER_ERROR
- ❌ Network timeouts - handle at HTTP level
- ❌ Debug errors - log them, don't show users

### Translation File Organization

```
frontend/public/locales/
├── en/
│   ├── common.json      # Buttons, navigation, common UI
│   ├── auth.json        # Login, register, forgot password
│   ├── dashboard.json   # Dashboard-specific strings
│   ├── errors.json      # Error codes only
│   └── onboarding.json  # Onboarding flow
```

---

## Summary

### What You Get

✅ **Type-Safe Errors:** TypeScript enums prevent typos  
✅ **Clean Separation:** Frontend handles UI, backend handles emails only  
✅ **Flexible Messages:** Different contexts, different messages  
✅ **Simpler Backend:** No complex i18n setup, just email templates  
✅ **Multi-Client Ready:** Works with web, mobile, desktop  
✅ **Professional UX:** Native language experience for users  

### Implementation Effort

The clean separation approach provides a simple architecture with fast implementation:

- **Initial Setup:** 1-2 days (error codes, exception handler, i18n config)
- **Frontend Development:** 2-3 weeks (all UI translations, error codes, success messages)
- **Backend Development:** 3-5 days (error codes in serializers, email templates)
- **Testing & QA:** 1 week (all languages, edge cases, layout)

**Key Simplification:** Backend only handles email templates, not API response messages. This significantly reduces backend work and complexity.

### Cost Estimate

- **Development:** 120-180 hours (significantly reduced backend work)
  - Frontend: 80-100 hours (all UI, errors, success messages)
  - Backend: 20-40 hours (error codes, email templates only)
  - Testing: 20-40 hours (comprehensive testing)
- **Translation Services:** $600-1,800 for professional translation (or use in-house team)
- **Ongoing Maintenance:** 2-4 hours/month for new features and updates

**Cost Savings:** By eliminating backend API message translation, we reduce development time by ~30-40% compared to traditional approaches.

---

## Quick Commands Reference

```bash
# Frontend Setup
cd frontend
npm install i18next react-i18next i18next-browser-languagedetector i18next-http-backend
npm run dev

# Backend Setup
cd backend
# Create email template directories
mkdir -p email_templates/templates/{en,es,de}
# Create error codes
touch vivere_stays/error_codes.py
touch vivere_stays/error_handler.py
python manage.py runserver

# Test Frontend Translations
# Open browser: http://localhost:8080
# Switch languages and verify text changes

# Test Backend Error Codes
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -H "X-Language: es" \
  -d '{"username":"test","email":"existing@test.com","password":"short"}'
# Should return error codes that frontend translates

# Test Email Templates
# Trigger email in code, check language used in send_welcome_email(user, language='es')
```

---

**Ready to implement?** Follow the implementation sections above and start with the setup steps! 🚀

**Key Principles:**
- ✅ Frontend handles ALL user-facing text (UI, errors, success messages)
- ✅ Backend sends error codes, not translated messages
- ✅ Backend only translates email templates
- ✅ Clean separation = simpler maintenance

For questions or issues, refer to:
- **Frontend errors** → Check `errors.json` translations and error code enum
- **Success messages** → Check `common.json` messages section
- **Email language** → Verify language header and template paths
- **Layout issues** → Test with German (longest words)
- **Translation quality** → Review with native speakers
