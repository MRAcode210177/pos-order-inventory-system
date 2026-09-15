import { db } from '../db/index.js';
import { products, orderItems } from '../db/schema.js';
import { eq, ne, ilike, and, desc, sql } from 'drizzle-orm';
import { AppError } from '../errors/AppError.js';
import type { ProductDto, CreateProductRequest, UpdateProductRequest, PaginationMeta } from '@pos/shared-types';

export async function listProducts(
  search?: string,
  category?: string,
  includeInactive: boolean = false,
  page?: number,
  limit?: number
): Promise<{ items: ProductDto[]; pagination: PaginationMeta }> {
  const conditions = [];

  // Filter out inactive products unless explicitly requested (e.g. for Inventory Management)
  if (!includeInactive) {
    conditions.push(eq(products.isActive, true));
  }

  if (search && search.trim() !== '') {
    conditions.push(ilike(products.name, `%${search.trim()}%`));
  }

  if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
    conditions.push(eq(products.category, category.trim()));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Calculate total matching records
  const [countResult] = await db
    .select({ total: sql<number>`cast(count(*) as integer)` })
    .from(products)
    .where(whereClause);

  const total = Number(countResult?.total ?? 0);
  // Sanitize limit (clamp between 1 and 100 to prevent DoS memory exhaustion)
  const pageLimit = Math.min(Math.max(1, limit && limit > 0 ? limit : (page ? 10 : (total > 0 ? total : 10))), 100);
  const totalPages = Math.max(1, Math.ceil(total / pageLimit));
  // Sanitize page (clamp minimum to 1)
  const currentPage = Math.max(1, page && page > 0 ? page : 1);
  const offset = (currentPage - 1) * pageLimit;

  let query = db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(desc(products.createdAt));

  if (page || limit) {
    query = query.limit(pageLimit).offset(offset);
  }

  const rows = await query;

  const items = rows.map((p: typeof products.$inferSelect) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    priceCents: p.priceCents,
    stockQuantity: p.stockQuantity,
    version: p.version,
    category: p.category ?? 'General',
    imageUrl: p.imageUrl ?? undefined,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
  }));

  return {
    items,
    pagination: {
      total,
      totalPages,
      currentPage,
      limit: pageLimit,
    },
  };
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
    isActive: product.isActive,
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
      isActive: data.isActive ?? true,
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
    isActive: inserted.isActive,
    createdAt: inserted.createdAt.toISOString(),
  };
}

export async function updateProduct(id: string, data: UpdateProductRequest): Promise<ProductDto> {
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!existing) {
    throw new AppError('NOT_FOUND', `Product with ID ${id} not found`);
  }

  // If SKU is being modified, verify uniqueness against other products
  if (data.sku && data.sku !== existing.sku) {
    const [skuConflict] = await db
      .select()
      .from(products)
      .where(and(eq(products.sku, data.sku), ne(products.id, id)))
      .limit(1);

    if (skuConflict) {
      throw new AppError('VALIDATION_ERROR', `Product SKU '${data.sku}' is already in use by another product`);
    }
  }

  const [updated] = await db
    .update(products)
    .set({
      name: data.name ?? existing.name,
      sku: data.sku ?? existing.sku,
      priceCents: data.priceCents ?? existing.priceCents,
      stockQuantity: data.stockQuantity ?? existing.stockQuantity,
      category: data.category !== undefined ? data.category : existing.category,
      imageUrl: data.imageUrl !== undefined ? (data.imageUrl ? data.imageUrl : null) : existing.imageUrl,
      isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      version: sql`${products.version} + 1`,
    })
    .where(eq(products.id, id))
    .returning();

  if (!updated) {
    throw new AppError('VALIDATION_ERROR', 'Failed to update product details');
  }

  return {
    id: updated.id,
    name: updated.name,
    sku: updated.sku,
    priceCents: updated.priceCents,
    stockQuantity: updated.stockQuantity,
    version: updated.version,
    category: updated.category ?? 'General',
    imageUrl: updated.imageUrl ?? undefined,
    isActive: updated.isActive,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function toggleProductStatus(id: string): Promise<ProductDto> {
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!existing) {
    throw new AppError('NOT_FOUND', `Product with ID ${id} not found`);
  }

  const [updated] = await db
    .update(products)
    .set({
      isActive: !existing.isActive,
      version: sql`${products.version} + 1`,
    })
    .where(eq(products.id, id))
    .returning();

  if (!updated) {
    throw new AppError('VALIDATION_ERROR', 'Failed to toggle product status');
  }

  return {
    id: updated.id,
    name: updated.name,
    sku: updated.sku,
    priceCents: updated.priceCents,
    stockQuantity: updated.stockQuantity,
    version: updated.version,
    category: updated.category ?? 'General',
    imageUrl: updated.imageUrl ?? undefined,
    isActive: updated.isActive,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function deleteProduct(id: string): Promise<{ id: string; name: string }> {
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!existing) {
    throw new AppError('NOT_FOUND', `Product with ID ${id} not found`);
  }

  // Check Foreign Key constraints: prevent deleting products linked to past order items
  const [orderItemRef] = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .where(eq(orderItems.productId, id))
    .limit(1);

  if (orderItemRef) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Cannot delete product '${existing.name}' (${existing.sku}) because it is referenced in completed or active orders. To preserve historical receipt data, toggle status to Inactive/Archived instead.`
    );
  }

  await db.delete(products).where(eq(products.id, id));

  return {
    id: existing.id,
    name: existing.name,
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
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
    };
  });
}


