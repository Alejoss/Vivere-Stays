import { apiRequest } from './client';

// Types for Price History
export interface PriceHistoryEntry {
  checkin_date: string;
  price: number;
  occupancy_level: 'low' | 'medium' | 'high';
}

export interface PriceHistoryResponse {
  property_id: string;
  property_name: string;
  year: number;
  month: number;
  price_history: PriceHistoryEntry[];
  count: number;
}

// Types for Properties
export interface Property {
  id: string;
  name: string;
  city: string;
  country: string;
  property_type: string;
  number_of_rooms: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyListResponse {
  properties: Property[];
  count: number;
}

export interface PropertyDetailResponse extends Property {
  pms_name?: string;
  pms_hotel_id?: string;
  spreadsheet_id?: string;
  booking_hotel_url?: string;
  street_address?: string;
  postal_code?: string;
  state_province?: string;
  phone_number?: string;
  website?: string;
  cif?: string;
  latitude?: number;
  longitude?: number;
  rm_email?: string;
}

// Types for Property Management Systems
export interface PropertyManagementSystem {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface PMSListResponse {
  pms_list: PropertyManagementSystem[];
  count: number;
}

// Types for Minimum Selling Price
export interface MSPEntry {
  id: number;
  property_id: string;
  valid_from: string;
  valid_until: string;
  manual_alternative_price: number | null;
  msp: number;
  period_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface MSPEntriesResponse {
  msp_entries: MSPEntry[];
  count: number;
}

export const dynamicPricingService = {
  // Price History endpoints
  async getPriceHistory(
    propertyId: string, 
    year?: number, 
    month?: number
  ): Promise<PriceHistoryResponse> {
    const params = new URLSearchParams();
    if (year !== undefined) params.append('year', year.toString());
    if (month !== undefined) params.append('month', month.toString());
    
    const url = `/dynamic-pricing/properties/${propertyId}/price-history/${params.toString() ? `?${params.toString()}` : ''}`;
    
    return apiRequest<PriceHistoryResponse>({
      method: 'GET',
      url,
    });
  },

  // Property endpoints
  async getProperties(): Promise<PropertyListResponse> {
    return apiRequest<PropertyListResponse>({
      method: 'GET',
      url: '/dynamic-pricing/properties/',
    });
  },

  async getProperty(propertyId: string): Promise<PropertyDetailResponse> {
    return apiRequest<PropertyDetailResponse>({
      method: 'GET',
      url: `/dynamic-pricing/properties/${propertyId}/`,
    });
  },

  async createProperty(data: any): Promise<{ message: string; property: PropertyDetailResponse; action: 'created' | 'updated' }> {
    return apiRequest<{ message: string; property: PropertyDetailResponse; action: 'created' | 'updated' }>({
      method: 'POST',
      url: '/dynamic-pricing/properties/create/',
      data,
    });
  },

  async updatePropertyPMS(propertyId: string, data: { pms: number }): Promise<{ message: string; property: PropertyDetailResponse }> {
    return apiRequest<{ message: string; property: PropertyDetailResponse }>({
      method: 'PUT',
      url: `/dynamic-pricing/properties/${propertyId}/pms/`,
      data,
    });
  },

  // Property Management System endpoints
  async getPMSList(): Promise<PMSListResponse> {
    return apiRequest<PMSListResponse>({
      method: 'GET',
      url: '/dynamic-pricing/pms/',
    });
  },

  // Minimum Selling Price endpoints
  async getMSPEntries(): Promise<MSPEntriesResponse> {
    return apiRequest<MSPEntriesResponse>({
      method: 'GET',
      url: '/dynamic-pricing/msp/',
    });
  },

  async createMSP(data: { periods: Array<{ fromDate: string; toDate: string; price: string; periodTitle: string }> }): Promise<{
    message: string;
    created_entries: MSPEntry[];
    errors?: string[];
  }> {
    return apiRequest<{
      message: string;
      created_entries: MSPEntry[];
      errors?: string[];
    }>({
      method: 'POST',
      url: '/dynamic-pricing/msp/',
      data,
    });
  },
};
