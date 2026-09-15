# Fullstack POS System: Architecture & Complete Data Pipeline Guide

> **Mentor Note:** This guide is written in simple, clear English. It breaks down all **13 Backend Endpoints**, their **Frontend Integrations**, and the complete **End-to-End Data Flow** so you can explain the entire system with confidence in any technical interview.

---

## 1. Backend API Endpoints (All 13 Endpoints)

---

### Endpoint 1: `GET /` & `GET /api`

#### Purpose
Root welcome and discovery endpoint that returns API health, status, version, and the directory of available service endpoints.

#### Route Code
📁 **File:** [`apps/task-01(backend)/src/app.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/app.ts)
```typescript
// apps/task-01(backend)/src/app.ts
app.get(['/', '/api'], (_req, res) => {
  res.json({
    ok: true,
    name: 'POS, Order & Inventory Management API',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      products: '/api/products',
      orders: '/api/orders',
    },
  });
});
```

#### Service / Controller Logic
Returns an immediate JSON payload containing service discovery metadata without touching the database.

---

### Endpoint 2: `GET /api/health`

#### Purpose
Checks if the backend server is online, active, and healthy.

#### Route Code
📁 **File:** [`apps/task-01(backend)/src/app.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/app.ts)
```typescript
// apps/task-01(backend)/src/app.ts
app.get('/api/health', (_req, res) => {
  const body: ApiResult<{ status: string; timestamp: string }> = {
    ok: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  };
  res.json(body);
});
```

#### Service / Controller Logic
This endpoint returns an immediate in-memory status object wrapped in the shared `ApiResult` envelope without needing to query database tables.

---

### Endpoint 3: `GET /api/products`

#### Purpose
Retrieves products from the catalog with their current stock levels, prices, categories, and pagination metadata (supporting search, category filters, and inactive product inclusions).

