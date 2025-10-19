/**
 * Shared type definitions for PokeDate
 */

export type Sex = 'male' | 'female' | 'nonbinary' | 'other';

export type ThrowStatus = 'pending' | 'hit' | 'miss' | 'expired';

export interface Profile {
    user_id: string;
    username: string;
    display_name: string;
    bio?: string;
    avatar_url?: string;
    sex?: Sex;
    pronouns?: string;
    face_rating?: number;
    instagram_username?: string;
    created_at: string;
}

export interface Preferences {
    user_id: string;
    preferred_sex: Sex[];
    max_distance_km: number;
    is_visible: boolean;
}

export interface Sighting {
    user_id: string;
    lat: number;
    lng: number;
    accuracy_m?: number;
    updated_at: string;
}

export interface Throw {
    id: string;
    thrower_id: string;
    target_id: string;
    created_at: string;
    status: ThrowStatus;
}

export interface Match {
    id: string;
    u1: string;
    u2: string;
    created_at: string;
}

export interface NearbyUser {
    user_id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    instagram_username?: string;
    distance_km: number;
    lat: number;
    lng: number;
}

export interface IncomingThrow {
    throwId: string;
    createdAt: string;
    thrower: {
        userId: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
}

export interface ThrowHistory {
    throwId: string;
    createdAt: string;
    status: 'hit' | 'miss';
    isTarget: boolean;
    thrower: {
        userId: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
}

export interface ApiError {
    code: string;
    message: string;
}

export interface SelfieCaptureResponse {
    rating: number;
    cached: boolean;
}

export interface SelfieRatingRequest {
    userId: string;
    imageBase64: string;
}
