/**
 * Typed API client with error handling and abort controllers
 */
import Constants from 'expo-constants';
import { supabase } from './supabase';
import type { ApiError, NearbyUser, IncomingThrow, ThrowHistory } from '../types';

const API_URL =
    Constants.expoConfig?.extra?.apiUrl ||
    process.env.EXPO_PUBLIC_API_URL ||
    'http://localhost:3001';

class ApiClient {
    private baseUrl: string;
    private abortControllers: Map<string, AbortController>;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.abortControllers = new Map();
    }

    /**
     * Get current auth token from Supabase
     */
    private async getAuthToken(): Promise<string | null> {
        const {
            data: { session },
        } = await supabase.auth.getSession();
        return session?.access_token || null;
    }

    /**
     * Make authenticated API request with abort support
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {},
        abortKey?: string
    ): Promise<T> {
        const token = await this.getAuthToken();

        // Setup abort controller
        let controller: AbortController | undefined;
        if (abortKey) {
            // Abort any existing request with same key
            this.abortControllers.get(abortKey)?.abort();
            controller = new AbortController();
            this.abortControllers.set(abortKey, controller);
        }

        try {
            const completeOptions = {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                    ...options.headers,
                },
                signal: controller ? controller.signal : undefined,
            };

            const response = await fetch(`${this.baseUrl}${endpoint}`, completeOptions);

            if (!response.ok) {
                const errorBody = await response.text();
                try {
                    const parsedError: ApiError = JSON.parse(errorBody);
                    console.log(parsedError);
                    throw new Error(parsedError.message || 'API request failed');
                } catch {
                    console.log(errorBody);
                    throw new Error(errorBody || 'API request failed');
                }
            }

            const raw = await response.text();

            if (!raw.trim()) {
                return undefined as T;
            }

            try {
                return JSON.parse(raw) as T;
            } catch (parseError) {
                console.error(
                    'Failed to parse API response',
                    parseError instanceof Error ? parseError.message : parseError,
                    raw
                );
                throw new Error('Received malformed response from API');
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.info('Request aborted:', abortKey);
                throw error;
            }
            throw error;
        } finally {
            if (abortKey) {
                this.abortControllers.delete(abortKey);
            }
        }
    }

    /**
     * Update user location
     */
    async updateLocation(
        lat: number,
        lng: number,
        accuracyM?: number
    ): Promise<void> {
        return this.request('/api/v1/location/update', {
            method: 'POST',
            body: JSON.stringify({ lat, lng, accuracyM }),
        });
    }

    /**
     * Get nearby users
     */
    async getNearbyUsers(
        lat: number,
        lng: number,
        radiusKm?: number
    ): Promise<NearbyUser[]> {
        const params = new URLSearchParams({
            lat: lat.toString(),
            lng: lng.toString(),
            ...(radiusKm && { radiusKm: radiusKm.toString() }),
        });

        return this.request<NearbyUser[]>(
            `/api/v1/users/nearby?${params}`,
            {},
            'nearby-users'
        );
    }

    /**
     * Throw pokeball at target
     */
    async throwBall(targetUserId: string): Promise<{ throwId: string }> {
        return this.request('/api/v1/throw', {
            method: 'POST',
            body: JSON.stringify({ targetUserId }),
        });
    }

    /**
     * Resolve throw (accept/decline)
     */
    async resolveThrow(
        throwId: string,
        result: 'hit' | 'miss'
    ): Promise<{ matched: boolean }> {
        return this.request('/api/v1/throw/resolve', {
            method: 'POST',
            body: JSON.stringify({ throwId, result }),
        });
    }

    /**
     * Get user's matches
     */
    async getMatches(): Promise<
        Array<{ matchId: string; user: NearbyUser; createdAt: string }>
    > {
        return this.request('/api/v1/matches');
    }

    /**
     * Get incoming throws (pending notifications)
     */
    async getIncomingThrows(): Promise<IncomingThrow[]> {
        return this.request<IncomingThrow[]>('/api/v1/throw/incoming');
    }

    /**
     * Get throw history (accepted/declined)
     */
    async getThrowHistory(): Promise<ThrowHistory[]> {
        return this.request<ThrowHistory[]>('/api/v1/throw/history');
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<{ status: string }> {
        return this.request('/healthz');
    }
}

export const apiClient = new ApiClient(API_URL);
