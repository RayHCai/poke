/**
 * API v1 routes
 */
import { Router } from 'express';
import locationRouter from './location';
import usersRouter from './users';
import throwRouter from './throw';
import matchesRouter from './matches';
import selfieRouter from './selfie';

const router = Router();

router.use('/location', locationRouter);
router.use('/users', usersRouter);
router.use('/throw', throwRouter);
router.use('/matches', matchesRouter);
router.use('/selfie', selfieRouter);

export default router;
