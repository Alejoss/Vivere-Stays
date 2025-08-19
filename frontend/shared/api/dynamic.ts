import { apiRequest } from './client';

// Types for Price History
export interface PriceHistoryEntry {
  checkin_date: string;
  price: number;
  occupancy_level: 'low' | 'medium' | 'high';
  overwrite: boolean;
  occupancy: number;
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

export interface CompetitorWeeklyPricesResponse {
  dates: string[];
  competitors: Array<{
    id: number;
    name: string;
    prices: (number | null)[];
  }>;
}

export interface CompetitorPriceForDate {
  id: number;
  name: string;
  price: number | null;
  currency: string | null;
  room_name: string | null;
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

  /**
   * Set a manual overwrite price for a specific date by creating a new price history record.
   */
  async updateOverwritePrice(
    propertyId: string,
    checkinDate: string,
    overwritePrice: number
  ): Promise<{ message: string; price_history: PriceHistoryEntry }> {
    return apiRequest<{ message: string; price_history: PriceHistoryEntry }>({
      method: 'PATCH',
      url: `/dynamic-pricing/properties/${propertyId}/price-history/${checkinDate}/overwrite/`,
      data: { overwrite_price: overwritePrice },
    });
  },

  /**
   * Overwrite prices for a range of dates for a property.
   */
  async overwritePriceRange(
    propertyId: string,
    startDate: string,
    endDate: string,
    overwritePrice: number
  ): Promise<{ message: string; created: any[]; errors: string[]; start_date: string; end_date: string; overwrite_price: number }> {
    return apiRequest<{ message: string; created: any[]; errors: string[]; start_date: string; end_date: string; overwrite_price: number }>({
      method: 'POST',
      url: `/dynamic-pricing/properties/${propertyId}/price-history/overwrite-range/`,
      data: {
        start_date: startDate,
        end_date: endDate,
        overwrite_price: overwritePrice,
      },
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

  /**
   * Get the Minimum Selling Price (MSP) for a property and a specific date.
   */
  async getMSPForDate(propertyId: string, date: string): Promise<MSPEntry | null> {
    try {
      const url = `/dynamic-pricing/properties/${propertyId}/msp-for-date/?date=${date}`;
      return await apiRequest<MSPEntry>({
        method: 'GET',
        url,
      });
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Fetches the weekly competitor prices matrix for a property.
   * @param propertyId The property ID
   * @param startDate The Monday of the week (YYYY-MM-DD)
   */
  async getCompetitorWeeklyPrices(propertyId: string, startDate: string): Promise<CompetitorWeeklyPricesResponse> {
    const url = `/dynamic-pricing/properties/${propertyId}/competitor-prices/week/?start_date=${startDate}`;
    return apiRequest<CompetitorWeeklyPricesResponse>({
      method: 'GET',
      url,
    });
  },

  /**
   * Fetches competitor prices for a property and a specific date.
   * @param propertyId The property ID
   * @param date The date (YYYY-MM-DD)
   */
  async getCompetitorPricesForDate(propertyId: string, date: string): Promise<CompetitorPriceForDate[]> {
    const url = `/dynamic-pricing/properties/${propertyId}/competitor-prices/for-date/?date=${date}`;
    return apiRequest<CompetitorPriceForDate[]>({
      method: 'GET',
      url,
    });
  },
};
