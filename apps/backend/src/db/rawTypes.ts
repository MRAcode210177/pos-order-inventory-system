import type { Product } from './schema.js';

// Raw sql`` results come back as snake_case rows — this maps them to the same
// shape as Drizzle's inferred Product type so the rest of the app never sees `unknown`.
export interface ProductRow {
  id: string;
  name: string;
  sku: string;
  price_cents: number;
  stock_quantity: number;
  version: number;
  category: string | null;
  image_url: string | null;
  created_at: Date | string;
}

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    priceCents: row.price_cents,
    stockQuantity: row.stock_quantity,
    version: row.version,
    category: row.category ?? 'General',
    imageUrl: row.image_url ?? null,
    createdAt: typeof row.created_at === 'string' ? new Date(row.created_at) : row.created_at,
  };
}
