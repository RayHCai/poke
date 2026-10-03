/**
 * Throw routes - throw pokeball, resolve throws
 */
import { Router } from 'express';
import { supabase } from '../db/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { throwLimiter } from '../middleware/rateLimit';
import { isWithinRadius } from '../services/geo';
import { io } from '../sockets';

const router = Router();

const THROW_COOLDOWN_MS = 10000; // 10 seconds
// MVP behavior: an accepted throw creates a match even without a reciprocal throw
const AUTO_MATCH_ON_HIT: boolean = true;
const MAX_THROW_DISTANCE_KM = 10; // Maximum throw distance

/**
 * POST /api/v1/throw
 * Throw pokeball at target
 */
router.post(
    '/',
    authMiddleware,
    throwLimiter,
    async (req: AuthRequest, res) => {
        try {
            const throwerId = req.user?.id;
            if (!throwerId) {
                res.status(401).json({
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                });
                return;
            }

            const { targetUserId } = req.body;

            if (!targetUserId) {
                res.status(400).json({
                    code: 'INVALID_INPUT',
                    message: 'Target user ID required',
                });
                return;
            }

            // Can't throw at yourself
            if (throwerId === targetUserId) {
                res.status(400).json({
                    code: 'INVALID_TARGET',
                    message: 'Cannot throw at yourself',
                });
                return;
            }

            // Check if already matched
            const [u1, u2] = [throwerId, targetUserId].sort();
            const { data: existingMatch } = await supabase
                .from('matches')
                .select('id')
                .eq('u1', u1)
                .eq('u2', u2)
                .single();

            if (existingMatch) {
                res.status(409).json({
                    code: 'ALREADY_MATCHED',
                    message: 'You are already matched with this user',
                });
                return;
            }

            // Check cooldown
            const { data: recentThrows } = await supabase
                .from('throws')
                .select('created_at')
                .eq('thrower_id', throwerId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (recentThrows && recentThrows.length > 0) {
                const lastThrow = new Date(
                    recentThrows[0].created_at
                ).getTime();
                const timeSince = Date.now() - lastThrow;

                if (timeSince < THROW_COOLDOWN_MS) {
                    res.status(429).json({
                        code: 'COOLDOWN',
                        message: 'Please wait before throwing again',
                        retryAfter: Math.ceil(
                            (THROW_COOLDOWN_MS - timeSince) / 1000
                        ),
                    });
                    return;
                }
            }

            // Get both users' locations
            const { data: throwerLocation } = await supabase
                .from('sightings')
                .select('lat, lng')
                .eq('user_id', throwerId)
                .single();

            const { data: targetLocation } = await supabase
                .from('sightings')
                .select('lat, lng')
                .eq('user_id', targetUserId)
                .single();

            if (!throwerLocation || !targetLocation) {
                res.status(400).json({
                    code: 'LOCATION_UNAVAILABLE',
                    message: 'Location not available',
                });
                return;
            }

            // Validate distance
            if (
                !isWithinRadius(
                    throwerLocation.lat,
                    throwerLocation.lng,
                    targetLocation.lat,
                    targetLocation.lng,
                    MAX_THROW_DISTANCE_KM
                )
            ) {
                res.status(400).json({
                    code: 'OUT_OF_RANGE',
                    message: 'Target is too far away',
                });
                return;
            }

            // Create throw
            const { data: throwData, error } = await supabase
                .from('throws')
                .insert({
                    thrower_id: throwerId,
                    target_id: targetUserId,
                    status: 'pending',
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    // Unique constraint violation
                    res.status(409).json({
                        code: 'ALREADY_THROWN',
                        message: 'You already threw at this user',
                    });
                    return;
                }
                throw error;
            }

            // Get thrower profile for notification
            const { data: throwerProfile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('user_id', throwerId)
                .single();

            // Emit socket event to target
            io.to(targetUserId).emit('throw:incoming', {
                throwId: throwData.id,
                thrower: {
                    username: throwerProfile?.username || 'Unknown',
                    avatarUrl: throwerProfile?.avatar_url,
                },
            });

            console.info(`Throw created: ${throwerId} -> ${targetUserId}`);

            res.json({ throwId: throwData.id });
        } catch (error) {
            console.error('Throw error:', error);
            res.status(500).json({
                code: 'INTERNAL_ERROR',
                message:
                    error instanceof Error ? error.message : 'Failed to throw',
            });
        }
    }
);

/**
 * GET /api/v1/throw/incoming
 * Get pending incoming throws
 */
router.get('/incoming', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }

        // Get pending throws targeting this user
        const { data: throws, error } = await supabase
            .from('throws')
            .select('id, thrower_id, target_id, created_at, status')
            .eq('target_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        // Get thrower profiles separately
        const throwsData = throws || [];

        if (throwsData.length === 0) {
            res.json([]);
            return;
        }

        const throwerIds = throws?.map((t) => t.thrower_id) || [];
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .in('user_id', throwerIds);

        if (profilesError) {
            throw profilesError;
        }

        // Map profiles by user_id for quick lookup
        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

        // Transform response
        const incomingThrows =
            throws?.map((t) => {
                const profile = profileMap.get(t.thrower_id);
                return {
                    throwId: t.id,
                    createdAt: t.created_at,
                    thrower: {
                        userId: t.thrower_id,
                        username: profile?.username || 'Unknown',
                        displayName: profile?.display_name || 'Unknown',
                        avatarUrl: profile?.avatar_url,
                    },
                };
            }) || [];

        res.json(incomingThrows);
    } catch (error) {
        console.error('Get incoming throws error:', error);
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            message:
                error instanceof Error
                    ? error.message
                    : 'Failed to get incoming throws',
        });
    }
});

