import axios from "axios";
import { type URLRecord, type ShortenUrlRequest, type RateLimiterResponse, type AnalyticsResponse } from "../types/Types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const ApiService = {
    async shortenUrl(request: ShortenUrlRequest): Promise<URLRecord> {
        try {
            const response = await axios.post<URLRecord>(
                `${API_BASE_URL}/api/shorten/`,
                request
            );
            return response.data;

        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response) {
                const status = error.response.status;
                const responseData = error.response.data;

                // handle rate limiting (429 response)
                if (status === 429) {
                    const rateLimitData = responseData as RateLimiterResponse;
                    throw new Error(
                        `Rate limit exceeded. Please try again after ${rateLimitData.retry_after_seconds} seconds.`
                    );
                }

                // generic Django validation errors
                throw new Error(
                    responseData?.error || "An unexpected error has occurred. Please try again later."
                );
            }

            // fallback for network-level dropouts eg. server down completely
            throw new Error(error.message || "Network error. Unable to reach backend server.");
        }
    },

    async listUrls(): Promise<URLRecord[]> {
        const response = await axios.get<URLRecord[]>(`${API_BASE_URL}/api/shorten/`);
        return response.data;
    },

    async trackClick(shortUrlCode: string): Promise<{ clicks: number }> {
        const response = await axios.post<{ clicks: number }>(
            `${API_BASE_URL}/api/analytics/${shortUrlCode}/click/`
        );
        return response.data;
    },

    async getAnalytics(shortUrlCode: string): Promise<AnalyticsResponse> {
        const response = await axios.get<AnalyticsResponse>(
            `${API_BASE_URL}/api/analytics/${shortUrlCode}/`
        );
        return response.data;
    }
}
