/**
 * Main router combining all routes
 */
import { Router } from 'express';
import healthRouter from './health';
import apiV1Router from './api';

const router = Router();

// Health check (no auth required)
router.use('/', healthRouter);

// API v1 routes
router.use('/api/v1', apiV1Router);

export default router;
