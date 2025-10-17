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
  min_competitors: number;
  comp_price_calculation: 'min' | 'max' | 'avg' | 'median';
  future_days_to_price: number;
  pricing_status: string;
  los_status: string;
  los_num_competitors: number;
  los_aggregation: 'min' | 'max';
  otas_price_diff: number;
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

// Types for Special Offers (Offer Increments)
export interface SpecialOffer {
  id: number;
  property_id: string;
  user: number;
  offer_name: string;
  valid_from: string;
  valid_until: string;
  applied_from_days: number | null;
  applied_until_days: number | null;
  increment_type: 'Percentage' | 'Additional';
  increment_value: number;
  created_at: string;
  updated_at: string;
}

export interface SpecialOffersResponse {
  offers: SpecialOffer[];
  count: number;
}

export interface CreateSpecialOfferRequest {
  offer_name: string;
  valid_from: string;
  valid_until: string;
  applied_from_days?: number;
  applied_until_days?: number;
  increment_type: 'Percentage' | 'Additional';
  increment_value: number;
}

export interface BulkCreateSpecialOffersRequest {
  offers: CreateSpecialOfferRequest[];
}

export interface CreateSpecialOfferResponse {
  message: string;
  offer: SpecialOffer;
}

export interface BulkCreateSpecialOffersResponse {
  message: string;
  created_offers: SpecialOffer[];
  errors: Array<{
    offer_index: number;
    offer_name: string;
    error: string;
  }>;
  property_id: string;
}

export interface UpdateSpecialOfferRequest {
  offer_name?: string;
  valid_from?: string;
  valid_until?: string;
  applied_from_days?: number;
  applied_until_days?: number;
  increment_type?: 'Percentage' | 'Additional';
  increment_value?: number;
}

export interface UpdateSpecialOfferResponse {
  message: string;
  offer: SpecialOffer;
}

export interface DeleteSpecialOfferResponse {
  message: string;
  offer_id: number;
  offer_name: string;
}

// Types for Dynamic Setup (Dynamic Increments V2)
export interface DynamicRule {
  id: number;
  property_id: string;
  user: number;
  occupancy_category: '0-30' | '30-50' | '50-70' | '70-80' | '80-90' | '90-100' | '100+';
  lead_time_category: '0-1' | '1-3' | '3-7' | '7-14' | '14-30' | '30-45' | '45-60' | '60+';
  increment_type: 'Percentage' | 'Additional';
  increment_value: number;
  created_at: string;
  updated_at: string;
}

export interface DynamicRulesResponse {
  rules: DynamicRule[];
  count: number;
}

export interface CreateDynamicRuleRequest {
  occupancy_category: '0-30' | '30-50' | '50-70' | '70-80' | '80-90' | '90-100' | '100+';
  lead_time_category: '0-1' | '1-3' | '3-7' | '7-14' | '14-30' | '30-45' | '45-60' | '60+';
  increment_type: 'Percentage' | 'Additional';
  increment_value: number;
}

export interface BulkCreateDynamicRulesRequest {
  rules: CreateDynamicRuleRequest[];
}

export interface CreateDynamicRuleResponse {
  message: string;
  rule: DynamicRule;
}

export interface BulkCreateDynamicRulesResponse {
  message: string;
  created_rules: DynamicRule[];
  errors: Array<{
    rule_index: number;
    occupancy_category: string;
    lead_time_category: string;
    error: string;
  }>;
  property_id: string;
}

export interface UpdateDynamicRuleRequest {
  occupancy_category?: '0-30' | '30-50' | '50-70' | '70-80' | '80-90' | '90-100' | '100+';
  lead_time_category?: '0-1' | '1-3' | '3-7' | '7-14' | '14-30' | '30-45' | '45-60' | '60+';
  increment_type?: 'Percentage' | 'Additional';
  increment_value?: number;
}

export interface UpdateDynamicRuleResponse {
  message: string;
  rule: DynamicRule;
}

