# Fullstack POS System: Architecture & Complete Data Pipeline Guide

> **Mentor Note:** This guide is written in simple, clear English. It breaks down all **9 Backend Endpoints**, their **Frontend Integrations**, and the complete **End-to-End Data Flow** so you can explain the entire system with confidence in any technical interview.

---

## 1. Backend API Endpoints (All 9 Endpoints)

---

### Endpoint 1: `GET /api/health`

#### Purpose
Checks if the backend server is online, active, and healthy.

#### Route Code
📁 **File:** [`apps/backend/src/app.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/app.ts)
```typescript
// apps/backend/src/app.ts
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

### Endpoint 2: `GET /api/products`

#### Purpose
Retrieves all products from the catalog with their current stock levels, prices, and categories (with optional search and category filters).

#### Route Code
📁 **File:** [`apps/backend/src/routes/products.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/routes/products.ts)
```typescript
// apps/backend/src/routes/products.ts
productsRouter.get('/', async (req, res, next) => {
  try {
    const search = req.query['search'] ? String(req.query['search']) : undefined;
    const category = req.query['category'] ? String(req.query['category']) : undefined;
    const products = await listProducts(search, category);
    const body: ApiResult<ProductDto[]> = { ok: true, data: products };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
```

#### Service Code
📁 **File:** [`apps/backend/src/services/productService.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/services/productService.ts)
```typescript
// apps/backend/src/services/productService.ts
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
```

---

### Endpoint 3: `POST /api/products`

#### Purpose
Creates a new product in the database after validating the request body with Zod.

#### Route Code
📁 **File:** [`apps/backend/src/routes/products.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/routes/products.ts)
```typescript
// apps/backend/src/routes/products.ts
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
📁 **File:** [`apps/backend/src/services/productService.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/services/productService.ts)
```typescript
// apps/backend/src/services/productService.ts
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
```

---

### Endpoint 4: `PATCH /api/products/:id/stock`

#### Purpose
Updates the stock count of an existing product (increment or decrement) and bumps its optimistic version number.

#### Route Code
📁 **File:** [`apps/backend/src/routes/products.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/routes/products.ts)
```typescript
// apps/backend/src/routes/products.ts
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

#### Service Code
📁 **File:** [`apps/backend/src/services/productService.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/services/productService.ts)
```typescript
// apps/backend/src/services/productService.ts
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
```

---

### Endpoint 5: `GET /api/orders`

#### Purpose
Fetches all historical and active orders, with an optional filter for order status (e.g. `RESERVED`, `PAID`, `CANCELLED`, `EXPIRED`).

#### Route Code
📁 **File:** [`apps/backend/src/routes/orders.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/routes/orders.ts)
```typescript
// apps/backend/src/routes/orders.ts
ordersRouter.get('/', async (req, res, next) => {
  try {
    const status = req.query['status'] ? (String(req.query['status']) as OrderStatus) : undefined;
    const ordersList = await listOrders(status);
    const body: ApiResult<OrderDto[]> = { ok: true, data: ordersList };
    res.json(body);
  } catch (err) {
    next(err);
  }
});
```

#### Service Code
📁 **File:** [`apps/backend/src/services/orderService.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/services/orderService.ts)
```typescript
// apps/backend/src/services/orderService.ts
export async function listOrders(statusFilter?: OrderStatus): Promise<OrderDto[]> {
  const query = db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt));

  const allOrders = statusFilter
    ? await query.where(eq(orders.status, statusFilter))
    : await query;

  const results: OrderDto[] = [];

  for (const order of allOrders) {
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
    });
  }

  return results;
}
```

---

### Endpoint 6: `POST /api/orders` (Concurrency-Safe Stock Reservation)

#### Purpose
Uses PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) inside an ACID transaction to verify stock, deduct inventory, and hold a 10-minute order reservation without race conditions.

#### Route Code
📁 **File:** [`apps/backend/src/routes/orders.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/routes/orders.ts)
```typescript
// apps/backend/src/routes/orders.ts
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

#### Service Code
📁 **File:** [`apps/backend/src/services/orderService.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/services/orderService.ts)
```typescript
// apps/backend/src/services/orderService.ts
export async function createOrder(request: CreateOrderRequest): Promise<OrderDto> {
  return db.transaction(async (tx: any) => {
    let totalCents = 0;
    const lineItems: (typeof orderItems.$inferInsert)[] = [];
    const itemDetails: { productId: string; quantity: number; unitPriceCents: number; productName: string }[] = [];

    // Sort items by productId deterministically to prevent cross-transaction deadlocks
    const sortedItems = [...request.items].sort((a, b) => a.productId.localeCompare(b.productId));

    for (const item of sortedItems) {
      // Execute row-locking query: SELECT ... FOR UPDATE
      const result = await tx.execute(
        sql`SELECT id, name, sku, price_cents, stock_quantity, version, category, image_url, created_at 
            FROM products WHERE id = ${item.productId} FOR UPDATE`
      );

      const rows: ProductRow[] = Array.isArray(result) ? result : (result?.rows ?? []);
      const row = rows[0];

      if (!row) {
        throw new AppError('NOT_FOUND', `Product with ID ${item.productId} not found`);
      }

      const product = toProduct(row);

      // Verify stock
      if (product.stockQuantity < item.quantity) {
        throw new AppError(
          'INSUFFICIENT_STOCK',
          `Insufficient stock for '${product.name}'. Requested: ${item.quantity}, Available: ${product.stockQuantity}`
        );
      }

      // Decrement stock quantity atomically
      await tx
        .update(products)
        .set({
          stockQuantity: product.stockQuantity - item.quantity,
          version: sql`${products.version} + 1`,
        })
        .where(eq(products.id, item.productId));

      totalCents += product.priceCents * item.quantity;

      lineItems.push({
        orderId: '',
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

    // Create order with 10-minute expiry
    const reservationExpiry = new Date(Date.now() + 10 * 60 * 1000);

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
```

---

### Endpoint 7: `GET /api/orders/:id`

#### Purpose
Fetches full details of a specific single order, including its purchased line items and calculated total.

#### Route Code
📁 **File:** [`apps/backend/src/routes/orders.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/routes/orders.ts)
```typescript
// apps/backend/src/routes/orders.ts
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

#### Service Code
📁 **File:** [`apps/backend/src/services/orderService.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/services/orderService.ts)
```typescript
// apps/backend/src/services/orderService.ts
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
  };
}
```

---

### Endpoint 8: `POST /api/orders/:id/cancel`

#### Purpose
Cancels an active reserved order and immediately restores all held stock quantities back to the product catalog.

#### Route Code
📁 **File:** [`apps/backend/src/routes/orders.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/routes/orders.ts)
```typescript
// apps/backend/src/routes/orders.ts
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

#### Service Code
📁 **File:** [`apps/backend/src/services/orderService.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/services/orderService.ts)
```typescript
// apps/backend/src/services/orderService.ts
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
```

---

### Endpoint 9: `POST /api/orders/:id/pay`

#### Purpose
Processes card payment idempotently using an `idempotencyKey`, verifies that the 10-minute reservation has not expired, calls the payment gateway, and marks the order as `PAID`.

#### Route Code
📁 **File:** [`apps/backend/src/routes/orders.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/routes/orders.ts)
```typescript
// apps/backend/src/routes/orders.ts
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

#### Service Code
📁 **File:** [`apps/backend/src/services/paymentService.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/backend/src/services/paymentService.ts)
```typescript
// apps/backend/src/services/paymentService.ts
export async function processPayment(
  orderId: string,
  request: PayOrderRequest
): Promise<{ order: OrderDto; payment: PaymentDto }> {
  return db.transaction(async (tx: any) => {
    // 1. Check Idempotency Key
    const [existingPayment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.idempotencyKey, request.idempotencyKey))
      .limit(1);

    if (existingPayment) {
      if (existingPayment.orderId !== orderId) {
        throw new AppError(
          'IDEMPOTENCY_CONFLICT',
          `Idempotency key '${request.idempotencyKey}' was already used for a different order (${existingPayment.orderId})`
        );
      }

      // If already processed for this order, return idempotently
      const order = await getOrderById(orderId);
      return {
        order,
        payment: {
          id: existingPayment.id,
          orderId: existingPayment.orderId,
          status: existingPayment.status,
          idempotencyKey: existingPayment.idempotencyKey,
          transactionId: existingPayment.transactionId ?? undefined,
          createdAt: new Date(existingPayment.createdAt).toISOString(),
        },
      };
    }

    // 2. Lock Order row for payment processing and evaluate expiry using SQL NOW()
    const result = await tx.execute(
      sql`SELECT id, status, total_cents, expires_at, (expires_at IS NOT NULL AND expires_at < NOW()) AS is_expired 
          FROM orders WHERE id = ${orderId} FOR UPDATE`
    );
    const rows = Array.isArray(result) ? result : (result?.rows ?? []);
    const order = rows[0];

    if (!order) {
      throw new AppError('NOT_FOUND', `Order with ID ${orderId} not found`);
    }

    if (order.status === 'PAID' || order.status === 'COMPLETED') {
      throw new AppError('INVALID_STATE_TRANSITION', 'Order has already been paid and completed');
    }

    if (order.status === 'CANCELLED') {
      throw new AppError('INVALID_STATE_TRANSITION', 'Order has been cancelled and cannot be paid');
    }

    if (order.status === 'EXPIRED' || order.is_expired) {
      // If expired, restore inventory and update status
      if (order.status === 'RESERVED') {
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

        await tx
          .update(orders)
          .set({ status: 'EXPIRED' })
          .where(eq(orders.id, orderId));
      }

      throw new AppError('ORDER_EXPIRED', 'Order reservation time limit has passed. Stock has been returned.');
    }

    if (order.status !== 'RESERVED') {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        `Cannot pay for order in '${order.status}' status. Expected 'RESERVED'.`
      );
    }

    // 3. Process payment via Mock Payment Gateway
    const gatewayResult = await mockPaymentGateway.processPayment(
      request.cardNumber,
      order.total_cents
    );

    if (!gatewayResult.success) {
      // Record failed payment attempt
      await tx.insert(payments).values({
        orderId,
        status: 'FAILED',
        idempotencyKey: request.idempotencyKey,
      });

      throw new AppError('PAYMENT_FAILED', `Payment declined: ${gatewayResult.reason}`);
    }

    // 4. Payment succeeded: update order and record payment
    const [paymentRecord] = await tx
      .insert(payments)
      .values({
        orderId,
        status: 'SUCCESS',
        idempotencyKey: request.idempotencyKey,
        transactionId: gatewayResult.transactionId,
      })
      .returning();

    await tx
      .update(orders)
      .set({ status: 'PAID' })
      .where(eq(orders.id, orderId));

    const updatedOrder = await getOrderById(orderId);

    return {
      order: updatedOrder,
      payment: {
        id: paymentRecord.id,
        orderId: paymentRecord.orderId,
        status: paymentRecord.status,
        idempotencyKey: paymentRecord.idempotencyKey,
        transactionId: paymentRecord.transactionId ?? undefined,
        createdAt: new Date(paymentRecord.createdAt).toISOString(),
      },
    };
  });
}
```

---

## 2. Frontend Integration (Network & Components)

---

### Frontend Integration for `GET /api/health`

#### API Wrapper Code
📁 **File:** Direct check in [`apps/frontend/src/components/Navbar.tsx`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/components/Navbar.tsx)
```typescript
const checkHealth = async () => {
  try {
    const res = await fetch('http://localhost:4000/api/health');
    const json = await res.json();
    return json.ok === true;
  } catch {
    return false;
  }
};
```

#### Component Code (How it is called in React)
📁 **File:** [`apps/frontend/src/components/Navbar.tsx`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/components/Navbar.tsx)
```typescript
// apps/frontend/src/components/Navbar.tsx
export function Navbar() {
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/health');
        const json = await res.json();
        setIsBackendHealthy(json.ok === true);
      } catch {
        setIsBackendHealthy(false);
      }
    };

    // Run health check on mount and poll every 10 seconds
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 ...">
      {/* Indicator badge in UI */}
      <span className="font-medium text-slate-300">
        {isBackendHealthy === true ? 'Backend Live' : 'API Offline'}
      </span>
    </header>
  );
}
```

---

### Frontend Integration for `GET /api/products`

#### API Wrapper Code
📁 **File:** [`apps/frontend/src/lib/api.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/lib/api.ts)
```typescript
// apps/frontend/src/lib/api.ts
export async function fetchProducts(search?: string, category?: string): Promise<ApiResult<ProductDto[]>> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (category && category !== 'All') params.set('category', category);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<ProductDto[]>(`/products${query}`);
}
```

#### Component Code (How it is called in React)
📁 **File:** [`apps/frontend/src/app/page.tsx`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/app/page.tsx)
```typescript
// apps/frontend/src/app/page.tsx (POS Terminal)
export default function POSTerminalPage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    const result = await fetchProducts();
    if (result.ok) {
      setProducts(result.data);
    }
    setIsLoadingProducts(false);
  };

  // Triggered automatically on page load
  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div>
      {/* Also triggered on manual "Sync Stock" button click */}
      <button onClick={loadProducts}>
        <RefreshCw className={isLoadingProducts ? 'animate-spin' : ''} />
        <span>Sync Stock</span>
      </button>

      {/* Render Product Cards */}
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

---

### Frontend Integration for `POST /api/products`

#### API Wrapper Code
📁 **File:** [`apps/frontend/src/lib/api.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/lib/api.ts)
```typescript
// apps/frontend/src/lib/api.ts
export async function createProduct(data: CreateProductRequest): Promise<ApiResult<ProductDto>> {
  return request<ProductDto>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

#### Component Code (How it is called in React)
📁 **File:** [`apps/frontend/src/app/inventory/page.tsx`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/app/inventory/page.tsx)
```typescript
// apps/frontend/src/app/inventory/page.tsx
const handleCreateProduct = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  setFormError(null);

  const payload: CreateProductRequest = {
    name: formData.name.trim(),
    sku: formData.sku.trim().toUpperCase(),
    priceCents: Math.round(parseFloat(formData.price) * 100),
    stockQuantity: parseInt(formData.stockQuantity, 10),
    category: formData.category,
    imageUrl: formData.imageUrl.trim() || undefined,
  };

  // Call API function
  const result = await createProduct(payload);
  setIsSubmitting(false);

  if (result.ok) {
    setShowAddModal(false);
    loadInventory(); // Refresh product list
  } else {
    setFormError(result.error.message || 'Failed to create product');
  }
};
```

---

### Frontend Integration for `PATCH /api/products/:id/stock`

#### API Wrapper Code
📁 **File:** [`apps/frontend/src/lib/api.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/lib/api.ts)
```typescript
// apps/frontend/src/lib/api.ts
export async function updateProductStock(id: string, delta: number): Promise<ApiResult<ProductDto>> {
  return request<ProductDto>(`/products/${id}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ quantityDelta: delta }),
  });
}
```

#### Component Code (How it is called in React)
📁 **File:** [`apps/frontend/src/app/inventory/page.tsx`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/app/inventory/page.tsx)
```typescript
// apps/frontend/src/app/inventory/page.tsx
const handleStockDelta = async (productId: string, delta: number) => {
  setAdjustingId(productId);
  const result = await updateProductStock(productId, delta);
  if (result.ok) {
    // Update local state instantly with returned updated product
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? result.data : p))
    );
  }
  setAdjustingId(null);
};

// In JSX: Triggered by clicking quick adjustment buttons (+1, +5, +20, -1)
<button onClick={() => handleStockDelta(product.id, 5)}>+5</button>
<button onClick={() => handleStockDelta(product.id, -1)}>-1</button>
```

---

### Frontend Integration for `GET /api/orders`

#### API Wrapper Code
📁 **File:** [`apps/frontend/src/lib/api.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/lib/api.ts)
```typescript
// apps/frontend/src/lib/api.ts
export async function fetchOrders(status?: OrderStatus): Promise<ApiResult<OrderDto[]>> {
  const query = status ? `?status=${status}` : '';
  return request<OrderDto[]>(`/orders${query}`);
}
```

#### Component Code (How it is called in React)
📁 **File:** [`apps/frontend/src/app/orders/page.tsx`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/app/orders/page.tsx)
```typescript
// apps/frontend/src/app/orders/page.tsx (Order Lifecycle Dashboard)
export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadOrders = async () => {
    setIsLoading(true);
    const filter = selectedStatus !== 'All' ? (selectedStatus as OrderStatus) : undefined;
    const result = await fetchOrders(filter);
    if (result.ok) {
      setOrders(result.data);
    }
    setIsLoading(false);
  };

  // Re-fetch whenever selected status tab changes or every 10s
  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [selectedStatus]);

  return (
    <div>
      {/* Status filter tab clicks */}
      <button onClick={() => setSelectedStatus('RESERVED')}>RESERVED</button>
      <button onClick={() => setSelectedStatus('PAID')}>PAID</button>
      {/* Render list of orders */}
    </div>
  );
}
```

---

### Frontend Integration for `POST /api/orders`

#### API Wrapper Code
📁 **File:** [`apps/frontend/src/lib/api.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/lib/api.ts)
```typescript
// apps/frontend/src/lib/api.ts
export async function createOrder(data: CreateOrderRequest): Promise<ApiResult<OrderDto>> {
  return request<OrderDto>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

#### Component Code (How it is called in React)
📁 **File:** [`apps/frontend/src/app/page.tsx`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/app/page.tsx)
```typescript
// apps/frontend/src/app/page.tsx
const handleCheckout = async () => {
  if (cart.length === 0) return;
  setIsReservingOrder(true);
  setReservationError(null);

  const payload = {
    items: cart.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    })),
  };

  // Call API to lock row and reserve stock in PostgreSQL
  const result = await createOrder(payload);
  setIsReservingOrder(false);

  if (result.ok) {
    // Open Checkout Modal with active reservation
    setActiveReservedOrder(result.data);
    loadProducts(); // Refresh catalog to show decreased stock
  } else {
    setReservationError(result.error.message || 'Failed to reserve stock.');
  }
};

// In CartDrawer.tsx: Triggered by clicking "Reserve Stock & Pay" button
<button onClick={onCheckout} disabled={isLoading}>Reserve Stock & Pay</button>
```

---

### Frontend Integration for `GET /api/orders/:id`

#### API Wrapper Code
📁 **File:** [`apps/frontend/src/lib/api.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/lib/api.ts)
```typescript
// apps/frontend/src/lib/api.ts
export async function fetchOrder(id: string): Promise<ApiResult<OrderDto>> {
  return request<OrderDto>(`/orders/${id}`);
}
```

#### Component Code (How it is called in React)
```typescript
// Called whenever a single order's details need to be refreshed
const loadSingleOrder = async (orderId: string) => {
  const result = await fetchOrder(orderId);
  if (result.ok) {
    setSelectedOrder(result.data);
  }
};
```

---

### Frontend Integration for `POST /api/orders/:id/cancel`

#### API Wrapper Code
📁 **File:** [`apps/frontend/src/lib/api.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/lib/api.ts)
```typescript
// apps/frontend/src/lib/api.ts
export async function cancelOrder(id: string): Promise<ApiResult<OrderDto>> {
  return request<OrderDto>(`/orders/${id}/cancel`, {
    method: 'POST',
  });
}
```

#### Component Code (How it is called in React)
📁 **File:** [`apps/frontend/src/app/orders/page.tsx`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/app/orders/page.tsx) & [`apps/frontend/src/components/CheckoutModal.tsx`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/components/CheckoutModal.tsx)
```typescript
// apps/frontend/src/app/orders/page.tsx
const handleCancelOrder = async (orderId: string) => {
  const result = await cancelOrder(orderId);
  if (result.ok) {
    loadOrders(); // Refresh orders list
  }
};

// In CheckoutModal.tsx / OrdersPage: Triggered by clicking "Cancel & Release Stock"
<button onClick={() => onCancelReservation(order.id)}>
  Cancel & Release Stock
</button>
```

---

### Frontend Integration for `POST /api/orders/:id/pay`

#### API Wrapper Code
📁 **File:** [`apps/frontend/src/lib/api.ts`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/lib/api.ts)
```typescript
// apps/frontend/src/lib/api.ts
export async function payOrder(
  id: string,
  data: PayOrderRequest
): Promise<ApiResult<{ order: OrderDto; payment: PaymentDto }>> {
  return request<{ order: OrderDto; payment: PaymentDto }>(`/orders/${id}/pay`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

#### Component Code (How it is called in React)
📁 **File:** [`apps/frontend/src/components/CheckoutModal.tsx`](file:///d:/Projects/Projects%20for%20job/pos/apps/frontend/src/components/CheckoutModal.tsx)
```typescript
// apps/frontend/src/components/CheckoutModal.tsx
const handlePay = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setErrorMessage(null);

  // Send card number and unique idempotency key
  const result = await payOrder(order.id, {
    cardNumber: cardNumber.replace(/\s+/g, ''),
    idempotencyKey,
  });

  setIsLoading(false);

  if (result.ok) {
    setCompletedPayment(result.data.payment);
    onSuccess(result.data.order, result.data.payment);

    // Trigger celebration confetti
    confetti({
      particleCount: 80,
      spread: 70,
      colors: ['#10b981', '#34d399', '#6ee7b7'],
    });
  } else {
    setErrorMessage(result.error.message || 'Payment processing failed');
  }
};

// Triggered by form submission button:
<button type="submit" disabled={isLoading}>Pay $92.50</button>
```

---

## 3. The End-to-End Pipeline & Data Flows

---

### Flow 1: Cashier Adds Items & Places an Order (Stock Reservation)

1. **User Action:** The cashier browses the catalog on `http://localhost:3000`, clicks **"+ Add to Order"**, and clicks **"Reserve Stock & Pay"** in `CartDrawer.tsx`.
2. **Frontend State & Network:** `handleCheckout()` in `page.tsx` collects product IDs and quantities from the React cart state and calls `createOrder()` in `api.ts`.
3. **HTTP Request:** A `POST` request with JSON body `{ items: [{ productId: "...", quantity: 1 }] }` hits `http://localhost:4000/api/orders`.
4. **Validation Layer:** Express runs `validate(createOrderSchema)` using Zod. If the shape is invalid (e.g. negative quantity), it rejects with `400 VALIDATION_ERROR`.
5. **Database Transaction (`orderService.createOrder`):**
   - Opens a PostgreSQL transaction (`db.transaction`).
   - Sorts product IDs alphabetically to eliminate cross-transaction deadlocks.
   - Executes `SELECT * FROM products WHERE id = $1 FOR UPDATE`. This locks the row in PostgreSQL.
   - Checks: `stockQuantity >= item.quantity`.
   - Decrements stock: `UPDATE products SET stock_quantity = stock_quantity - 1`.
   - Inserts order: `INSERT INTO orders (status='RESERVED', expires_at = NOW() + 10m)`.
   - Inserts line items: `INSERT INTO order_items (...)`.
   - Commits transaction and releases row lock.
6. **Response & UI Update:** The backend returns `{ ok: true, data: OrderDto }` with HTTP `201 Created`. Next.js receives the data, updates React state, and displays the **Checkout Modal** with a live 10-minute countdown badge.

---

### Flow 2: Cashier Processes Payment (Idempotency & Finalization)

1. **User Action:** The cashier enters card details (or clicks a 1-click test card) in `CheckoutModal.tsx` and clicks **"Pay"**.
2. **Frontend State & Network:** `handlePay()` calls `payOrder(order.id, { cardNumber, idempotencyKey })` in `api.ts`.
3. **HTTP Request:** `POST /api/orders/:id/pay` arrives at Express.
4. **Database Transaction (`paymentService.processPayment`):**
   - **Idempotency Verification:** Queries `payments` table for `idempotency_key`. If already processed, immediately returns stored receipt without charging again.
   - **Expiry Check:** Executes `SELECT *, (expires_at < NOW()) AS is_expired FROM orders WHERE id = $1 FOR UPDATE`.
   - Calls `mockPaymentGateway.processPayment()`.
   - On success: inserts payment record with `status: 'SUCCESS'` and updates order to `status: 'PAID'`.
   - Commits transaction.
5. **Response & UI Update:** Returns `{ ok: true, data: { order, payment } }`. Next.js renders the digital receipt and triggers celebratory confetti.

---

### Flow 3: Automatic Background 10-Minute Expiry Worker

1. **Scheduled Interval:** Every 30 seconds, `expiryWorker.ts` runs in the background.
2. **Database Query:** Executes `SELECT id FROM orders WHERE status = 'RESERVED' AND expires_at <= NOW() FOR UPDATE`.
3. **Inventory Restoration:**
   - Reads reserved line items for each expired order.
   - Updates `products` table: `stock_quantity = stock_quantity + quantity`.
   - Updates order status to `EXPIRED`.
4. **Console Log:** Outputs `🧹 Order Expiry Worker: Automatically expired N stale orders and restored inventory.`

---

## 4. Key Takeaways for Your Interview

1. **Why `SELECT ... FOR UPDATE`?**  
   It locks the row at the PostgreSQL storage engine level, preventing race conditions and **overselling** during high-concurrency flash sales.
2. **Why sort Product IDs?**  
   Sorting IDs alphabetically before acquiring locks guarantees that multiple transactions lock rows in the exact same sequence, making **deadlocks mathematically impossible**.
3. **Why `idempotencyKey`?**  
   Prevents double-charging if a user clicks pay twice or if a network disconnect occurs during checkout.
4. **Why Database `NOW()`?**  
   Comparing expiry against PostgreSQL's database clock eliminates client-to-server timezone discrepancies.
5. **Why `@pos/shared-types`?**  
   Guarantees end-to-end type safety between the Drizzle schema, Zod validation, API responses, and Next.js frontend components with zero duplication.
