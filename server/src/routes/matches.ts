/**
 * Matches routes
 */
import { Router } from 'express';
import { supabase } from '../db/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/v1/matches
 * Get user's matches
 */
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
      return;
    }

    // Get matches where user is u1 or u2
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id,
        u1,
        u2,
        created_at
      `)
      .or(`u1.eq.${userId},u2.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get other user's profile for each match
    const matchesWithProfiles = await Promise.all(
      (matches || []).map(async (match) => {
        const otherUserId = match.u1 === userId ? match.u2 : match.u1;

        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url, instagram_username')
          .eq('user_id', otherUserId)
          .single();

        const { data: sighting } = await supabase
          .from('sightings')
          .select('lat, lng')
          .eq('user_id', otherUserId)
          .single();

        return {
          matchId: match.id,
          createdAt: match.created_at,
          user: {
            user_id: otherUserId,
            username: profile?.username || 'Unknown',
            display_name: profile?.display_name || 'Unknown',
            avatar_url: profile?.avatar_url,
            instagram_username: profile?.instagram_username,
            distance_km: 0, // TODO: Calculate if needed
            lat: sighting?.lat || 0,
            lng: sighting?.lng || 0,
          },
        };
      })
    );

    res.json(matchesWithProfiles);
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to fetch matches',
    });
  }
});

export default router;
