import { db } from '../db/index.js';
import { products, orders, orderItems, payments } from '../db/schema.js';
import { sql, eq, desc } from 'drizzle-orm';
import { AppError } from '../errors/AppError.js';
import { toProduct, type ProductRow } from '../db/rawTypes.js';
import type { CreateOrderRequest, OrderDto, OrderStatus, PaginationMeta } from '@pos/shared-types';

export async function createOrder(request: CreateOrderRequest): Promise<OrderDto> {
  return db.transaction(async (tx: any) => {
    let totalCents = 0;
    const lineItems: (typeof orderItems.$inferInsert)[] = [];
    const itemDetails: { productId: string; quantity: number; unitPriceCents: number; productName: string }[] = [];

    // Sort items by productId deterministically to prevent cross-transaction deadlocks
    const sortedItems = [...request.items].sort((a, b) => a.productId.localeCompare(b.productId));

    for (const item of sortedItems) {
      // Execute row-locking query: SELECT * FROM products WHERE id = $1 FOR UPDATE
      const result = await tx.execute(
        sql`SELECT id, name, sku, price_cents, stock_quantity, version, category, image_url, created_at FROM products WHERE id = ${item.productId} FOR UPDATE`
      );

      // PGlite returns { rows: [...] }, postgres.js returns Array directly
      const rows: ProductRow[] = Array.isArray(result) ? result : (result?.rows ?? []);
      const row = rows[0];

      if (!row) {
        throw new AppError('NOT_FOUND', `Product with ID ${item.productId} not found`);
      }

      const product = toProduct(row);

      if (product.stockQuantity < item.quantity) {
        throw new AppError(
          'INSUFFICIENT_STOCK',
          `Insufficient stock for '${product.name}'. Requested: ${item.quantity}, Available: ${product.stockQuantity}`
        );
      }

      // Decrement stock quantity atomically within transaction
      await tx
        .update(products)
        .set({
          stockQuantity: product.stockQuantity - item.quantity,
          version: sql`${products.version} + 1`,
        })
        .where(eq(products.id, item.productId));

      totalCents += product.priceCents * item.quantity;

      lineItems.push({
        orderId: '', // placeholder, populated after order insertion
        productId: item.productId,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
      });

      itemDetails.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
        productName: product.name,
      });
    }

    // Create order in RESERVED state with a 5-minute expiry window (per assessment spec)
    const reservationExpiry = new Date(Date.now() + 5 * 60 * 1000);

    const [order] = await tx
      .insert(orders)
      .values({
        status: 'RESERVED',
        totalCents,
        expiresAt: reservationExpiry,
      })
      .returning();

    if (!order) {
      throw new AppError('VALIDATION_ERROR', 'Order creation failed unexpectedly');
    }

    // Insert order line items
    await tx.insert(orderItems).values(
      lineItems.map((li) => ({
        ...li,
        orderId: order.id,
      }))
    );

    return {
      id: order.id,
      status: order.status as OrderStatus,
      totalCents: order.totalCents,
      expiresAt: order.expiresAt ? new Date(order.expiresAt).toISOString() : null,
      createdAt: new Date(order.createdAt).toISOString(),
      items: itemDetails,
    };
  });
}

export async function getOrderById(orderId: string): Promise<OrderDto> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    throw new AppError('NOT_FOUND', `Order with ID ${orderId} not found`);
  }

  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      quantity: orderItems.quantity,
      unitPriceCents: orderItems.unitPriceCents,
      productName: products.name,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));

  const [paymentRecord] = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(desc(payments.createdAt))
    .limit(1);

  return {
    id: order.id,
    status: order.status as OrderStatus,
    totalCents: order.totalCents,
    expiresAt: order.expiresAt ? new Date(order.expiresAt).toISOString() : null,
    createdAt: new Date(order.createdAt).toISOString(),
    items: items.map((i: any) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
      productName: i.productName ?? 'Product',
    })),
    payment: paymentRecord
      ? {
          id: paymentRecord.id,
          status: paymentRecord.status,
          transactionId: paymentRecord.transactionId ?? undefined,
          createdAt: new Date(paymentRecord.createdAt).toISOString(),
        }
      : null,
  };
}

