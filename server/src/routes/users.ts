/**
 * Users routes - nearby users, etc.
 */
import { Router } from 'express';
import { supabase } from '../db/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { haversineDistance, getBoundingBox } from '../services/geo';
import type { NearbyUser } from '../types';

const router = Router();

/**
 * GET /api/v1/users/nearby
 * Get nearby users within radius
 */
router.get('/nearby', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }

        const lat = parseFloat(req.query.lat as string);
        const lng = parseFloat(req.query.lng as string);
        const radiusKm = req.query.radiusKm
            ? parseFloat(req.query.radiusKm as string)
            : 10; // Default 10km radius

        if (isNaN(lat) || isNaN(lng)) {
            res.status(400).json({
                code: 'INVALID_INPUT',
                message: 'Invalid coordinates',
            });
            return;
        }

        const searchRadius = radiusKm;
        const bbox = getBoundingBox(lat, lng, searchRadius);

        // Query sightings within bounding box
        const { data: sightings, error } = await supabase
            .from('sightings')
            .select('user_id, lat, lng')
            .gte('lat', bbox.minLat)
            .lte('lat', bbox.maxLat)
            .gte('lng', bbox.minLng)
            .lte('lng', bbox.maxLng);

        if (error) throw error;

        if (!sightings || sightings.length === 0) {
            res.json([]);
            return;
        }

        // Get user IDs from sightings
        const userIds = sightings.map((s) => s.user_id);

        // Get pending throws from current user
        const { data: pendingThrows } = await supabase
            .from('throws')
            .select('target_id')
            .eq('thrower_id', userId)
            .eq('status', 'pending');

        const pendingThrowUserIds = new Set(
            (pendingThrows || []).map((t) => t.target_id)
        );

        // Get matched users
        const { data: matches } = await supabase
            .from('matches')
            .select('u1, u2')
            .or(`u1.eq.${userId},u2.eq.${userId}`);

        const matchedUserIds = new Set(
            (matches || []).map((m) => (m.u1 === userId ? m.u2 : m.u1))
        );

        // Get users that threw to the current user and are pending or denied
        const { data: incomingThrows } = await supabase
            .from('throws')
            .select('thrower_id, status')
            .eq('target_id', userId)
            .in('status', ['pending', 'miss']);

        (incomingThrows || []).forEach((t) =>
            pendingThrowUserIds.add(t.thrower_id)
        );

        // Fetch profiles and preferences for these users
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url, sex')
            .in('user_id', userIds);

        if (profilesError) throw profilesError;

        // Create lookup maps for quick access
        const profileMap = new Map(
            (profiles || []).map((p) => [p.user_id, p])
        );

        // Filter by exact distance and preferences
        const nearbyUsers: NearbyUser[] = sightings
            .map((s) => {
                const profile = profileMap.get(s.user_id);

                // Calculate exact distance
                const distance = haversineDistance(lat, lng, s.lat, s.lng);

                // Skip if out of range
                if (distance > searchRadius) return null;

                // Skip if already thrown to (pending)
                if (pendingThrowUserIds.has(s.user_id)) return null;

                // Skip if already matched
                if (matchedUserIds.has(s.user_id)) return null;

                // Skip if incoming throw is pending or denied
                if (incomingThrows?.some((t) => t.thrower_id === s.user_id))
                    return null;

                return {
                    user_id: s.user_id,
                    username: profile?.username || 'Unknown',
                    display_name: profile?.display_name || 'Unknown',
                    avatar_url: profile?.avatar_url,
                    distance_km: distance,
                    lat: s.lat,
                    lng: s.lng,
                };
            })
            .filter((u) => u !== null)
            .sort((a, b) => a.distance_km - b.distance_km); // Sort by distance

        res.json(nearbyUsers);
    } catch (error) {
        console.error('Nearby users error:', error);
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            message:
                error instanceof Error
                    ? error.message
                    : 'Failed to fetch nearby users',
        });
    }
});

export default router;
