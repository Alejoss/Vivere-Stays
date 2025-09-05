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

export interface PriceHistoryForDateRangeResponse {
  property_id: string;
  property_name: string;
  start_date: string;
  end_date: string;
  price_history: PriceHistoryEntry[];
  average_price: number;
  count: number;
  valid_days: number;
}

// Types for DpGeneralSettings
export interface DpGeneralSettings {
  property_id: string;
  base_rate_code?: string;
  is_base_in_pms?: boolean;
  min_competitors: number;
  comp_price_calculation: 'min' | 'max' | 'avg' | 'median';
  competitor_excluded?: string;
  competitors_excluded?: any[];
  msp_include_events_weekend_increments: boolean;
  future_days_to_price: number;
  pricing_status: string;
  los_status: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateCompPriceCalculationRequest {
  comp_price_calculation: 'min' | 'max' | 'avg' | 'median';
}

export interface UpdateCompPriceCalculationResponse {
  message: string;
  property_id: string;
  comp_price_calculation: 'min' | 'max' | 'avg' | 'median';
  updated_at: string;
}

// Types for Competitor Candidates
export interface CompetitorCandidate {
  id: string;
  competitor_name: string;
  booking_link?: string;
  suggested_by_user: boolean;
  similarity_score?: number;
  status: 'processing' | 'finished' | 'error';
  only_follow: boolean;
  deleted: boolean;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  error_message?: string;
}

export interface CompetitorCandidatesResponse {
  candidates: CompetitorCandidate[];
  count: number;
}

// Types for Property Competitors
export interface PropertyCompetitor {
  id: string;
  competitor_id: string;
  competitor_name: string;
  booking_link?: string;
  only_follow: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyCompetitorsResponse {
  competitors: PropertyCompetitor[];
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

  /**
   * Fetches price history for a date range and calculates the average nightly rate.
   * @param propertyId The property ID
   * @param startDate The start date (YYYY-MM-DD)
   * @param endDate The end date (YYYY-MM-DD)
   */
  async getPriceHistoryForDateRange(
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<PriceHistoryForDateRangeResponse> {
    const url = `/dynamic-pricing/properties/${propertyId}/price-history/for-date-range/?start_date=${startDate}&end_date=${endDate}`;
    return apiRequest<PriceHistoryForDateRangeResponse>({
      method: 'GET',
      url,
    });
  },

  /**
   * Fetches nearby hotels based on property location data.
   * @param locationData The location data for the property
   * @param numCompetitors Number of competitors to return (default: 5)
   */
  async getNearbyHotels(locationData: {
    address: string;
    city: string;
    country?: string;
    postal_code?: string;
  }, numCompetitors: number = 5): Promise<string[]> {
    return apiRequest<string[]>({
      method: 'POST',
      url: '/dynamic-pricing/competitors/nearby/',
      data: {
        ...locationData,
        num_competitors: numCompetitors
      },
    });
  },

  async createCompetitorCandidates(data: { 
    competitor_names: string[];
    suggested_by_user?: boolean;
  }): Promise<{
    message: string;
    property_id: string;
    created_candidates: Array<{
      id: string;
      competitor_name: string;
      status: string;
      created_at: string;
    }>;
    total_created: number;
    total_errors: number;
    errors?: Array<{ name: string; error: string }>;
  }> {
    return apiRequest<{
      message: string;
      property_id: string;
      created_candidates: Array<{
        id: string;
        competitor_name: string;
        status: string;
        created_at: string;
      }>;
      total_created: number;
      total_errors: number;
      errors?: Array<{ name: string; error: string }>;
    }>({
      method: 'POST',
      url: '/dynamic-pricing/competitors/candidates/bulk-create/',
      data,
    });
  },

  // General Settings endpoints
  async getGeneralSettings(propertyId: string): Promise<DpGeneralSettings> {
    return apiRequest<DpGeneralSettings>({
      method: 'GET',
      url: `/dynamic-pricing/properties/${propertyId}/general-settings/`,
    });
  },

  async updateCompPriceCalculation(
    propertyId: string, 
    data: UpdateCompPriceCalculationRequest
  ): Promise<UpdateCompPriceCalculationResponse> {
    return apiRequest<UpdateCompPriceCalculationResponse>({
      method: 'PATCH',
      url: `/dynamic-pricing/properties/${propertyId}/general-settings/`,
      data,
    });
  },

  // Competitor endpoints
  async getCompetitorCandidates(propertyId: string): Promise<CompetitorCandidatesResponse> {
    return apiRequest<CompetitorCandidatesResponse>({
      method: 'GET',
      url: `/dynamic-pricing/properties/${propertyId}/competitor-candidates/`,
    });
  },

  async getPropertyCompetitors(propertyId: string): Promise<PropertyCompetitorsResponse> {
    return apiRequest<PropertyCompetitorsResponse>({
      method: 'GET',
      url: `/dynamic-pricing/properties/${propertyId}/competitors/`,
    });
  },

  // Update competitor endpoints
  async updateCompetitorCandidate(
    propertyId: string, 
    candidateId: string, 
    data: { competitor_name?: string; booking_link?: string }
  ): Promise<{ message: string; candidate: CompetitorCandidate }> {
    return apiRequest<{ message: string; candidate: CompetitorCandidate }>({
      method: 'PATCH',
      url: `/dynamic-pricing/properties/${propertyId}/competitor-candidates/${candidateId}/`,
      data,
    });
  },

  async updatePropertyCompetitor(
    propertyId: string, 
    competitorId: string, 
    data: { competitor_name?: string; booking_link?: string; only_follow?: boolean }
  ): Promise<{ message: string; competitor: PropertyCompetitor }> {
    return apiRequest<{ message: string; competitor: PropertyCompetitor }>({
      method: 'PATCH',
      url: `/dynamic-pricing/properties/${propertyId}/competitors/${competitorId}/`,
      data,
    });
  },

  // Delete competitor endpoints
  async deleteCompetitorCandidate(
    propertyId: string, 
    candidateId: string
  ): Promise<{ message: string; candidate_id: string; competitor_name: string }> {
    return apiRequest<{ message: string; candidate_id: string; competitor_name: string }>({
      method: 'DELETE',
      url: `/dynamic-pricing/properties/${propertyId}/competitor-candidates/${candidateId}/delete/`,
    });
  },

  async deletePropertyCompetitor(
    propertyId: string, 
    competitorId: string
  ): Promise<{ message: string; competitor_id: string; competitor_name: string }> {
    return apiRequest<{ message: string; competitor_id: string; competitor_name: string }>({
      method: 'DELETE',
      url: `/dynamic-pricing/properties/${propertyId}/competitors/${competitorId}/delete/`,
    });
  },
};
