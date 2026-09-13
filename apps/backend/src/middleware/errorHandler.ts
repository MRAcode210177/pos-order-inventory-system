import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';
import type { ApiResult } from '@pos/shared-types';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const body: ApiResult<never> = err instanceof AppError
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

  const status = err instanceof AppError ? err.statusCode : 500;
  if (!(err instanceof AppError)) {
    console.error('Unhandled server error:', err);
  }
  res.status(status).json(body);
};