export interface BulkUpdateDynamicRulesRequest {
  rules: Array<{
    id: number;
    occupancy_category?: '0-30' | '30-50' | '50-70' | '70-80' | '80-90' | '90-100' | '100+';
    lead_time_category?: '0-1' | '1-3' | '3-7' | '7-14' | '14-30' | '30-45' | '45-60' | '60+';
    increment_type?: 'Percentage' | 'Additional';
    increment_value?: number;
  }>;
}

export interface BulkUpdateDynamicRulesResponse {
  message: string;
  updated_rules: DynamicRule[];
  errors: Array<{
    rule_index: number;
    rule_id: number;
    error: string;
  }>;
  property_id: string;
}

export interface DeleteDynamicRuleResponse {
  message: string;
  rule_id: number;
  occupancy_category: string;
  lead_time_category: string;
}

// Types for LOS Reduction Rules
export interface LosReductionRule {
  id: number;
  property_id: string;
  lead_time_category: '0-1' | '1-3' | '3-7' | '7-14' | '14-30' | '30-45' | '45-60' | '60+';
  occupancy_category: '0-30' | '30-50' | '50-70' | '70-80' | '80-90' | '90-100' | '100+';
  los_value: number;
  created_at: string;
  updated_at: string;
}

export interface LosReductionRulesResponse {
  reductions: LosReductionRule[];
  count: number;
}

export interface CreateLosReductionRuleRequest {
  property_id: string;
  lead_time_category: '0-1' | '1-3' | '3-7' | '7-14' | '14-30' | '30-45' | '45-60' | '60+';
  occupancy_category: '0-30' | '30-50' | '50-70' | '70-80' | '80-90' | '90-100' | '100+';
  los_value: number;
}

export interface BulkCreateLosReductionRulesRequest {
  reductions: CreateLosReductionRuleRequest[];
}

export interface CreateLosReductionRuleResponse {
  message: string;
  reduction: LosReductionRule;
}

export interface BulkCreateLosReductionRulesResponse {
  message: string;
  created_reductions: LosReductionRule[];
  errors: Array<{
    reduction_index: number;
    lead_time_category: string;
    occupancy_category: string;
    error: string;
  }>;
  property_id: string;
}

export interface UpdateLosReductionRuleRequest {
  lead_time_category?: '0-1' | '1-3' | '3-7' | '7-14' | '14-30' | '30-45' | '45-60' | '60+';
  occupancy_category?: '0-30' | '30-50' | '50-70' | '70-80' | '80-90' | '90-100' | '100+';
  los_value?: number;
}

export interface UpdateLosReductionRuleResponse {
  message: string;
  reduction: LosReductionRule;
}

export interface DeleteLosReductionRuleResponse {
  message: string;
  reduction_id: number;
  lead_time_category: string;
  occupancy_category: string;
}

// Types for LOS Setup Rules
export interface LosSetupRule {
  id: number;
  property_id: string;
  valid_from: string;
  valid_until: string;
  day_of_week: string;
  los_value: number;
  num_competitors: number;
  los_aggregation: string;
  created_at: string;
  updated_at: string;
}

export interface LosSetupRulesResponse {
  setups: LosSetupRule[];
  count: number;
}

export interface CreateLosSetupRuleRequest {
  property_id: string;
  valid_from: string;
  valid_until: string;
  day_of_week: string;
  los_value: number;
  num_competitors?: number;
  los_aggregation?: string;
}

export interface BulkCreateLosSetupRulesRequest {
  setups: CreateLosSetupRuleRequest[];
}

export interface CreateLosSetupRuleResponse {
  message: string;
  setup: LosSetupRule;
}

export interface BulkCreateLosSetupRulesResponse {
  message: string;
  created_setups: LosSetupRule[];
  errors: Array<{
    setup_index: number;
    day_of_week: string;
    error: string;
  }>;
  property_id: string;
}

export interface UpdateLosSetupRuleRequest {
  valid_from?: string;
  valid_until?: string;
  day_of_week?: string;
  los_value?: number;
  num_competitors?: number;
  los_aggregation?: string;
}

export interface UpdateLosSetupRuleResponse {
  message: string;
  setup: LosSetupRule;
}

