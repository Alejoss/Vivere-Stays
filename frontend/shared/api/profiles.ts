import { apiRequest } from './client';

export interface ProfileData {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    date_joined: string;
  };
  timezone: string;
  profile_picture: string | null;
  properties_count: number;
  receive_updates: boolean;
  dni?: string;
  phone_number?: string;
}

export interface ProfileUpdateRequest {
  timezone?: string;
  profile_picture?: File;
  dni?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  selected_plan?: string;
}

export interface HotelInformation {
  hotel_name: string;
  booking_url?: string;
  street_address: string;
  city: string;
  country: string;
  postal_code: string;
  phone_number: string;
  website?: string;
  cif?: string;
  number_of_rooms?: number;
  property_type: string;
  is_onboarding?: boolean;
}

export interface PMSIntegrationData {
  pms_id?: number;
  custom_pms_name?: string;
}

export interface PMSIntegrationResponse {
  message: string;
  integration: {
    id: number;
    property: number;
    property_name: string;
    profile: number;
    pms: number | null;
    pms_name: string | null;
    status: string;
    status_display: string;
    custom_pms_name: string | null;
    created_at: string;
    updated_at: string;
  };
}

export interface MSPPeriod {
  id: string;
  fromDate: string;
  toDate: string;
  price: string;
  periodTitle: string;
}

export interface MSPData {
  periods: MSPPeriod[];
}

export interface MSPResponse {
  message: string;
  created_entries: Array<{
    id: number;
    property_id: string;
    valid_from: string;
    valid_until: string;
    manual_alternative_price: number | null;
    msp: number;
    period_title: string | null;
    created_at: string;
    updated_at: string;
  }>;
  errors?: string[];
}

export interface MSPEntriesResponse {
  msp_entries: Array<{
    id: number;
    property_id: string;
    valid_from: string;
    valid_until: string;
    manual_alternative_price: number | null;
    msp: number;
    period_title: string | null;
    created_at: string;
    updated_at: string;
  }>;
  count: number;
}

export interface OnboardingProgress {
  current_step: string;
  current_step_display: string;
  progress_percentage: number;
  completed: boolean;
  started_at: string | null;
  completed_at: string | null;
  next_step: string | null;
}

