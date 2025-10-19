/**
 * Central error handling middleware
 */
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  const response: ApiError = {
    code: 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred',
  };

  res.status(500).json(response);
}
