# Login Integration Documentation

## Overview

This document describes the integration between the React frontend and Django backend for user authentication.

## Architecture

### Frontend (React + TypeScript)
- **Location**: `frontend/client/pages/Index.tsx`
- **API Service**: `frontend/shared/api.ts`
- **Authentication Flow**: Login form → API call → Token storage → Navigation

### Backend (Django + DRF)
- **Location**: `backend/profiles/`
- **Authentication**: JWT tokens with refresh tokens in HTTP-only cookies
- **Endpoints**: `/api/profiles/login/`, `/api/profiles/register/`, etc.

## API Endpoints

### Login
- **URL**: `POST /api/profiles/login/`
- **Request Body**:
  ```json
  {
    "username": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 1,
      "username": "user@example.com",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
  ```

### Register
- **URL**: `POST /api/profiles/register/`
- **Request Body**:
  ```json
  {
    "username": "newuser@example.com",
    "email": "newuser@example.com",
    "password": "password123"
  }
  ```

### Check Authentication
- **URL**: `GET /api/profiles/check_auth/`
- **Response**:
  ```json
  {
    "is_authenticated": true
  }
  ```

## Setup Instructions

### 1. Backend Setup
```bash
cd backend
# Install dependencies (if using Docker)
docker-compose up -d

# Or run locally
python manage.py runserver
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Environment Configuration
Create a `.env` file in the frontend directory:
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## Testing the Login

### 1. Create a Test User
First, create a user in Django admin or via the registration endpoint:

```bash
# Using Django shell
python manage.py shell
>>> from django.contrib.auth.models import User
>>> User.objects.create_user(username='test@example.com', email='test@example.com', password='testpass123')
```

### 2. Test Login Flow
1. Navigate to `http://localhost:3000`
2. Enter credentials:
   - Email: `test@example.com`
   - Password: `testpass123`
3. Click "Log in"
4. You should be redirected to `/hotel-information` on success

### 3. Verify Token Storage
Check browser developer tools → Application → Local Storage to see the stored access token.

## Error Handling

The login form handles various error scenarios:
- **Network errors**: "Login failed. Please try again."
- **Invalid credentials**: "Invalid credentials"
- **Rate limiting**: "Too many login attempts. Please try again later."
- **Server errors**: Specific error messages from the backend

## Security Features

### Backend Security
- Rate limiting (5 attempts per 5 minutes per IP)
- JWT tokens with configurable expiration
- HTTP-only cookies for refresh tokens
- CORS configuration for frontend domains

### Frontend Security
- Token storage in localStorage
- Automatic token inclusion in API requests
- Form validation and sanitization

## Next Steps

1. **Registration Integration**: Connect the registration form to the backend
2. **Password Reset**: Implement forgot password functionality
3. **Social Login**: Integrate Google OAuth
4. **Protected Routes**: Add authentication guards to React routes
5. **Token Refresh**: Implement automatic token refresh logic

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure Django CORS settings include your frontend URL
2. **Token Not Stored**: Check browser console for JavaScript errors
3. **Login Fails**: Verify backend is running and database is accessible
4. **Redirect Issues**: Check React Router configuration

### Debug Mode
Enable debug logging in Django settings:
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'profiles': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
``` 