import type { ErrorHandler } from 'hono';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    return c.json({
      success: false,
      error: {
        code:    err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    }, err.status as any);
  }

  logger.error('Unhandled error', { message: err.message, stack: err.stack });

  return c.json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  }, 500);
};
