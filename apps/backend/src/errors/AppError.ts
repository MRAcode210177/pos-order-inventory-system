export type ErrorCode =
  | 'NOT_FOUND'
  | 'INSUFFICIENT_STOCK'
  | 'INVALID_STATE_TRANSITION'
  | 'VALIDATION_ERROR'
  | 'IDEMPOTENCY_CONFLICT'
  | 'PAYMENT_FAILED'
  | 'ORDER_EXPIRED';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  INSUFFICIENT_STOCK: 409,
  INVALID_STATE_TRANSITION: 409,
  VALIDATION_ERROR: 400,
  IDEMPOTENCY_CONFLICT: 409,
  PAYMENT_FAILED: 402,
  ORDER_EXPIRED: 410,
};

export class AppError extends Error {
  readonly statusCode: number;

  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = STATUS_BY_CODE[code] ?? 500;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
