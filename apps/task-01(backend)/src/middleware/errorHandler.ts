import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';
import type { ApiResult } from '@pos/shared-types';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const isAppError = err instanceof AppError;

  const body: ApiResult<never> = isAppError
    ? {
        ok: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
      }
    : {
        ok: false,
        error: {
          code: 'INTERNAL',
          message: err?.message || 'Internal Server Error',
        },
      };

  const status = isAppError ? err.statusCode : 500;

  if (isAppError) {
    console.warn(`❌ [AppError ${status}] ${err.code}: ${err.message} on ${req.method} ${req.originalUrl}`);
  } else {
    console.error(`💥 [ServerError 500] Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(status).json(body);
};
