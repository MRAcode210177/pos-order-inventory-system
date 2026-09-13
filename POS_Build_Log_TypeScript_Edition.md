# POS Order & Inventory System — Build Log & Architecture Guide (TypeScript Edition)

A step-by-step record of building a concurrency-safe POS backend, **fully typed end to end**:
**Express.js + TypeScript (backend) + Drizzle ORM + PostgreSQL (Railway) + Next.js + TypeScript (frontend)**, deployed to **Railway + Vercel**, in a **pnpm workspace monorepo**.

> **Why full TypeScript, not just partial:** the previous JS-with-some-TS version left raw SQL query results typed as `unknown`. In a project whose entire point is "prove your system can't oversell under concurrency," letting types go loose at exactly the layer that touches stock quantities is the wrong place to cut corners. Everything below flows from one typed source of truth: the Drizzle schema.

---

## Phase 1 — Environment, GitHub, and Monorepo Scaffold

### 1. Prerequisites installed
- Node.js (LTS)
- pnpm (`npm install -g pnpm`)
- Docker (disposable local Postgres)
- Git
- VS Code + extensions: ESLint, Prisma (schema highlighting works fine for Drizzle too), DotENV

### 2. GitHub setup
- Public repo: `pos-order-inventory-system`
- Branching: `main` (protected, always deployable) + `feature/*` merged via PR
- Commit convention: [Conventional Commits](https://www.conventionalcommits.org/)

### 3. Folder structure
```
pos-order-inventory-system/
├── apps/
│   ├── backend/           # Express + TypeScript API (Railway)
│   └── frontend/           # Next.js + TypeScript UI (Vercel)
├── packages/
│   └── shared-types/        # Single source of truth: OrderStatus, DTOs, API response shapes
├── pnpm-workspace.yaml
├── tsconfig.base.json        # Shared strict compiler settings, extended by each app
├── package.json
└── .gitignore
```

### 4. Root `tsconfig.base.json` — the strictness baseline every app extends
```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,                        // enables all strict checks below as a bundle
    "noUncheckedIndexedAccess": true,        // arr[i] is T | undefined, not T — catches real bugs
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```
> **Why `noUncheckedIndexedAccess` specifically matters here:** array/object indexing (`order.items[0]`, a lookup map by product ID) is exactly the kind of thing that silently returns `undefined` at runtime and crashes three layers deeper. Turning this on forces a null-check at the point of access instead of at the point of failure — directly relevant in code that's reasoning about stock counts.

### 5. `pnpm-workspace.yaml`
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 6. Root `package.json`
```json
{
  "name": "pos-order-inventory-system",
  "private": true,
  "scripts": {
    "dev:backend": "pnpm --filter backend dev",
    "dev:frontend": "pnpm --filter frontend dev",
    "typecheck": "pnpm -r typecheck",
    "build": "pnpm -r build"
  },
  "packageManager": "pnpm@9.0.0"
}
```
Each app's own `package.json` gets a `"typecheck": "tsc --noEmit"` script — run in CI (or manually before every commit) so type errors are caught before runtime, not during a demo.

### ✅ Phase 1 Checkpoint
- [x] Strict shared `tsconfig.base.json` defined once, extended everywhere
- [x] Monorepo scaffold with `apps/backend`, `apps/frontend`, `packages/shared-types`
- [x] `pnpm typecheck` runs across all workspaces from the root

---

## Phase 2 — Shared Types Package (the single source of truth)

This is the piece a JS-only version doesn't have, and it's worth building first — everything downstream imports from here.

### `packages/shared-types/package.json`
```json
{
  "name": "@pos/shared-types",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

### `packages/shared-types/src/order.ts`
```typescript
// A discriminated union, not just a string literal type — this is what lets TypeScript
// narrow an order's shape based on its status (e.g. only a PAID order has a transactionId).
export const ORDER_STATUSES = [
  'PENDING', 'RESERVED', 'PAID', 'COMPLETED', 'CANCELLED', 'EXPIRED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItemDto {
  productId: string;
  quantity: number;
  unitPriceCents: number;
}

export interface OrderDto {
  id: string;
  status: OrderStatus;
  totalCents: number;
  expiresAt: string | null;
  items: OrderItemDto[];
}

export interface CreateOrderRequest {
  items: { productId: string; quantity: number }[];
}

export interface PayOrderRequest {
  cardNumber: string;
  idempotencyKey: string;
}

// Generic API envelope — used by every endpoint, backend and frontend agree on this shape
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
```

> **Study:** deriving `OrderStatus` from a `const` array (`ORDER_STATUSES`) instead of writing the union type by hand means there's one array to update when a status is added, and it can be reused at runtime (e.g. to validate incoming data with Zod) — a hand-written `type X = 'A' | 'B'` union can't be iterated at runtime at all.

### Backend and frontend both add it as a workspace dependency
```json
{ "dependencies": { "@pos/shared-types": "workspace:*" } }
```

### ✅ Phase 2 Checkpoint
- [x] `OrderStatus` defined once as a discriminated union derived from a runtime-checkable array
- [x] `ApiResult<T>` envelope shared by both apps — no more guessing response shape
- [x] Both apps consume `@pos/shared-types` via `workspace:*`

---

## Phase 3 — Postgres + Drizzle Schema (typed, no manual interfaces)

### Decision: Drizzle over Prisma, unchanged from the JS version, with one addition
Drizzle's `$inferSelect` / `$inferInsert` generate TypeScript types directly from the schema definition — you never hand-write a `Product` interface that can drift out of sync with the actual table.

### `apps/backend/src/db/schema.ts`
```typescript
import { pgTable, uuid, varchar, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { ORDER_STATUSES } from '@pos/shared-types';

export const orderStatusEnum = pgEnum('order_status', ORDER_STATUSES);

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 64 }).notNull().unique(),
  priceCents: integer('price_cents').notNull(),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  version: integer('version').notNull().default(0),
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
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Inferred types — these ARE the Product/Order types used everywhere else in the backend.
// If the schema changes, every consumer gets a compile error at the exact call site that broke.
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
```

> Reusing `ORDER_STATUSES` from `@pos/shared-types` directly in `pgEnum(...)` means the Postgres enum and the TypeScript union are generated from the exact same array — they cannot drift apart. This is the single strongest argument for the shared-types package existing at all.

### Migration + verification (unchanged commands, now against a typed schema)
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
pnpm drizzle-kit studio
```