export async function listOrders(
  statusFilter?: OrderStatus,
  page?: number,
  limit?: number
): Promise<{ items: OrderDto[]; pagination: PaginationMeta }> {
  const whereClause = statusFilter ? eq(orders.status, statusFilter) : undefined;

  // Calculate total matching records
  const [countResult] = await db
    .select({ total: sql<number>`cast(count(*) as integer)` })
    .from(orders)
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
    .from(orders)
    .where(whereClause)
    .orderBy(desc(orders.createdAt));

  if (page || limit) {
    query = query.limit(pageLimit).offset(offset);
  }

  const paginatedOrders = await query;
  const results: OrderDto[] = [];

  for (const order of paginatedOrders) {
    const items = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        unitPriceCents: orderItems.unitPriceCents,
        productName: products.name,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, order.id));

    const [paymentRecord] = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .orderBy(desc(payments.createdAt))
      .limit(1);

    results.push({
      id: order.id,
      status: order.status as OrderStatus,
      totalCents: order.totalCents,
      expiresAt: order.expiresAt ? new Date(order.expiresAt).toISOString() : null,
      createdAt: new Date(order.createdAt).toISOString(),
      items: items.map((i: any) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        productName: i.productName ?? 'Product',
      })),
      payment: paymentRecord
        ? {
            id: paymentRecord.id,
            status: paymentRecord.status,
            transactionId: paymentRecord.transactionId ?? undefined,
            createdAt: new Date(paymentRecord.createdAt).toISOString(),
          }
        : null,
    });
  }

  return {
    items: results,
    pagination: {
      total,
      totalPages,
      currentPage,
      limit: pageLimit,
    },
  };
}

export async function cancelOrder(orderId: string): Promise<OrderDto> {
  return db.transaction(async (tx: any) => {
    const result = await tx.execute(
      sql`SELECT id, status, total_cents, created_at, expires_at FROM orders WHERE id = ${orderId} FOR UPDATE`
    );
    const rows = Array.isArray(result) ? result : (result?.rows ?? []);
    const order = rows[0];

    if (!order) {
      throw new AppError('NOT_FOUND', `Order with ID ${orderId} not found`);
    }

    if (order.status === 'CANCELLED') {
      return getOrderById(orderId);
    }

    if (order.status === 'COMPLETED' || order.status === 'PAID') {
      throw new AppError('INVALID_STATE_TRANSITION', 'Cannot cancel an already completed or paid order');
    }

    // If order was in RESERVED state, release stock back to products
    if (order.status === 'RESERVED' || order.status === 'PENDING') {
      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      for (const item of items) {
        await tx
          .update(products)
          .set({
            stockQuantity: sql`${products.stockQuantity} + ${item.quantity}`,
            version: sql`${products.version} + 1`,
          })
          .where(eq(products.id, item.productId));
      }
    }

    await tx
      .update(orders)
      .set({ status: 'CANCELLED' })
      .where(eq(orders.id, orderId));

    return getOrderById(orderId);
  });
}

export async function expireStaleOrders(): Promise<number> {
  return db.transaction(async (tx: any) => {
    // Select all expired reserved orders using SQL NOW() to prevent Date serialization issues
    const result = await tx.execute(
      sql`SELECT id FROM orders WHERE status = 'RESERVED' AND expires_at <= NOW() FOR UPDATE`
    );
    const expiredRows = Array.isArray(result) ? result : (result?.rows ?? []);

    let count = 0;
    for (const row of expiredRows) {
      const orderId = row.id;

      // Restore inventory
      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      for (const item of items) {
        await tx
          .update(products)
          .set({
            stockQuantity: sql`${products.stockQuantity} + ${item.quantity}`,
            version: sql`${products.version} + 1`,
          })
          .where(eq(products.id, item.productId));
      }

      // Mark order as EXPIRED
      await tx
        .update(orders)
        .set({ status: 'EXPIRED' })
        .where(eq(orders.id, orderId));

      count++;
    }

    return count;
  });
}
