import { db } from '../db/index.js';
import { products } from '../db/schema.js';
import { eq, ilike, and, desc, sql } from 'drizzle-orm';
import { AppError } from '../errors/AppError.js';
import type { ProductDto, CreateProductRequest } from '@pos/shared-types';

export async function listProducts(search?: string, category?: string): Promise<ProductDto[]> {
  const conditions = [];

  if (search && search.trim() !== '') {
    conditions.push(ilike(products.name, `%${search.trim()}%`));
  }

  if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
    conditions.push(eq(products.category, category.trim()));
  }

  const rows = await db
    .select()
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(products.createdAt));

  return rows.map((p: typeof products.$inferSelect) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    priceCents: p.priceCents,
    stockQuantity: p.stockQuantity,
    version: p.version,
    category: p.category ?? 'General',
    imageUrl: p.imageUrl ?? undefined,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function getProductById(id: string): Promise<ProductDto> {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!product) {
    throw new AppError('NOT_FOUND', `Product with ID ${id} not found`);
  }

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    priceCents: product.priceCents,
    stockQuantity: product.stockQuantity,
    version: product.version,
    category: product.category ?? 'General',
    imageUrl: product.imageUrl ?? undefined,
    createdAt: product.createdAt.toISOString(),
  };
}

export async function createProduct(data: CreateProductRequest): Promise<ProductDto> {
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.sku, data.sku))
    .limit(1);

  if (existing) {
    throw new AppError('VALIDATION_ERROR', `Product SKU '${data.sku}' already exists`);
  }

  const [inserted] = await db
    .insert(products)
    .values({
      name: data.name,
      sku: data.sku,
      priceCents: data.priceCents,
      stockQuantity: data.stockQuantity,
      category: data.category ?? 'General',
      imageUrl: data.imageUrl ?? null,
    })
    .returning();

  if (!inserted) {
    throw new AppError('VALIDATION_ERROR', 'Failed to create product');
  }

  return {
    id: inserted.id,
    name: inserted.name,
    sku: inserted.sku,
    priceCents: inserted.priceCents,
    stockQuantity: inserted.stockQuantity,
    version: inserted.version,
    category: inserted.category ?? 'General',
    imageUrl: inserted.imageUrl ?? undefined,
    createdAt: inserted.createdAt.toISOString(),
  };
}

export async function updateStock(id: string, delta: number): Promise<ProductDto> {
  return db.transaction(async (tx: any) => {
    const [existing] = await tx
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      throw new AppError('NOT_FOUND', `Product with ID ${id} not found`);
    }

    const newStock = existing.stockQuantity + delta;
    if (newStock < 0) {
      throw new AppError(
        'INSUFFICIENT_STOCK',
        `Cannot reduce stock by ${Math.abs(delta)}. Current stock is ${existing.stockQuantity}.`
      );
    }

    const [updated] = await tx
      .update(products)
      .set({
        stockQuantity: newStock,
        version: sql`${products.version} + 1`,
      })
      .where(eq(products.id, id))
      .returning();

    return {
      id: updated.id,
      name: updated.name,
      sku: updated.sku,
      priceCents: updated.priceCents,
      stockQuantity: updated.stockQuantity,
      version: updated.version,
      category: updated.category ?? 'General',
      imageUrl: updated.imageUrl ?? undefined,
      createdAt: updated.createdAt.toISOString(),
    };
  });
}