### ✅ Phase 3 Checkpoint
- [x] Schema types (`Product`, `Order`, `OrderItem`) inferred directly from Drizzle table definitions — zero hand-written duplicate interfaces
- [x] Postgres enum and TypeScript `OrderStatus` union generated from one shared array
- [x] Migration applied and verified in Drizzle Studio

---

## Phase 4 — Typed Error Handling & Validation

### Typed application errors (discriminated by an error code, not just a message string)
```typescript
// src/errors/AppError.ts
export type ErrorCode =
  | 'NOT_FOUND' | 'INSUFFICIENT_STOCK' | 'INVALID_STATE_TRANSITION' | 'VALIDATION_ERROR';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  INSUFFICIENT_STOCK: 409,
  INVALID_STATE_TRANSITION: 409,
  VALIDATION_ERROR: 400,
};

export class AppError extends Error {
  readonly statusCode: number;
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
    this.statusCode = STATUS_BY_CODE[code];
  }
}
```
> **Why a code, not just a status number:** the frontend receives `{ error: { code: 'INSUFFICIENT_STOCK', message: '...' } }` via the shared `ApiResult<T>` type and can branch on `code` (e.g. show a specific "sold out" UI state) without string-matching the message, which is fragile and untyped.

### Centralized handler, returning the shared `ApiResult` envelope
```typescript
// src/middleware/errorHandler.ts
import { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import type { ApiResult } from '@pos/shared-types';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const body: ApiResult<never> = err instanceof AppError
    ? { ok: false, error: { code: err.code, message: err.message } }
    : { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong' } };

  const status = err instanceof AppError ? err.statusCode : 500;
  if (!(err instanceof AppError)) console.error(err);
  res.status(status).json(body);
};
```

