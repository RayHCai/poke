/**
 * Selfie rating routes
 * Handles selfie upload and Gemini-based attractiveness rating
 */
import { Router } from 'express';
import { supabase } from '../db/supabase';
import { rateFaceWithGemini, validateImageBase64 } from '../services/gemini';

const router = Router();

/**
 * POST /api/v1/selfie/rate
 * Upload selfie and get attractiveness rating from Gemini
 */
router.post('/rate', async (req, res, next) => {
    try {
        const { userId, imageBase64 } = req.body;

        // Validate input
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({
                error: 'INVALID_USER_ID',
                message: 'Valid user ID is required',
            });
        }

        if (!imageBase64 || typeof imageBase64 !== 'string') {
            return res.status(400).json({
                error: 'INVALID_IMAGE',
                message: 'Base64 encoded image is required',
            });
        }

        // Validate image format and size
        if (!validateImageBase64(imageBase64)) {
            return res.status(400).json({
                error: 'INVALID_IMAGE_FORMAT',
                message: 'Invalid image format or size (max 5MB)',
            });
        }

        // Verify user exists
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_id, face_rating')
            .eq('user_id', userId)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({
                error: 'USER_NOT_FOUND',
                message: 'User profile not found',
            });
        }

        // Check if user already has a rating (optional - remove if re-rating is allowed)
        if (profile.face_rating !== null) {
            return res.status(200).json({
                rating: profile.face_rating,
                cached: true,
            });
        }

        // Get rating from Gemini
        let rating: number;
        try {
            rating = await rateFaceWithGemini(imageBase64);
        } catch (geminiError) {
            console.error('Gemini rating error:', geminiError);
            return res.status(503).json({
                error: 'RATING_SERVICE_ERROR',
                message:
                    geminiError instanceof Error
                        ? geminiError.message
                        : 'Failed to process image',
            });
        }

        // Store rating in database
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ face_rating: rating })
            .eq('user_id', userId);

        if (updateError) {
            console.error('Database update error:', updateError);
            return res.status(500).json({
                error: 'DATABASE_ERROR',
                message: 'Failed to save rating',
            });
        }

        // Return rating
        res.status(200).json({
            rating,
            cached: false,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v1/selfie/rating/:userId
 * Get stored face rating for a user
 */
router.get('/rating/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('face_rating')
            .eq('user_id', userId)
            .single();

        if (error || !profile) {
            return res.status(404).json({
                error: 'USER_NOT_FOUND',
                message: 'User profile not found',
            });
        }

        res.status(200).json({
            rating: profile.face_rating,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
