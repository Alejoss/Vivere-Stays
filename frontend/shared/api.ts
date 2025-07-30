/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Authentication Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface RegisterResponse {
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  message: string;
}

export interface AuthError {
  error: string;
  detail?: string;
}

// API Service Class
class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  // Authentication Methods
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/profiles/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/profiles/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<void> {
    return this.request<void>('/profiles/logout/', {
      method: 'POST',
    });
  }

  async checkAuth(): Promise<{ is_authenticated: boolean }> {
    return this.request<{ is_authenticated: boolean }>('/profiles/check_auth/');
  }

  async refreshToken(): Promise<{ access: string }> {
    return this.request<{ access: string }>('/profiles/refresh_token/', {
      method: 'POST',
    });
  }

  // Profile Methods
  async getProfile(): Promise<any> {
    return this.request<any>('/profiles/profile/');
  }

  async updateProfile(profileData: any): Promise<any> {
    return this.request<any>('/profiles/profile/', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Utility functions for token management
export const tokenManager = {
  setAccessToken: (token: string) => {
    localStorage.setItem('access_token', token);
  },

  getAccessToken: (): string | null => {
    return localStorage.getItem('access_token');
  },

  removeAccessToken: () => {
    localStorage.removeItem('access_token');
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },
};
