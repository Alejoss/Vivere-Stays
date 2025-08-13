import { apiRequest } from './client';
import { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RegisterResponse,
  UserData 
} from './types';

// Authentication Service
export const authService = {
  /**
   * Check if user exists
   */
  async checkUserExists(email?: string, username?: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>({
      method: 'POST',
      url: '/profiles/check_user_exists/',
      data: { email, username },
    });
  },

  /**
   * Login user with credentials
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiRequest<LoginResponse>({
      method: 'POST',
      url: '/profiles/login/',
      data: credentials,
    });

    // Store access token
    localStorage.setItem('access_token', response.access);
    
    return response;
  },

  /**
   * Register new user
   */
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiRequest<RegisterResponse>({
      method: 'POST',
      url: '/profiles/register/',
      data: userData,
    });

    // Store access token if provided
    if (response.access) {
      localStorage.setItem('access_token', response.access);
    }
    
    return response;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiRequest<void>({
        method: 'POST',
        url: '/profiles/logout/',
      });
    } finally {
      // Always clear local storage even if API call fails
      localStorage.removeItem('access_token');
    }
  },

  /**
   * Check if user is authenticated
   */
  async checkAuth(): Promise<{ is_authenticated: boolean }> {
    return apiRequest<{ is_authenticated: boolean }>({
      method: 'GET',
      url: '/profiles/check_auth/',
    });
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<{ access: string }> {
    const response = await apiRequest<{ access: string }>({
      method: 'POST',
      url: '/profiles/refresh_token/',
    });

    // Store new access token
    localStorage.setItem('access_token', response.access);
    
    return response;
  },

  /**
   * Get current user data from token
   */
  getCurrentUser(): UserData | null {
    const token = localStorage.getItem('access_token');
    if (!token) return null;

    try {
      // Decode JWT token to get user info
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.user_id,
        username: payload.username,
        email: payload.email,
        first_name: payload.first_name || '',
        last_name: payload.last_name || '',
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },

  /**
   * Check if user is authenticated locally
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    if (!token) return false;

    try {
      // Check if token is expired
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      return payload.exp > currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return false;
    }
  },

  /**
   * Clear all authentication data
   */
  clearAuth(): void {
    localStorage.removeItem('access_token');
  },

  /**
   * Login with Google OAuth
   */
  async googleLogin(credential: string): Promise<LoginResponse> {
    const response = await apiRequest<LoginResponse>({
      method: 'POST',
      url: '/profiles/google-login/',
      data: { access_token: credential },
    });

    // Store access token
    localStorage.setItem('access_token', response.access);
    
    return response;
  },
}; 