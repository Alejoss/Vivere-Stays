// Authentication Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  user: UserData;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  receive_updates?: boolean;
}

export interface RegisterResponse {
  user: UserData;
  access_token: string;
}

// User Types
export interface UserData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface ProfileData {
  user: UserData;
  timezone?: string;
  profile_picture?: string;
  properties: PropertyData[];
  properties_count: number;
  receive_updates: boolean;
}

// Property Types (for onboarding)
export interface PropertyData {
  id: string;
  name: string;
  city: string;
  country: string;
  is_active: boolean;
  created_at: string;
}

// Hotel Creation Response
export interface HotelCreationResponse {
  message: string;
  property: PropertyData;
  action: 'created' | 'updated';
}

// Error Types
export interface ApiError {
  error: string;
  detail?: string;
  status?: number;
}

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

// Generic API Response
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// Auth State
export interface AuthState {
  isAuthenticated: boolean;
  user: UserData | null;
  loading: boolean;
} 