/**
 * GET /api/v1/throw/history
 * Get resolved throws (accepted/declined) history
 */
router.get('/history', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }

        // Get resolved throws (hit or miss) involving this user
        const { data: throws, error } = await supabase
            .from('throws')
            .select('id, thrower_id, target_id, created_at, status')
            .or(`target_id.eq.${userId},thrower_id.eq.${userId}`)
            .in('status', ['hit', 'miss'])
            .order('created_at', { ascending: false })
            .limit(50); // Limit to most recent 50

        if (error) {
            throw error;
        }

        // Get thrower profiles separately
        const throwerIds = throws?.map((t) => t.thrower_id) || [];

        if (throwerIds.length === 0) {
            res.json([]);
            return;
        }

        const targetIds = throws?.map((t) => t.target_id) || [];

        const relevantUserIds = [...throwerIds, ...targetIds];

        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .in('user_id', relevantUserIds);

        if (profilesError) {
            throw profilesError;
        }

        // Map profiles by user_id for quick lookup
        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

        // Transform response
        const historyThrows =
            throws?.map((t) => {
                const isTarget = t.target_id === userId;
                const relevantUserId = !isTarget ? t.target_id : t.thrower_id;
                const profile = profileMap.get(relevantUserId);

                return {
                    throwId: t.id,
                    createdAt: t.created_at,
                    status: t.status,
                    isTarget,
                    thrower: {
                        userId: relevantUserId,
                        username: profile?.username || 'Unknown',
                        displayName: profile?.display_name || 'Unknown',
                        avatarUrl: profile?.avatar_url,
                    },
                };
            }) || [];

        res.json(historyThrows);
    } catch (error) {
        console.error('Get throw history error:', error);
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            message:
                error instanceof Error
                    ? error.message
                    : 'Failed to get throw history',
        });
    }
});

/**
 * POST /api/v1/throw/resolve
 * Resolve throw (accept/decline)
 */
router.post('/resolve', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
            return;
        }

        const { throwId, result } = req.body;

        if (!throwId || !['hit', 'miss'].includes(result)) {
            res.status(400).json({
                code: 'INVALID_INPUT',
                message: 'Invalid throw resolution',
            });
            return;
        }

        // Get throw
        const { data: throwData, error: throwError } = await supabase
            .from('throws')
            .select('*')
            .eq('id', throwId)
            .eq('target_id', userId) // Must be the target
            .eq('status', 'pending') // Must be pending
            .single();

        if (throwError || !throwData) {
            res.status(404).json({
                code: 'THROW_NOT_FOUND',
                message: 'Throw not found or already resolved',
            });
            return;
        }

        // Update throw status
        await supabase
            .from('throws')
            .update({ status: result })
            .eq('id', throwId);

        let matched = false;

        // If hit, check for reciprocal throw or create match
        if (result === 'hit') {
            // Check if target also threw at thrower
            const { data: reciprocalThrow } = await supabase
                .from('throws')
                .select('*')
                .eq('thrower_id', userId)
                .eq('target_id', throwData.thrower_id)
                .eq('status', 'hit')
                .single();

            // Create match if reciprocal or auto-match
            if (reciprocalThrow || AUTO_MATCH_ON_HIT) {
                const [u1, u2] = [throwData.thrower_id, userId].sort();

                const { data: matchData, error: matchError } = await supabase
                    .from('matches')
                    .insert({ u1, u2 })
                    .select()
                    .single();

                if (!matchError && matchData) {
                    matched = true;

                    // Get profiles for notifications
                    const { data: throwerProfile } = await supabase
                        .from('profiles')
                        .select('username, avatar_url, user_id')
                        .eq('user_id', throwData.thrower_id)
                        .single();

                    const { data: targetProfile } = await supabase
                        .from('profiles')
                        .select('username, avatar_url, user_id')
                        .eq('user_id', userId)
                        .single();

                    // Emit match events to both users
                    io.to(throwData.thrower_id).emit('match:new', {
                        matchId: matchData.id,
                        user: {
                            username: targetProfile?.username || 'Unknown',
                            avatarUrl: targetProfile?.avatar_url,
                        },
                    });

                    io.to(userId).emit('match:new', {
                        matchId: matchData.id,
                        user: {
                            username: throwerProfile?.username || 'Unknown',
                            avatarUrl: throwerProfile?.avatar_url,
                        },
                    });

                    console.info(`Match created: ${u1} <-> ${u2}`);
                }
            }
        }

        // Emit result to thrower
        io.to(throwData.thrower_id).emit('throw:result', {
            throwId,
            result,
        });

        res.json({ matched });
    } catch (error) {
        console.error('Resolve throw error:', error);
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            message:
                error instanceof Error
                    ? error.message
                    : 'Failed to resolve throw',
        });
    }
});

export default router;