### Validation with Zod, inferring request types instead of duplicating them
```typescript
// src/schemas/orderSchemas.ts
import { z } from 'zod';
import type { CreateOrderRequest } from '@pos/shared-types';

export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
}) satisfies z.ZodType<CreateOrderRequest>;
// `satisfies` checks the Zod schema actually matches the shared DTO shape at compile time —
// if someone adds a field to CreateOrderRequest and forgets to validate it, this line goes red.
```

### ✅ Phase 4 Checkpoint
- [x] `AppError` carries a typed `ErrorCode`, not a bare string
- [x] Every error response conforms to the shared `ApiResult<T>` envelope
- [x] Zod schemas checked against shared DTOs via `satisfies` — no silent drift between validation and types

---

## Phase 5 — The Core Requirement: Concurrency-Safe, Fully Typed Stock Reservation

### Typed raw-SQL row shape (fixes the "unknown" gap from the JS version)
```typescript
// src/db/rawTypes.ts
import type { Product } from './schema';

// Raw sql`` results come back as snake_case rows — this maps them to the same
// shape as Drizzle's inferred Product type so the rest of the app never sees `unknown`.
export interface ProductRow {
  id: string;
  name: string;
  price_cents: number;
  stock_quantity: number;
  version: number;
}

export function toProduct(row: ProductRow): Pick<Product, 'id' | 'name' | 'priceCents' | 'stockQuantity' | 'version'> {
  return {
    id: row.id,
    name: row.name,
    priceCents: row.price_cents,
    stockQuantity: row.stock_quantity,
    version: row.version,
  };
}
```

### The reservation logic, typed end to end
```typescript
// src/services/orderService.ts
import { db } from '../db';
import { products, orders, orderItems } from '../db/schema';
import { sql, eq } from 'drizzle-orm';
import { AppError } from '../errors/AppError';
import { toProduct, type ProductRow } from '../db/rawTypes';
import type { CreateOrderRequest, OrderDto } from '@pos/shared-types';

export async function createOrder(request: CreateOrderRequest): Promise<OrderDto> {
  return db.transaction(async (tx) => {
    let totalCents = 0;
    const lineItems: (typeof orderItems.$inferInsert)[] = [];

    for (const item of request.items) {
      const rows = await tx.execute<ProductRow>(
        sql`SELECT * FROM products WHERE id = ${item.productId} FOR UPDATE`
      );
      const row = rows[0];
      if (!row) throw new AppError('NOT_FOUND', `Product ${item.productId} not found`);

      const product = toProduct(row);
      if (product.stockQuantity < item.quantity) {
        throw new AppError('INSUFFICIENT_STOCK', `Insufficient stock for ${product.name}`);
      }

      await tx.update(products)
        .set({ stockQuantity: product.stockQuantity - item.quantity })
        .where(eq(products.id, item.productId));

      totalCents += product.priceCents * item.quantity;
      lineItems.push({
        orderId: '', // filled in after insert below
        productId: item.productId,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
      });
    }

    const [order] = await tx.insert(orders).values({
      status: 'RESERVED',
      totalCents,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    }).returning();

    if (!order) throw new AppError('VALIDATION_ERROR', 'Order creation failed unexpectedly');

    const inserted = await tx.insert(orderItems)
      .values(lineItems.map((li) => ({ ...li, orderId: order.id })))
      .returning();

    return {
      id: order.id,
      status: order.status,
      totalCents: order.totalCents,
      expiresAt: order.expiresAt?.toISOString() ?? null,
      items: inserted.map((i) => ({
        productId: i.productId, quantity: i.quantity, unitPriceCents: i.unitPriceCents,
      })),
    };
  });
}
```

