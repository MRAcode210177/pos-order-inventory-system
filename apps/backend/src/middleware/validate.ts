import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../errors/AppError.js';

export const validate = (schema: ZodSchema): RequestHandler => {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      return next(
        new AppError('VALIDATION_ERROR', `Validation failed: ${messages}`, result.error.format())
      );
    }
    req.body = result.data;
    next();
  };
};
