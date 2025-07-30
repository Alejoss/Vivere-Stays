# API Structure Documentation

## Overview

This directory contains the organized API structure for the Vivere Stays frontend application, focusing on the onboarding process.

## File Structure

```
frontend/shared/api/
├── index.ts          # Main exports
├── types.ts          # TypeScript interfaces
├── client.ts         # Axios instance & interceptors
├── auth.ts           # Authentication service
├── profiles.ts       # Profile management service
├── hooks.ts          # React Query hooks
└── README.md         # This file
```

## Key Features

### 🔐 Authentication
- JWT token management
- Automatic token refresh
- Secure cookie handling
- Rate limiting protection

### 🎯 Type Safety
- Full TypeScript support
- Request/response type definitions
- Error handling types

### ⚡ React Query Integration
- Automatic caching
- Background refetching
- Optimistic updates
- Error handling

### 🔄 Automatic Token Refresh
- 401 error handling
- Seamless token refresh
- Automatic retry on success

## Usage Examples

### Basic Authentication
```typescript
import { useLogin, useLogout, useCurrentUser } from '../../shared/api';

function LoginComponent() {
  const loginMutation = useLogin();
  const { user, isAuthenticated } = useCurrentUser();

  const handleLogin = async (credentials) => {
    try {
      await loginMutation.mutateAsync(credentials);
      // Redirect on success
    } catch (error) {
      // Handle error
    }
  };
}
```

### Profile Management
```typescript
import { useProfile, useUpdateProfile } from '../../shared/api';

function ProfileComponent() {
  const { data: profile, isLoading } = useProfile();
  const updateMutation = useUpdateProfile();

  const handleUpdate = async (data) => {
    await updateMutation.mutateAsync(data);
  };
}
```

### Direct Service Usage
```typescript
import { authService, profilesService } from '../../shared/api';

// Direct API calls (without React Query)
const user = await authService.login(credentials);
const profile = await profilesService.getProfile();
```

## API Endpoints

### Authentication
- `POST /profiles/login/` - User login
- `POST /profiles/register/` - User registration
- `POST /profiles/logout/` - User logout
- `GET /profiles/check_auth/` - Check authentication status
- `POST /profiles/refresh_token/` - Refresh access token

### Profiles
- `GET /profiles/profile/` - Get user profile
- `PUT /profiles/profile/` - Update user profile
- `GET /profiles/properties/` - Get user properties
- `POST /profiles/properties/associate/` - Manage property associations

## Error Handling

The API client automatically handles:
- Network errors
- Authentication errors (401)
- Server errors
- Token expiration

All errors are converted to consistent `ApiError` format with:
- `error`: Human-readable error message
- `detail`: Technical error details
- `status`: HTTP status code

## Configuration

Environment variables:
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## Next Steps

1. **Registration Integration**: Connect the registration form
2. **Protected Routes**: Add authentication guards
3. **Profile Management**: Implement profile update forms
4. **Property Management**: Add property CRUD operations
5. **Error Boundaries**: Add React error boundaries
6. **Loading States**: Implement skeleton loaders 