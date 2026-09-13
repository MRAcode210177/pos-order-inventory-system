import { z } from 'zod';
import type { CreateProductRequest, UpdateStockRequest } from '@pos/shared-types';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  sku: z.string().min(1, 'SKU is required').max(64),
  priceCents: z.number().int().nonnegative('Price must be non-negative'),
  stockQuantity: z.number().int().nonnegative('Stock quantity must be non-negative'),
  category: z.string().max(64).optional(),
  imageUrl: z.string().url().max(512).optional(),
}) satisfies z.ZodType<CreateProductRequest>;

export const updateStockSchema = z.object({
  quantityDelta: z.number().int(),
}) satisfies z.ZodType<UpdateStockRequest>;
