/**
 * Notifications API
 * 
 * This module provides functions to interact with the backend notification system.
 * It handles fetching, creating, updating, and deleting notifications.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Notification {
  id: number;
  user: number;
  type: 'success' | 'warning' | 'info' | 'error';
  type_display: string;
  category: 'pms' | 'pricing' | 'payment' | 'profile' | 'competitor' | 'system' | 'general';
  category_display: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  priority_display: string;
  title: string;
  description: string;
  is_read: boolean;
  is_new: boolean;
  action_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  read_at?: string;
  expires_at?: string;
  timestamp: string;
  is_expired: boolean;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total_count: number;
  unread_count: number;
  new_count: number;
  limit: number;
  offset: number;
}

export interface NotificationCountResponse {
  unread_count: number;
  new_count: number;
}

export interface NotificationFilter {
  filter?: 'all' | 'unread' | 'read' | 'new';
  category?: string;
  priority?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get authentication token from localStorage or cookies
 */
function getAuthToken(): string | null {
  // Adjust this based on your authentication setup
  return localStorage.getItem('access_token');
}

/**
 * Build query string from filter parameters
 */
function buildQueryString(filters?: NotificationFilter): string {
  if (!filters) return '';
  
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  });
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Fetch notifications for the authenticated user
 */
export async function getNotifications(filters?: NotificationFilter): Promise<NotificationListResponse> {
  const token = getAuthToken();
  const queryString = buildQueryString(filters);
  
  const response = await fetch(`${API_BASE_URL}/api/profiles/notifications/${queryString}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch notifications: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get a single notification by ID
 */
export async function getNotification(notificationId: number): Promise<{ notification: Notification }> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/profiles/notifications/${notificationId}/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch notification: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: number): Promise<{ notification: Notification }> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/profiles/notifications/${notificationId}/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      is_read: true,
      is_new: false,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to mark notification as read: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Mark a notification as unread
 */
export async function markNotificationAsUnread(notificationId: number): Promise<{ notification: Notification }> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/profiles/notifications/${notificationId}/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      is_read: false,
      is_new: true,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to mark notification as unread: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: number): Promise<{ message: string }> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/profiles/notifications/${notificationId}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete notification: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<{ message: string; updated_count: number }> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/profiles/notifications/mark-all-read/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to mark all notifications as read: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<NotificationCountResponse> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/profiles/notifications/unread-count/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get unread count: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Create a new notification (typically used by admins or system processes)
 */
export async function createNotification(data: {
  type: 'success' | 'warning' | 'info' | 'error';
  category: string;
  priority: string;
  title: string;
  description: string;
  action_url?: string;
  metadata?: Record<string, any>;
  expires_at?: string;
}): Promise<{ message: string; notification: Notification }> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/api/profiles/notifications/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create notification: ${response.statusText}`);
  }
  
  return response.json();
}

