import { z } from 'zod';
import type { CreateOrderRequest, PayOrderRequest } from '@pos/shared-types';

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Invalid product ID'),
        quantity: z.number().int().positive('Quantity must be at least 1'),
      })
    )
    .min(1, 'Order must contain at least one item'),
}) satisfies z.ZodType<CreateOrderRequest>;

export const payOrderSchema = z.object({
  cardNumber: z
    .string()
    .min(12, 'Card number too short')
    .max(19, 'Card number too long'),
  idempotencyKey: z
    .string()
    .min(8, 'Idempotency key must be at least 8 characters')
    .max(128, 'Idempotency key too long'),
}) satisfies z.ZodType<PayOrderRequest>;
