export interface URLRecord {
    id: number;
    original_url: string;
    short_url: string;
    created_at: string;
    clicks?: number; // only for analytics data, not returned in shorten response
}

export interface ShortenUrlRequest {
    original_url: string;
}

export interface RateLimiterResponse {
    error: string;
    retry_after_seconds: number; 
}

export interface AnalyticsTimelineItem {
  date: string;
  count: number;
}

export interface AnalyticsResponse {
  short_url: string;
  original_url: string;
  total_clicks: number;
  timeline: AnalyticsTimelineItem[];
}
