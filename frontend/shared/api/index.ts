// Export all types
export * from './types';

// Export API client and utilities
export { apiClient, apiRequest, API_CONFIG } from './client';

// Export services
export { authService } from './auth';
export { profilesService } from './profiles';

// Export React Query hooks
export * from './hooks';

// Export the old api.ts for backward compatibility
export { apiService, tokenManager } from '../api'; 