#### Route Code
📁 **File:** [`apps/task-01(backend)/src/routes/products.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/routes/products.ts)
```typescript
// apps/task-01(backend)/src/routes/products.ts
productsRouter.get('/', async (req, res, next) => {
  try {
    const search = req.query['search'] ? String(req.query['search']) : undefined;
    const category = req.query['category'] ? String(req.query['category']) : undefined;
    const includeInactive = req.query['includeInactive'] === 'true';
    const page = req.query['page'] ? parseInt(String(req.query['page']), 10) : undefined;
    const limit = req.query['limit'] ? parseInt(String(req.query['limit']), 10) : undefined;
    const result = await listProducts(search, category, includeInactive, page, limit);
    const body: ApiResult<ProductDto[]> = {
      ok: true,
      data: result.items,
      pagination: result.pagination,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
```

#### Service Code
📁 **File:** [`apps/task-01(backend)/src/services/productService.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/services/productService.ts)
```typescript
// apps/task-01(backend)/src/services/productService.ts
export async function listProducts(
  search?: string,
  category?: string,
  includeInactive: boolean = false,
  page?: number,
  limit?: number
): Promise<{ items: ProductDto[]; pagination: PaginationMeta }> {
  const conditions = [];

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

  const [countResult] = await db
    .select({ total: sql<number>`cast(count(*) as integer)` })
    .from(products)
    .where(whereClause);

  const total = Number(countResult?.total ?? 0);
  const pageLimit = Math.min(Math.max(1, limit && limit > 0 ? limit : (page ? 10 : (total > 0 ? total : 10))), 100);
  const totalPages = Math.max(1, Math.ceil(total / pageLimit));
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
  return {
    items: rows.map(toProductDto),
    pagination: { total, totalPages, currentPage, limit: pageLimit },
  };
}
```

---

### Endpoint 4: `GET /api/products/:id`

#### Purpose
Fetches full details for a single product by its unique UUID.

#### Route Code
📁 **File:** [`apps/task-01(backend)/src/routes/products.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/routes/products.ts)
```typescript
// apps/task-01(backend)/src/routes/products.ts
productsRouter.get('/:id', async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id!);
    const body: ApiResult<ProductDto> = { ok: true, data: product };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
```

#### Service Code
📁 **File:** [`apps/task-01(backend)/src/services/productService.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/services/productService.ts)
```typescript
// apps/task-01(backend)/src/services/productService.ts
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
```

---

### Endpoint 5: `POST /api/products`

#### Purpose
Creates a new product in the database after validating the request body with Zod and verifying unique SKU constraints.

#### Route Code
📁 **File:** [`apps/task-01(backend)/src/routes/products.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/routes/products.ts)
```typescript
// apps/task-01(backend)/src/routes/products.ts
productsRouter.post('/', validate(createProductSchema), async (req, res, next) => {
  try {
    const product = await createProduct(req.body);
    const body: ApiResult<ProductDto> = { ok: true, data: product };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
});
```

#### Service Code
📁 **File:** [`apps/task-01(backend)/src/services/productService.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/services/productService.ts)
```typescript
// apps/task-01(backend)/src/services/productService.ts
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
```

---

### Endpoint 6: `PUT /api/products/:id`

#### Purpose
Updates product fields (name, price, SKU, category, image URL) while maintaining optimistic concurrency versioning and verifying SKU uniqueness.

#### Route Code
📁 **File:** [`apps/task-01(backend)/src/routes/products.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/routes/products.ts)
```typescript
// apps/task-01(backend)/src/routes/products.ts
productsRouter.put('/:id', validate(updateProductSchema), async (req, res, next) => {
  try {
    const product = await updateProduct(req.params.id!, req.body);
    const body: ApiResult<ProductDto> = { ok: true, data: product };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
```

#### Service Code
📁 **File:** [`apps/task-01(backend)/src/services/productService.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/services/productService.ts)
```typescript
// apps/task-01(backend)/src/services/productService.ts
export async function updateProduct(id: string, data: UpdateProductRequest): Promise<ProductDto> {
  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!existing) throw new AppError('NOT_FOUND', `Product with ID ${id} not found`);

  if (data.sku && data.sku !== existing.sku) {
    const [skuConflict] = await db
      .select()
      .from(products)
      .where(and(eq(products.sku, data.sku), ne(products.id, id)))
      .limit(1);
    if (skuConflict) {
      throw new AppError('VALIDATION_ERROR', `Product SKU '${data.sku}' is already in use`);
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
      imageUrl: data.imageUrl !== undefined ? data.imageUrl : existing.imageUrl,
      isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      version: sql`${products.version} + 1`,
    })
    .where(eq(products.id, id))
    .returning();

  return toProductDto(updated);
}
```

---

### Endpoint 7: `PATCH /api/products/:id/toggle-status`

#### Purpose
Toggles the product's active status between `active` (visible on POS register) and `inactive` (archived).

#### Route Code
📁 **File:** [`apps/task-01(backend)/src/routes/products.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/routes/products.ts)
```typescript
// apps/task-01(backend)/src/routes/products.ts
productsRouter.patch('/:id/toggle-status', async (req, res, next) => {
  try {
    const product = await toggleProductStatus(req.params.id!);
    const body: ApiResult<ProductDto> = { ok: true, data: product };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
```

---

### Endpoint 8: `DELETE /api/products/:id`

#### Purpose
Deletes a product from the catalog. If the product has historical order references, it safely archives the product instead of triggering a foreign key crash.

#### Route Code
📁 **File:** [`apps/task-01(backend)/src/routes/products.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/routes/products.ts)
```typescript
// apps/task-01(backend)/src/routes/products.ts
productsRouter.delete('/:id', async (req, res, next) => {
  try {
    const result = await deleteProduct(req.params.id!);
    const body: ApiResult<{ id: string; name: string }> = { ok: true, data: result };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
```

---

### Endpoint 9: `PATCH /api/products/:id/stock`

#### Purpose
Adjusts the stock count of an existing product (increment or decrement delta) and bumps its optimistic version number atomically.

#### Route Code
📁 **File:** [`apps/task-01(backend)/src/routes/products.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/routes/products.ts)
```typescript
// apps/task-01(backend)/src/routes/products.ts
productsRouter.patch('/:id/stock', validate(updateStockSchema), async (req, res, next) => {
  try {
    const product = await updateStock(req.params.id!, req.body.quantityDelta);
    const body: ApiResult<ProductDto> = { ok: true, data: product };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
```

---

### Endpoint 10: `GET /api/orders`

#### Purpose
Fetches orders with pagination and an optional filter for order status (e.g. `RESERVED`, `PAID`, `CANCELLED`, `EXPIRED`).

#### Route Code
📁 **File:** [`apps/task-01(backend)/src/routes/orders.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/routes/orders.ts)
```typescript
// apps/task-01(backend)/src/routes/orders.ts
ordersRouter.get('/', async (req, res, next) => {
  try {
    const status = req.query['status'] ? (String(req.query['status']) as OrderStatus) : undefined;
    const page = req.query['page'] ? parseInt(String(req.query['page']), 10) : undefined;
    const limit = req.query['limit'] ? parseInt(String(req.query['limit']), 10) : undefined;
    const result = await listOrders(status, page, limit);
    const body: ApiResult<OrderDto[]> = {
      ok: true,
      data: result.items,
      pagination: result.pagination,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
```

---

### Endpoint 11: `POST /api/orders` (Concurrency-Safe Stock Reservation)

#### Purpose
Uses PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) inside an ACID transaction to verify stock, deduct inventory atomically, and hold a 10-minute reservation without race conditions.

#### Route Code
📁 **File:** [`apps/task-01(backend)/src/routes/orders.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/routes/orders.ts)
```typescript
// apps/task-01(backend)/src/routes/orders.ts
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

---

### Endpoint 12: `GET /api/orders/:id`

#### Purpose
Fetches full details of a specific single order, including purchased line items and order totals.

#### Route Code
📁 **File:** [`apps/task-01(backend)/src/routes/orders.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/routes/orders.ts)
```typescript
// apps/task-01(backend)/src/routes/orders.ts
ordersRouter.get('/:id', async (req, res, next) => {
  try {
    const order = await getOrderById(req.params.id!);
    const body: ApiResult<OrderDto> = { ok: true, data: order };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
```

---

### Endpoint 13: `POST /api/orders/:id/cancel`

#### Purpose
Cancels an active reserved order and immediately restores all held stock quantities back to the product catalog inside an atomic transaction.

#### Route Code
📁 **File:** [`apps/task-01(backend)/src/routes/orders.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/routes/orders.ts)
```typescript
// apps/task-01(backend)/src/routes/orders.ts
ordersRouter.post('/:id/cancel', async (req, res, next) => {
  try {
    const order = await cancelOrder(req.params.id!);
    const body: ApiResult<OrderDto> = { ok: true, data: order };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
```

---

### Endpoint 14: `POST /api/orders/:id/pay`

#### Purpose
Processes payment idempotently using an `idempotencyKey`, verifies reservation validity against database time, calls the mock payment gateway, and completes the order.

#### Route Code
📁 **File:** [`apps/task-01(backend)/src/routes/orders.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-01(backend)/src/routes/orders.ts)
```typescript
// apps/task-01(backend)/src/routes/orders.ts
ordersRouter.post('/:id/pay', validate(payOrderSchema), async (req, res, next) => {
  try {
    const result = await processPayment(req.params.id!, req.body);
    const body: ApiResult<{ order: OrderDto; payment: PaymentDto }> = {
      ok: true,
      data: result,
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
```

---

## 2. Frontend Integration (Network & Components)

All API network calls are centralized in [`apps/task-02(frontend)/src/lib/api.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/task-02(frontend)/src/lib/api.ts) ensuring standard error handling, fallback messages, and full TypeScript contract compliance via `@pos/shared-types`.

| Frontend Function | Backend Route | UI Component Trigger |
|---|---|---|
| `checkBackendHealth()` | `GET /api/health` | `Navbar.tsx` (Live status indicator) |
| `fetchProducts()` | `GET /api/products` | `page.tsx` (POS Terminal Catalog) & `inventory/page.tsx` |
| `fetchProduct(id)` | `GET /api/products/:id` | Product detail and edit modals |
| `createProduct(data)` | `POST /api/products` | `inventory/page.tsx` (Add Product Modal) |
| `updateProduct(id, data)` | `PUT /api/products/:id` | `inventory/page.tsx` (Edit Product Modal) |
| `toggleProductStatus(id)` | `PATCH /api/products/:id/toggle-status` | `inventory/page.tsx` (Status Switch) |
| `deleteProduct(id)` | `DELETE /api/products/:id` | `inventory/page.tsx` (Delete Action) |
| `updateProductStock(id, delta)` | `PATCH /api/products/:id/stock` | `inventory/page.tsx` (Quick `+` / `-` Stock Buttons) |
| `fetchOrders(status, page, limit)` | `GET /api/orders` | `orders/page.tsx` (Orders History) |
| `createOrder(data)` | `POST /api/orders` | `page.tsx` / `CartDrawer.tsx` ("Checkout" button) |
| `fetchOrder(id)` | `GET /api/orders/:id` | `CheckoutModal.tsx` & Order Detail View |
| `payOrder(id, data)` | `POST /api/orders/:id/pay` | `CheckoutModal.tsx` (Pay via Cash/Card/UPI) |
| `cancelOrder(id)` | `POST /api/orders/:id/cancel` | `CheckoutModal.tsx` ("Cancel Order" button) |

---

## 3. The End-to-End Pipeline & Data Flows

---

### Flow 1: Cashier Adds Items & Places an Order (Atomic Stock Reservation)

1. **User Action:** The cashier browses the catalog on `http://localhost:3000`, adds items to the cart, and clicks **"Checkout"**.
2. **Frontend State & Network:** `handleCheckout()` in `page.tsx` gathers product IDs and quantities from cart state and calls `createOrder()` in `api.ts`.
3. **HTTP Request:** `POST /api/orders` with payload `{ items: [{ productId, quantity }] }`.
4. **Validation Layer:** Express runs `validate(createOrderSchema)`.
5. **Database Transaction (`orderService.createOrder`):**
   - Opens an ACID transaction.
   - Sorts product IDs alphabetically to eliminate cross-transaction deadlocks.
   - Executes `SELECT ... FROM products WHERE id = $1 FOR UPDATE` to lock rows.
   - Verifies available inventory.
   - Decrements stock and increments optimistic version.
   - Inserts order record with 10-minute expiration countdown.
   - Commits transaction.
6. **Response & UI Update:** Returns `201 Created` with `OrderDto`. Frontend opens `CheckoutModal.tsx`.

---

### Flow 2: Cashier Processes Payment (Idempotency & Finalization)

1. **User Action:** The cashier selects a payment method (**CASH**, **CARD**, **UPI**) in `CheckoutModal.tsx` and submits.
2. **Frontend State & Network:** `handlePay()` generates a unique `idempotencyKey` (UUID) and calls `payOrder()`.
3. **Database Transaction (`paymentService.processPayment`):**
   - Checks `payments` table for matching `idempotencyKey`. If found, returns saved receipt.
   - Locks order row (`FOR UPDATE`) and validates expiry against PostgreSQL `NOW()`.
   - Simulates gateway processing via `mockPaymentGateway`.
   - On success: records payment as `SUCCESS` and transitions order status to `PAID`.
4. **Response & Celebration:** Returns order and payment receipts, triggering celebratory confetti on the POS register.

---

### Flow 3: Automatic Background Expiry Worker

1. **Worker Lifecycle:** `expiryWorker.ts` runs periodically in the background (every 30 seconds).
2. **Scan & Lock:** Queries all `RESERVED` orders where `expires_at <= NOW()`.
3. **Inventory Restoration:** Automatically returns reserved stock back to the active catalog and transitions order status to `EXPIRED`.

---

## 4. Key Takeaways for Your Technical Interview

1. **Why `SELECT ... FOR UPDATE`?**  
   It locks the row at the PostgreSQL storage engine level, preventing race conditions and **overselling** during high-concurrency checkouts.
2. **Why sort Product IDs?**  
   Sorting IDs alphabetically before acquiring locks guarantees that multiple concurrent transactions lock rows in the exact same order, making **deadlocks mathematically impossible**.
3. **Why `idempotencyKey`?**  
   Prevents double-charging if a user clicks pay multiple times or if a network reconnect occurs during payment.
4. **Why Database `NOW()`?**  
   Comparing expiry against the database clock eliminates client/server clock skew issues.
5. **Why `@pos/shared-types`?**  
   Guarantees strict end-to-end type safety across Drizzle schemas, Zod validators, API responses, and Next.js frontend components without manual type duplication.