export interface DeleteLosSetupRuleResponse {
  message: string;
  setup_id: number;
  day_of_week: string;
  valid_from: string;
}

// Types for Unified Rooms and Rates (Available Rates)
export interface UnifiedRoomRate {
  id: number;
  property_id: string;
  pms_source: 'apaleo' | 'mrplan' | 'avirato';
  pms_hotel_id: string;
  room_id: string;
  rate_id: string;
  room_name: string;
  room_description?: string;
  rate_name: string;
  rate_description?: string;
  rate_category?: string;
  last_updated: string;
  // Configuration fields from DpRoomRates
  increment_type: 'Percentage' | 'Additional';
  increment_value: number;
  is_base_rate: boolean;
}

export interface AvailableRatesResponse {
  rates: UnifiedRoomRate[];
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

  async getMSPPriceHistory(
    propertyId: string, 
    year?: number, 
    month?: number
  ): Promise<PriceHistoryResponse> {
    const params = new URLSearchParams();
    if (year !== undefined) params.append('year', year.toString());
    if (month !== undefined) params.append('month', month.toString());
    
    const url = `/dynamic-pricing/properties/${propertyId}/msp-price-history/${params.toString() ? `?${params.toString()}` : ''}`;
    
    return apiRequest<PriceHistoryResponse>({
      method: 'GET',
      url,
    });
  },

