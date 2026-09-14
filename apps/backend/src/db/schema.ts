import { pgTable, uuid, varchar, integer, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { ORDER_STATUSES } from '@pos/shared-types';

export const orderStatusEnum = pgEnum('order_status', ORDER_STATUSES);

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 64 }).notNull().unique(),
  priceCents: integer('price_cents').notNull(),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  version: integer('version').notNull().default(0),
  category: varchar('category', { length: 64 }).default('General'),
  imageUrl: varchar('image_url', { length: 512 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: orderStatusEnum('status').notNull().default('PENDING'),
  totalCents: integer('total_cents').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull().unique(),
  transactionId: varchar('transaction_id', { length: 128 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations for Drizzle queries
export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  payment: one(payments, {
    fields: [orders.id],
    references: [payments.orderId],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

// Inferred types — typed directly from the schema definition
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
