/**
 * Authentication middleware
 */
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabase';
import { AuthUser } from '../types';

export interface AuthRequest extends Request {
    user?: AuthUser;
}

/**
 * Verify JWT token from Authorization header
 */
export async function authMiddleware(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                code: 'UNAUTHORIZED',
                message: 'Missing or invalid authorization header',
            });
            return;
        }

        const token = authHeader.substring(7);

        const {
            data: { user },
            error,
        } = await supabase.auth.getUser(token);

        if (error || !user) {
            res.status(401).json({
                code: 'UNAUTHORIZED',
                message: 'Invalid token',
            });
            return;
        }

        req.user = {
            id: user.id,
            email: user.email,
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            code: 'INTERNAL_ERROR',
            message: 'Authentication failed',
        });
    }
}
