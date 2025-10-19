/**
 * Location update routes
 */
import { Router } from 'express';
import { supabase } from '../db/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { io } from '../sockets';

const router = Router();

/**
 * POST /api/v1/location/update
 * Update user's location
 */
router.post('/update', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            res.status(401).json({
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }

        const { lat, lng, accuracyM } = req.body;

        if (typeof lat !== 'number' || typeof lng !== 'number') {
            res.status(400).json({
                code: 'INVALID_INPUT',
                message: 'Invalid coordinates',
            });
            return;
        }

        // Validate coordinates
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            res.status(400).json({
                code: 'INVALID_INPUT',
                message: 'Coordinates out of range',
            });
            return;
        }
        

        // Upsert sighting
        const { error } = await supabase.from('sightings').upsert({
            user_id: userId,
            lat,
            lng,
            accuracy_m: accuracyM,
            updated_at: new Date().toISOString(),
        });

        if (error) throw error;

        // Emit socket event for nearby users
        // TODO: Optimize to only emit to users within range
        io.emit('nearby:update', { userId, lat, lng });

        console.info(`Location updated for user ${userId}: ${lat}, ${lng}`);

        res.json({ success: true });
    } catch (error) {
        console.error('Location update error:', error);
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            message:
                error instanceof Error
                    ? error.message
                    : 'Failed to update location',
        });
    }
});

export default router;
