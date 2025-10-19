/**
 * Shared type definitions for server
 * TODO: Unify with app types in a shared package
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

export interface ApiError {
  code: string;
  message: string;
}

export interface AuthUser {
  id: string;
  email?: string;
}

export interface SelfieRatingRequest {
  userId: string;
  imageBase64: string;
}

export interface SelfieRatingResponse {
  rating: number;
  cached: boolean;
}
