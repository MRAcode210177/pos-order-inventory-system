import { z } from 'zod';
import type { CreateProductRequest, UpdateStockRequest, UpdateProductRequest } from '@pos/shared-types';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  sku: z.string().min(1, 'SKU is required').max(64),
  priceCents: z.number().int().nonnegative('Price must be non-negative'),
  stockQuantity: z.number().int().nonnegative('Stock quantity must be non-negative'),
  category: z.string().max(64).optional(),
  imageUrl: z.string().url().max(512).optional(),
  isActive: z.boolean().optional(),
}) satisfies z.ZodType<CreateProductRequest>;

export const updateStockSchema = z.object({
  quantityDelta: z.number().int(),
}) satisfies z.ZodType<UpdateStockRequest>;

export const updateProductSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(255).optional(),
  sku: z.string().min(1, 'SKU cannot be empty').max(64).optional(),
  priceCents: z.number().int().nonnegative('Price must be non-negative').optional(),
  stockQuantity: z.number().int().nonnegative('Stock quantity must be non-negative').optional(),
  category: z.string().max(64).optional(),
  imageUrl: z.string().url('Invalid image URL format').max(512).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
}) satisfies z.ZodType<UpdateProductRequest>;


