import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError, ErrorType } from './types';

// API Configuration
if (!import.meta.env.VITE_API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL environment variable is required. Please set it in your .env file.');
}

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
};

// Create axios instance
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    withCredentials: true, // Important for cookies (refresh tokens)
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error) => {
      const originalRequest = error.config;

      // Handle 401 errors (unauthorized) - try to refresh token
      if (error.response?.status === 401 && !originalRequest._retry) {
        console.log('🔄 Axios Interceptor - 401 error detected, attempting token refresh...');
        originalRequest._retry = true;

        try {
          // Try to refresh the token
          console.log('🔄 Axios Interceptor - Calling refresh token endpoint...');
          const refreshResponse = await instance.post('/profiles/refresh-token/');
          const { access } = refreshResponse.data;
          
          console.log('✅ Axios Interceptor - Token refresh successful, storing new token');
          // Store new access token
          localStorage.setItem('access_token', access);
          
          // Retry original request with new token
          console.log('🔄 Axios Interceptor - Retrying original request with new token');
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return instance(originalRequest);
        } catch (refreshError) {
          console.error('❌ Axios Interceptor - Token refresh failed:', refreshError);
          console.log('🔄 Axios Interceptor - Redirecting to login page');
          // Refresh failed, redirect to login
          localStorage.removeItem('access_token');
          window.location.href = '/';
          return Promise.reject(refreshError);
        }
      }

      // Handle other errors
      if (error.response) {
        // Server responded with error status
        let errorMessage = `HTTP error! status: ${error.response.status}`;
        let errorDetail = undefined;

        // Handle Django REST Framework error formats
        if (error.response.data) {
          const data = error.response.data;
          
          // Check for different error formats
          if (data.error) {
            errorMessage = data.error;
          } else if (data.detail) {
            errorMessage = data.detail;
          } else if (typeof data === 'string') {
            errorMessage = data;
          } else if (typeof data === 'object') {
            // Handle validation errors (field-specific errors)
            const fieldErrors = Object.entries(data)
              .map(([field, messages]) => {
                if (Array.isArray(messages)) {
                  return `${field}: ${messages.join(', ')}`;
                } else if (typeof messages === 'string') {
                  return `${field}: ${messages}`;
                }
                return `${field}: ${JSON.stringify(messages)}`;
              })
              .join('; ');
            
            if (fieldErrors) {
              errorMessage = fieldErrors;
            }
          }
          
          errorDetail = data.detail || JSON.stringify(data);
        }

        const apiError: ApiError = {
          error: errorMessage,
          detail: errorDetail,
          status: error.response.status,
        };
        throw apiError;
      } else if (error.request) {
        // Request was made but no response received
        const apiError: ApiError = {
          error: 'Network error - no response received',
          status: 0,
        };
        throw apiError;
      } else {
        // Something else happened
        const apiError: ApiError = {
          error: 'An unexpected error occurred',
          status: 0,
        };
        throw apiError;
      }
    }
  );

  return instance;
};

// Export the configured axios instance
export const apiClient = createAxiosInstance();

// Utility function for making API requests
export const apiRequest = async <T>(
  config: AxiosRequestConfig
): Promise<T> => {
  console.log('🌐 apiRequest: Starting request');
  console.log('🌐 apiRequest: Method:', config.method);
  console.log('🌐 apiRequest: URL:', config.url);
  console.log('🌐 apiRequest: Base URL:', API_CONFIG.baseURL);
  console.log('🌐 apiRequest: Full URL:', `${API_CONFIG.baseURL}${config.url}`);
  console.log('🌐 apiRequest: Data:', config.data);
  console.log('🌐 apiRequest: Headers:', config.headers);
  
  try {
    console.log('🌐 apiRequest: Making request...');
    const response: AxiosResponse<T> = await apiClient(config);
    console.log('✅ apiRequest: Request successful');
    console.log('✅ apiRequest: Response status:', response.status);
    console.log('✅ apiRequest: Response headers:', response.headers);
    console.log('✅ apiRequest: Response data:', response.data);
    console.log('✅ apiRequest: Response data type:', typeof response.data);
    if (Array.isArray(response.data)) {
      console.log('✅ apiRequest: Response data length:', response.data.length);
    }
    return response.data;
  } catch (error) {
    console.error('❌ apiRequest: Request failed');
    console.error('❌ apiRequest: Error:', error);
    console.error('❌ apiRequest: Error type:', typeof error);
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('❌ apiRequest: Error response status:', error.response?.status);
      console.error('❌ apiRequest: Error response data:', error.response?.data);
    }
    throw error;
  }
}; 