export interface OnboardingProgressUpdate {
  step: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface SupportTicketData {
  id?: number;
  user?: number;
  user_email?: string;
  user_username?: string;
  issue_type: 'general_question' | 'technical_issue' | 'billing_question' | 'feature_request' | 'bug_report';
  issue_type_display?: string;
  title?: string;
  description: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  status_display?: string;
  screenshot?: File | string | null;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string | null;
}

export interface SupportTicketCreateRequest {
  issue_type: 'general_question' | 'technical_issue' | 'billing_question' | 'feature_request' | 'bug_report';
  title?: string;
  description: string;
  screenshot?: File;
}

export interface OnboardingPMSSupportRequest {
  message?: string;
  property_id?: string;
}

export interface OnboardingEmailVerificationSupportRequest {
  message?: string;
}

export interface OnboardingContactSalesRequest {
  message?: string;
  property_id?: string;
}

export interface SupportTicketResponse {
  message: string;
  ticket: SupportTicketData;
}

export interface SupportTicketsListResponse {
  tickets: SupportTicketData[];
  count: number;
}

export const profilesService = {
  async getProfile(): Promise<ProfileData> {
    return apiRequest<ProfileData>({
      method: 'GET',
      url: '/profiles/profile/',
    });
  },

  async updateProfile(data: ProfileUpdateRequest): Promise<ProfileData> {
    const formData = new FormData();
    
    if (data.timezone) {
      formData.append('timezone', data.timezone);
    }
    
    if (data.profile_picture) {
      formData.append('profile_picture', data.profile_picture);
    }

    if (data.dni) {
      formData.append('dni', data.dni);
    }

    if (data.phone_number) {
      formData.append('phone_number', data.phone_number);
    }

    if (data.first_name) {
      formData.append('first_name', data.first_name);
    }

    if (data.last_name) {
      formData.append('last_name', data.last_name);
    }

    if (data.selected_plan) {
      formData.append('selected_plan', data.selected_plan);
    }

    return apiRequest<ProfileData>({
      method: 'PUT',
      url: '/profiles/profile/',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async createHotel(data: HotelInformation): Promise<{ message: string; property: any; action: 'created' | 'updated' }> {
    return apiRequest<{ message: string; property: any; action: 'created' | 'updated' }>({
      method: 'POST',
      url: '/dynamic-pricing/properties/create/', // Fixed URL
      data,
    });
  },

  async createPMSIntegration(data: PMSIntegrationData): Promise<PMSIntegrationResponse> {
    return apiRequest<PMSIntegrationResponse>({
      method: 'POST',
      url: '/profiles/pms-integration/',
      data,
    });
  },

  async getPMSList(): Promise<{ pms_list: Array<{ id: number; name: string }>; count: number }> {
    return apiRequest<{ pms_list: Array<{ id: number; name: string }>; count: number }>({
      method: 'GET',
      url: '/dynamic-pricing/pms/',
    });
  },

  async createBulkCompetitors(data: { competitor_names: string[] }): Promise<{
    message: string;
    property_id: string;
    created_competitors: Array<{
      competitor_id: string;
      competitor_name: string;
      booking_link: string | null;
      valid_from: string;
      valid_to: string | null;
      daily_num_days: number;
      weekly_num_days: number;
      bimonthly_num_days: number;
      quarterly_num_days: number;
      first_cutoff_hour_cet: number;
      second_cutoff_hour_cet: number;
      region: string | null;
      is_currently_valid: boolean;
    }>;
    total_created: number;
    total_errors: number;
    errors?: Array<{ name: string; error: string }>;
  }> {
    return apiRequest<{
      message: string;
      property_id: string;
      created_competitors: Array<{
        competitor_id: string;
        competitor_name: string;
        booking_link: string | null;
        valid_from: string;
        valid_to: string | null;
        daily_num_days: number;
        weekly_num_days: number;
        bimonthly_num_days: number;
        quarterly_num_days: number;
        first_cutoff_hour_cet: number;
        second_cutoff_hour_cet: number;
        region: string | null;
        is_currently_valid: boolean;
      }>;
      total_created: number;
      total_errors: number;
      errors?: Array<{ name: string; error: string }>;
    }>({
      method: 'POST',
      url: '/booking/competitors/bulk-create/',
      data,
    });
  },

  async getUserProperties(): Promise<{
    properties: Array<{
      id: string;
      name: string;
      city: string;
      country: string;
      is_active: boolean;
      created_at: string;
    }>;
  }> {
    return apiRequest<{
      properties: Array<{
        id: string;
        name: string;
        city: string;
        country: string;
        is_active: boolean;
        created_at: string;
      }>;
    }>({
      method: 'GET',
      url: '/profiles/user-properties/',
    });
  },

  async getPMSIntegrations(): Promise<{ integrations: any[] }> {
    return apiRequest<{ integrations: any[] }>({
      method: 'GET',
      url: '/profiles/pms-integration/',
    });
  },

  async createMSP(data: MSPData): Promise<MSPResponse> {
    return apiRequest<MSPResponse>({
      method: 'POST',
      url: '/dynamic-pricing/msp/',
      data,
    });
  },

  async getMSPEntries(): Promise<MSPEntriesResponse> {
    return apiRequest<MSPEntriesResponse>({
      method: 'GET',
      url: '/dynamic-pricing/msp/',
    });
  },

  async getOnboardingProgress(): Promise<OnboardingProgress> {
    return apiRequest<OnboardingProgress>({
      method: 'GET',
      url: '/profiles/onboarding-progress/',
    });
  },

  async updateOnboardingProgress(data: OnboardingProgressUpdate): Promise<{
    message: string;
    progress: OnboardingProgress;
  }> {
    return apiRequest<{
      message: string;
      progress: OnboardingProgress;
    }>({
      method: 'POST',
      url: '/profiles/onboarding-progress/',
      data,
    });
  },

  async changePassword(data: PasswordChangeRequest): Promise<{
    message: string;
  }> {
    return apiRequest<{
      message: string;
    }>({
      method: 'POST',
      url: '/profiles/change-password/',
      data,
    });
  },

  async createSupportTicket(data: SupportTicketCreateRequest): Promise<SupportTicketResponse> {
    const formData = new FormData();
    
    formData.append('issue_type', data.issue_type);
    formData.append('description', data.description);
    
    if (data.title) {
      formData.append('title', data.title);
    }
    
    // priority removed
    
    if (data.screenshot) {
      formData.append('screenshot', data.screenshot);
    }

    return apiRequest<SupportTicketResponse>({
      method: 'POST',
      url: '/profiles/support-tickets/',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async getSupportTickets(): Promise<SupportTicketsListResponse> {
    return apiRequest<SupportTicketsListResponse>({
      method: 'GET',
      url: '/profiles/support-tickets/',
    });
  },

  async sendOnboardingPMSSupport(data: OnboardingPMSSupportRequest): Promise<{ message: string }> {
    return apiRequest<{ message: string }>({
      method: 'POST',
      url: '/profiles/onboarding-pms-support/',
      data,
    });
  },

  async sendOnboardingEmailVerificationSupport(data: OnboardingEmailVerificationSupportRequest): Promise<{ message: string }> {
    return apiRequest<{ message: string }>({
      method: 'POST',
      url: '/profiles/onboarding-email-verification-support/',
      data,
    });
  },

  async sendOnboardingContactSales(data: OnboardingContactSalesRequest): Promise<{ message: string }> {
    return apiRequest<{ message: string }>({
      method: 'POST',
      url: '/profiles/onboarding-contact-sales/',
      data,
    });
  },

  // Notification endpoints
  async getNotifications(filters?: {
    filter?: 'all' | 'unread' | 'read' | 'new';
    category?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    notifications: Array<{
      id: number;
      user: number;
      type: 'success' | 'warning' | 'info' | 'error';
      type_display: string;
      category: string;
      category_display: string;
      priority: string;
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
    }>;
    total_count: number;
    unread_count: number;
    new_count: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams();
    if (filters?.filter) params.append('filter', filters.filter);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    const queryString = params.toString();
    const url = `/profiles/notifications/${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest({
      method: 'GET',
      url,
    });
  },

  async markNotificationAsRead(notificationId: number): Promise<{
    message: string;
    notification: any;
  }> {
    return apiRequest({
      method: 'PATCH',
      url: `/profiles/notifications/${notificationId}/`,
      data: {
        is_read: true,
        is_new: false,
      },
    });
  },

  async deleteNotification(notificationId: number): Promise<{
    message: string;
  }> {
    return apiRequest({
      method: 'DELETE',
      url: `/profiles/notifications/${notificationId}/`,
    });
  },

  async markAllNotificationsAsRead(): Promise<{
    message: string;
    updated_count: number;
  }> {
    return apiRequest({
      method: 'POST',
      url: '/profiles/notifications/mark-all-read/',
    });
  },

  async getNotificationUnreadCount(): Promise<{
    unread_count: number;
    new_count: number;
  }> {
    return apiRequest({
      method: 'GET',
      url: '/profiles/notifications/unread-count/',
    });
  },
}; 