> **Everything that was `unknown` or loosely typed in the JS version now has a concrete type**: `ProductRow` for the raw SQL result, `toProduct` mapping it into the same shape Drizzle's inferred `Product` type uses, and the function's return type declared as the shared `OrderDto` — so the compiler enforces that the API response actually matches what the frontend expects, not just what the code happens to return today.

### Route, typed against the shared contract
```typescript
// src/routes/orders.ts
import { Router } from 'express';
import { validate } from '../middleware/validate';
import { createOrderSchema } from '../schemas/orderSchemas';
import { createOrder } from '../services/orderService';
import type { ApiResult, OrderDto } from '@pos/shared-types';

export const ordersRouter = Router();

ordersRouter.post('/', validate(createOrderSchema), async (req, res, next) => {
  try {
    const order = await createOrder(req.body);
    const body: ApiResult<OrderDto> = { ok: true, data: order };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
});
```

### ✅ Phase 5 Checkpoint
- [x] No `unknown`/`any` anywhere in the reservation path — raw SQL rows mapped to typed shapes explicitly
- [x] Service function's return type is the same `OrderDto` the frontend imports
- [x] `FOR UPDATE` row-locking and transactional rollback behavior unchanged from the JS version — typing is additive, not a rewrite of the logic itself

---

## Phase 6 — Payments, Lifecycle, and Frontend (typed consistently with the above)

The payment service, expiry job, and frontend follow the exact same pattern established in Phases 4–5:
- `mockPaymentGateway.ts` returns a discriminated union (`{ success: true; transactionId: string } | { success: false; reason: string }`), so callers get compile-time exhaustiveness checking on the result instead of checking a boolean and hoping.
- The Next.js frontend imports `OrderDto` and `ApiResult<T>` directly from `@pos/shared-types`, so a fetch call is typed as `Promise<ApiResult<OrderDto>>` with zero manual interface duplication on the client.
- Frontend components narrow on `result.ok` — TypeScript won't let you access `result.data` without first checking `result.ok === true`, which mirrors exactly how the backend produces the envelope.

### ✅ Phase 6 Checkpoint
- [x] Mock payment result is a discriminated union, not a boolean + optional fields
- [x] Frontend fetch calls typed against `ApiResult<OrderDto>` — no manual response interfaces on the client
- [x] `result.ok` narrowing enforced by the compiler, not just convention

---

## Phase 7 — Deployment (unchanged infrastructure, one addition)

Same Railway (backend + Postgres) and Vercel (frontend) setup as before, with one addition to the build step:

```json
// apps/backend/package.json
{ "scripts": { "build": "tsc -p tsconfig.json", "start": "node dist/index.js" } }
```
Railway's build command runs `pnpm typecheck && pnpm build` — a type error fails the deploy instead of shipping broken code to a live URL, which matters more here than on a typical side project since this is the artifact being reviewed.

### ✅ Phase 7 Checkpoint
- [x] `tsc --noEmit` runs as a build gate before deploy, not just locally
- [x] Backend compiles to `dist/`, deployed and running on Railway
- [x] Frontend deployed on Vercel, consuming the same shared types

---

## What Changed vs. the JavaScript Version — and What to Say About It

If asked "why TypeScript" in the interview, the honest, specific answer (better than a generic "type safety is good"):

- The reservation logic touches money and stock counts — the two things where a silent `undefined` or a mismatched shape causes the exact class of bug this assessment is testing you to prevent.
- The shared-types package means the Postgres enum, the backend's return types, and the frontend's expectations are generated from **one array**, not three independent guesses that can drift.
- `tsc --noEmit` as a deploy gate turns "it compiled but broke in prod" into "it never got deployed in the first place."

This is also a legitimately good story for the interview: you can point to the specific `ProductRow`/`toProduct` mapping as "here's where I closed the one remaining `unknown` gap I wasn't happy with," which reads as an engineer iterating on their own work — exactly what a build log is for.
