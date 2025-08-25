import { apiRequest } from './client';

export interface ChartsSection {
  top: { first: number; second: number; delta_pct: number | null };
  bottom: { first: number; second: number; delta_pct: number | null };
}

export interface AnalyticsSummaryResponse {
  charts: {
    adr: ChartsSection;
    revpar: ChartsSection;
    revenue: ChartsSection;
  };
}

export interface PickupSeriesPoint {
  name: string; // D-6 ... D-0
  rooms_sold?: number; // when value=room_nights
  bookings_made?: number; // when value=bookings
  date: string; // YYYY-MM-DD
}

export interface AnalyticsPickupResponse {
  days: number;
  series: PickupSeriesPoint[];
  totals: { current: number; stly: number; delta_pct: number | null };
}

export interface AnalyticsOccupancyResponse {
  range: { from: string; to: string };
  occupancy: {
    left: { outer: number; inner: number; delta_pct: number | null };
    right: { outer: number; inner: number; delta_pct: number | null };
  };
}

export const analyticsService = {
  async getSummary(params: {
    from?: string; // YYYY-MM-DD
    to?: string; // YYYY-MM-DD
    pms_source?: string;
    metric_type?: string;
  }): Promise<AnalyticsSummaryResponse> {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.pms_source) query.set('pms_source', params.pms_source);
    if (params.metric_type) query.set('metric_type', params.metric_type);

    return apiRequest<AnalyticsSummaryResponse>({
      method: 'GET',
      url: `/analytics/summary/?${query.toString()}`,
    });
  },

  async getPickup(params: {
    days?: number; // 1,3,7
    pms_source?: string;
    metric_type?: string;
    value?: 'room_nights' | 'bookings';
  }): Promise<AnalyticsPickupResponse> {
    const query = new URLSearchParams();
    if (params.days) query.set('days', String(params.days));
    if (params.pms_source) query.set('pms_source', params.pms_source);
    if (params.metric_type) query.set('metric_type', params.metric_type);
    if (params.value) query.set('value', params.value);

    return apiRequest<AnalyticsPickupResponse>({
      method: 'GET',
      url: `/analytics/pickup/?${query.toString()}`,
    });
  },

  async getOccupancy(params?: {
    from?: string; // YYYY-MM-DD
    to?: string;   // YYYY-MM-DD
    pms_source?: string;
  }): Promise<AnalyticsOccupancyResponse> {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.pms_source) query.set('pms_source', params.pms_source);

    const qs = query.toString();
    const suffix = qs ? `?${qs}` : '';
    return apiRequest<AnalyticsOccupancyResponse>({
      method: 'GET',
      url: `/analytics/occupancy/${suffix}`,
    });
  },
};