  async getCompetitorAveragePriceHistory(
    propertyId: string, 
    year?: number, 
    month?: number
  ): Promise<PriceHistoryResponse> {
    const params = new URLSearchParams();
    if (year !== undefined) params.append('year', year.toString());
    if (month !== undefined) params.append('month', month.toString());
    
    const url = `/dynamic-pricing/properties/${propertyId}/competitor-average-price-history/${params.toString() ? `?${params.toString()}` : ''}`;
    
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

  async updateProperty(propertyId: string, data: any): Promise<{ message: string; property: PropertyDetailResponse }> {
    return apiRequest<{ message: string; property: PropertyDetailResponse }>({
      method: 'PUT',
      url: `/dynamic-pricing/properties/${propertyId}/`,
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

  async getPropertyMSPEntries(propertyId: string): Promise<MSPEntriesResponse & { property_id: string; property_name: string }> {
    return apiRequest<MSPEntriesResponse & { property_id: string; property_name: string }>({
      method: 'GET',
      url: `/dynamic-pricing/properties/${propertyId}/msp/`,
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

  async createPropertyMSP(propertyId: string, data: { periods: Array<{ fromDate: string; toDate: string; price: string; periodTitle: string }> }): Promise<{
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
      url: `/dynamic-pricing/properties/${propertyId}/msp/`,
      data,
    });
  },

  async deleteMSPPeriod(propertyId: string, mspId: string): Promise<{
    message: string;
    deleted_entry: MSPEntry;
  }> {
    return apiRequest<{
      message: string;
      deleted_entry: MSPEntry;
    }>({
      method: 'DELETE',
      url: `/dynamic-pricing/properties/${propertyId}/msp/${mspId}/`,
    });
  },

  /**
   * Get the Minimum Selling Price (MSP) for a property and a specific date.
   */
  async getMSPForDate(propertyId: string, date: string): Promise<MSPEntry | null> {
    try {
      const url = `/dynamic-pricing/properties/${propertyId}/msp/date/?date=${date}`;
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
    const url = `/dynamic-pricing/properties/${propertyId}/competitors/weekly-chart/?start_date=${startDate}`;
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
    const url = `/dynamic-pricing/properties/${propertyId}/competitors/date/?date=${date}`;
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
    const url = `/dynamic-pricing/properties/${propertyId}/price-history/range/?start_date=${startDate}&end_date=${endDate}`;
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
    property_id?: string;
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
    // Use property-specific endpoint if property_id is provided
    const url = data.property_id 
      ? `/dynamic-pricing/properties/${data.property_id}/competitors/candidates/bulk-create/`
      : '/dynamic-pricing/competitors/candidates/bulk-create/';
    
    // Remove property_id from data since it's in the URL
    const { property_id, ...requestData } = data;
    
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
      url,
      data: requestData,
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

  async updateGeneralSettings(
    propertyId: string, 
    data: { comp_price_calculation?: string; min_competitors?: number; los_num_competitors?: number; los_aggregation?: string; otas_price_diff?: number }
  ): Promise<{ message: string; property_id: string; updated_fields: string[]; comp_price_calculation: string; min_competitors: number; los_num_competitors: number; los_aggregation: string; otas_price_diff: number; updated_at: string }> {
    return apiRequest({
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

  // Special Offers (Offer Increments) endpoints
  async getSpecialOffers(propertyId: string): Promise<SpecialOffersResponse> {
    return apiRequest<SpecialOffersResponse>({
      method: 'GET',
      url: `/dynamic-pricing/properties/${propertyId}/special-offers/`,
    });
  },

  async createSpecialOffer(
    propertyId: string, 
    data: CreateSpecialOfferRequest
  ): Promise<CreateSpecialOfferResponse> {
    return apiRequest<CreateSpecialOfferResponse>({
      method: 'POST',
      url: `/dynamic-pricing/properties/${propertyId}/special-offers/create/`,
      data,
    });
  },

  async bulkCreateSpecialOffers(
    propertyId: string, 
    data: BulkCreateSpecialOffersRequest
  ): Promise<BulkCreateSpecialOffersResponse> {
    return apiRequest<BulkCreateSpecialOffersResponse>({
      method: 'POST',
      url: `/dynamic-pricing/properties/${propertyId}/special-offers/create/`,
      data,
    });
  },

  async updateSpecialOffer(
    propertyId: string, 
    offerId: number, 
    data: UpdateSpecialOfferRequest
  ): Promise<UpdateSpecialOfferResponse> {
    return apiRequest<UpdateSpecialOfferResponse>({
      method: 'PATCH',
      url: `/dynamic-pricing/properties/${propertyId}/special-offers/${offerId}/`,
      data,
    });
  },

  async deleteSpecialOffer(
    propertyId: string, 
    offerId: number
  ): Promise<DeleteSpecialOfferResponse> {
    return apiRequest<DeleteSpecialOfferResponse>({
      method: 'DELETE',
      url: `/dynamic-pricing/properties/${propertyId}/special-offers/${offerId}/delete/`,
    });
  },

  // Dynamic Setup (Dynamic Increments V2) endpoints
  async getDynamicRules(propertyId: string): Promise<DynamicRulesResponse> {
    return apiRequest<DynamicRulesResponse>({
      method: 'GET',
      url: `/dynamic-pricing/properties/${propertyId}/dynamic-setup/`,
    });
  },

  async createDynamicRule(
    propertyId: string, 
    data: CreateDynamicRuleRequest
  ): Promise<CreateDynamicRuleResponse> {
    return apiRequest<CreateDynamicRuleResponse>({
      method: 'POST',
      url: `/dynamic-pricing/properties/${propertyId}/dynamic-setup/create/`,
      data,
    });
  },

  async bulkCreateDynamicRules(
    propertyId: string, 
    data: BulkCreateDynamicRulesRequest
  ): Promise<BulkCreateDynamicRulesResponse> {
    return apiRequest<BulkCreateDynamicRulesResponse>({
      method: 'POST',
      url: `/dynamic-pricing/properties/${propertyId}/dynamic-setup/create/`,
      data,
    });
  },

  async updateDynamicRule(
    propertyId: string, 
    ruleId: number, 
    data: UpdateDynamicRuleRequest
  ): Promise<UpdateDynamicRuleResponse> {
    return apiRequest<UpdateDynamicRuleResponse>({
      method: 'PATCH',
      url: `/dynamic-pricing/properties/${propertyId}/dynamic-setup/${ruleId}/`,
      data,
    });
  },

  async bulkUpdateDynamicRules(
    propertyId: string, 
    data: BulkUpdateDynamicRulesRequest
  ): Promise<BulkUpdateDynamicRulesResponse> {
    return apiRequest<BulkUpdateDynamicRulesResponse>({
      method: 'PATCH',
      url: `/dynamic-pricing/properties/${propertyId}/dynamic-setup/bulk-update/`,
      data,
    });
  },

  async deleteDynamicRule(
    propertyId: string, 
    ruleId: number
  ): Promise<DeleteDynamicRuleResponse> {
    return apiRequest<DeleteDynamicRuleResponse>({
      method: 'DELETE',
      url: `/dynamic-pricing/properties/${propertyId}/dynamic-setup/${ruleId}/delete/`,
    });
  },

  // LOS Reduction Rules endpoints
  async getLosReductionRules(propertyId: string): Promise<LosReductionRulesResponse> {
    return apiRequest<LosReductionRulesResponse>({
      method: 'GET',
      url: `/dynamic-pricing/properties/${propertyId}/los-reduction/`,
    });
  },

  async createLosReductionRule(
    propertyId: string, 
    data: CreateLosReductionRuleRequest
  ): Promise<CreateLosReductionRuleResponse> {
    return apiRequest<CreateLosReductionRuleResponse>({
      method: 'POST',
      url: `/dynamic-pricing/properties/${propertyId}/los-reduction/create/`,
      data,
    });
  },

  async bulkCreateLosReductionRules(
    propertyId: string, 
    data: BulkCreateLosReductionRulesRequest
  ): Promise<BulkCreateLosReductionRulesResponse> {
    return apiRequest<BulkCreateLosReductionRulesResponse>({
      method: 'POST',
      url: `/dynamic-pricing/properties/${propertyId}/los-reduction/create/`,
      data,
    });
  },

  async updateLosReductionRule(
    propertyId: string, 
    reductionId: number, 
    data: UpdateLosReductionRuleRequest
  ): Promise<UpdateLosReductionRuleResponse> {
    return apiRequest<UpdateLosReductionRuleResponse>({
      method: 'PATCH',
      url: `/dynamic-pricing/properties/${propertyId}/los-reduction/${reductionId}/`,
      data,
    });
  },

  async deleteLosReductionRule(
    propertyId: string, 
    reductionId: number
  ): Promise<DeleteLosReductionRuleResponse> {
    return apiRequest<DeleteLosReductionRuleResponse>({
      method: 'DELETE',
      url: `/dynamic-pricing/properties/${propertyId}/los-reduction/${reductionId}/delete/`,
    });
  },

  // LOS Setup Rules endpoints
  async getLosSetupRules(propertyId: string): Promise<LosSetupRulesResponse> {
    return apiRequest<LosSetupRulesResponse>({
      method: 'GET',
      url: `/dynamic-pricing/properties/${propertyId}/los-setup/`,
    });
  },

  async createLosSetupRule(
    propertyId: string, 
    data: CreateLosSetupRuleRequest
  ): Promise<CreateLosSetupRuleResponse> {
    return apiRequest<CreateLosSetupRuleResponse>({
      method: 'POST',
      url: `/dynamic-pricing/properties/${propertyId}/los-setup/create/`,
      data,
    });
  },

  async bulkCreateLosSetupRules(
    propertyId: string, 
    data: BulkCreateLosSetupRulesRequest
  ): Promise<BulkCreateLosSetupRulesResponse> {
    return apiRequest<BulkCreateLosSetupRulesResponse>({
      method: 'POST',
      url: `/dynamic-pricing/properties/${propertyId}/los-setup/create/`,
      data,
    });
  },

  async updateLosSetupRule(
    propertyId: string, 
    setupId: number, 
    data: UpdateLosSetupRuleRequest
  ): Promise<UpdateLosSetupRuleResponse> {
    return apiRequest<UpdateLosSetupRuleResponse>({
      method: 'PATCH',
      url: `/dynamic-pricing/properties/${propertyId}/los-setup/${setupId}/`,
      data,
    });
  },

  async deleteLosSetupRule(
    propertyId: string, 
    setupId: number
  ): Promise<DeleteLosSetupRuleResponse> {
    return apiRequest<DeleteLosSetupRuleResponse>({
      method: 'DELETE',
      url: `/dynamic-pricing/properties/${propertyId}/los-setup/${setupId}/delete/`,
    });
  },

  // Available Rates (Unified Rooms and Rates) endpoints
  async getAvailableRates(propertyId: string): Promise<AvailableRatesResponse> {
    return apiRequest<AvailableRatesResponse>({
      method: 'GET',
      url: `/dynamic-pricing/properties/${propertyId}/available-rates/`,
    });
  },

  async updateAvailableRates(
    propertyId: string, 
    data: { rates: Array<{ rate_id: string; increment_type: 'Percentage' | 'Additional'; increment_value: number; is_base_rate: boolean }> }
  ): Promise<{
    message: string;
    property_id: string;
    updated_count: number;
    created_count: number;
    total_processed: number;
    errors: Array<{ rate_id: string; error: string }>;
  }> {
    return apiRequest<{
      message: string;
      property_id: string;
      updated_count: number;
      created_count: number;
      total_processed: number;
      errors: Array<{ rate_id: string; error: string }>;
    }>({
      method: 'POST',
      url: `/dynamic-pricing/properties/${propertyId}/available-rates/update/`,
      data,
    });
  },

  // Initialize property defaults (called during onboarding completion)
  async initializePropertyDefaults(propertyId: string): Promise<{
    message: string;
    property_id: string;
    summary: {
      general_settings_created: boolean;
      dynamic_increments_created: number;
      dynamic_increments_skipped: number;
      total_created: number;
      total_skipped: number;
    };
    errors: string[] | null;
  }> {
    return apiRequest<{
      message: string;
      property_id: string;
      summary: {
        general_settings_created: boolean;
        dynamic_increments_created: number;
        dynamic_increments_skipped: number;
        total_created: number;
        total_skipped: number;
      };
      errors: string[] | null;
    }>({
      method: 'POST',
      url: `/dynamic-pricing/properties/${propertyId}/initialize-defaults/`,
    });
  },

  /**
   * Check MSP status for a property and trigger notifications if MSP is missing
   * This should be called when user visits Price Calendar or other pricing pages
   */
  async checkMSPStatus(propertyId: string): Promise<{
    property_id: string;
    property_name: string;
    notifications_created: Array<{
      type: 'msp_missing_today' | 'msp_missing_next_week';
      notification_id: number;
    }>;
    coverage_stats: {
      property_id: string;
      property_name: string;
      period_start: string;
      period_end: string;
      total_days: number;
      covered_days: number;
      missing_days: number;
      coverage_percentage: number;
      has_complete_coverage: boolean;
      missing_dates: string[];
    };
  }> {
    return apiRequest<{
      property_id: string;
      property_name: string;
      notifications_created: Array<{
        type: 'msp_missing_today' | 'msp_missing_next_week';
        notification_id: number;
      }>;
      coverage_stats: {
        property_id: string;
        property_name: string;
        period_start: string;
        period_end: string;
        total_days: number;
        covered_days: number;
        missing_days: number;
        coverage_percentage: number;
        has_complete_coverage: boolean;
        missing_dates: string[];
      };
    }>({
      method: 'GET',
      url: `/dynamic-pricing/properties/${propertyId}/check-msp/`,
    });
  },

  /**
   * Check MSP status for all user properties and trigger notifications if needed
   */
  async checkMSPStatusAllProperties(): Promise<{
    message: string;
    result: {
      user_id: number;
      username: string;
      properties_checked: number;
      total_notifications_created: number;
      details: Array<{
        property_id: string;
        property_name: string;
        notifications_created: Array<{
          type: string;
          notification_id: number;
        }>;
        count: number;
      }>;
    };
  }> {
    return apiRequest<{
      message: string;
      result: {
        user_id: number;
        username: string;
        properties_checked: number;
        total_notifications_created: number;
        details: Array<{
          property_id: string;
          property_name: string;
          notifications_created: Array<{
            type: string;
            notification_id: number;
          }>;
          count: number;
        }>;
      };
    }>({
      method: 'GET',
      url: '/dynamic-pricing/check-msp/',
    });
  },
};
