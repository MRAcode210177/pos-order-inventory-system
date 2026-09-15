# Enterprise UI/UX Upgrade: Pagination, Data Tables & POS Cart Optimization

This document outlines the complete architectural upgrade implemented for **NexusPOS**, transitioning the system to an enterprise-grade UI standard with full-stack pagination, responsive data tables, a slide-out order details drawer, and a fixed-header scrollable POS cart.

---

## 1. Full-Stack Pagination Architecture

### 1.1 Shared API Types (`packages/shared-types/src/api.ts`)
The API envelope includes metadata for pagination without breaking existing contracts:

```typescript
export interface PaginationMeta {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export type ApiResult<T> =
  | { ok: true; data: T; pagination?: PaginationMeta }
  | { ok: false; error: { code: string; message: string; details?: unknown } };
```

---

### 1.2 Backend Implementation (Express & Drizzle ORM)

#### Products Service (`apps/backend/src/services/productService.ts`)
Calculates total matching rows using SQL `COUNT(*)`, then applies Drizzle's `.limit()` and `.offset()`:

```typescript
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

  // 1. Total matching count
  const [countResult] = await db
    .select({ total: sql<number>`cast(count(*) as integer)` })
    .from(products)
    .where(whereClause);

  const total = Number(countResult?.total ?? 0);
  const currentPage = page && page > 0 ? page : 1;
  const pageLimit = limit && limit > 0 ? limit : (page ? 10 : (total > 0 ? total : 10));
  const totalPages = Math.max(1, Math.ceil(total / pageLimit));
  const offset = (currentPage - 1) * pageLimit;

  // 2. Query paginated slice
  let query = db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(desc(products.createdAt));

  if (page || limit) {
    query = query.limit(pageLimit).offset(offset);
  }

  const rows = await query;
  const items = rows.map((p) => ({
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
    pagination: { total, totalPages, currentPage, limit: pageLimit },
  };
}
```

#### Orders Service (`apps/backend/src/services/orderService.ts`)
Applies pagination and joins line items and payment gateway status:

```typescript
export async function listOrders(
  statusFilter?: OrderStatus,
  page?: number,
  limit?: number
): Promise<{ items: OrderDto[]; pagination: PaginationMeta }> {
  const whereClause = statusFilter ? eq(orders.status, statusFilter) : undefined;

  const [countResult] = await db
    .select({ total: sql<number>`cast(count(*) as integer)` })
    .from(orders)
    .where(whereClause);

  const total = Number(countResult?.total ?? 0);
  const currentPage = page && page > 0 ? page : 1;
  const pageLimit = limit && limit > 0 ? limit : (page ? 10 : (total > 0 ? total : 10));
  const totalPages = Math.max(1, Math.ceil(total / pageLimit));
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
  // Map rows with line items and payments ...
  return { items: results, pagination: { total, totalPages, currentPage, limit: pageLimit } };
}
```

---

### 1.3 Reusable Next.js `<Pagination />` Component (`apps/frontend/src/components/Pagination.tsx`)

Designed with smart page ellipses, accessibility, and standard Tailwind tokens:

```tsx
'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  total,
  limit,
  onPageChange,
  className,
}: PaginationProps) {
  if (total === 0) return null;

  const startItem = Math.min((currentPage - 1) * limit + 1, total);
  const endItem = Math.min(currentPage * limit, total);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card/40 text-xs', className)}>
      <div className="text-muted-foreground">
        Showing <span className="font-semibold text-foreground font-mono">{startItem}</span> to{' '}
        <span className="font-semibold text-foreground font-mono">{endItem}</span> of{' '}
        <span className="font-semibold text-foreground font-mono">{total}</span> results
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) => {
            if (page === '...') {
              return <span key={`ellipsis-${idx}`} className="px-2 py-1 text-muted-foreground font-mono">...</span>;
            }
            const pageNum = page as number;
            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  'min-w-[30px] h-[30px] px-2 rounded-lg font-mono font-medium text-xs flex items-center justify-center transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground font-bold shadow-glow border border-primary'
                    : 'bg-card hover:bg-accent text-muted-foreground hover:text-foreground border border-border'
                )}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
```

---

## 2. Enterprise Order History Data Table

The Order History page (`apps/frontend/src/app/orders/page.tsx`) has been transformed into a responsive, high-density data table:

```tsx
<div className="glass-panel rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col">
  <div className="overflow-x-auto">
    <table className="w-full text-left text-xs">
      <thead className="bg-card text-muted-foreground border-b border-border uppercase tracking-wider font-semibold">
        <tr>
          <th className="py-3.5 px-4">Order ID & Items</th>
          <th className="py-3.5 px-4 hidden md:table-cell">Date & Time</th>
          <th className="py-3.5 px-4">Status</th>
          <th className="py-3.5 px-4 hidden lg:table-cell">Payment / Method</th>
          <th className="py-3.5 px-4 text-right">Total Amount</th>
          <th className="py-3.5 px-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/60">
        {orders.map((order) => (
          <tr key={order.id} className="hover:bg-muted/40 transition-colors group">
            {/* Order # and Item Preview */}
            <td className="py-3.5 px-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-foreground group-hover:text-primary">
                    #{order.id.substring(0, 8)}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-card text-[11px] font-medium border border-border text-muted-foreground">
                    {order.items.reduce((s, i) => s + i.quantity, 0)} items
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                  {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                </p>
              </div>
            </td>

            {/* Date & Time (Hidden on Mobile) */}
            <td className="py-3.5 px-4 hidden md:table-cell font-mono text-muted-foreground">
              {formatDateTime(order.createdAt)}
            </td>

            {/* Status with Dynamic Badges */}
            <td className="py-3.5 px-4">{getStatusBadge(order.status)}</td>

            {/* Payment Method (Hidden on Mobile/Tablet) */}
            <td className="py-3.5 px-4 hidden lg:table-cell">
              <CreditCard className="w-3.5 h-3.5 inline mr-1 text-primary" />
              {order.payment?.transactionId || 'Card (Mock)'}
            </td>

            {/* Total Amount */}
            <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-primary">
              {formatCurrency(order.totalCents)}
            </td>

            {/* Actions: View Drawer Button */}
            <td className="py-3.5 px-4 text-right">
              <button
                onClick={() => setViewingOrder(order)}
                className="px-2.5 py-1.5 rounded-lg bg-card hover:bg-accent text-muted-foreground hover:text-foreground border border-border text-xs font-semibold"
              >
                <FileText className="w-3.5 h-3.5 text-primary inline mr-1" />
                View
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  <Pagination
    currentPage={pagination.currentPage}
    totalPages={pagination.totalPages}
    total={pagination.total}
    limit={pagination.limit}
    onPageChange={(p) => setPage(p)}
  />
</div>
```

---

## 3. Order Details Slide-Out Drawer

Component location: `apps/frontend/src/components/OrderDetailsDrawer.tsx`

```tsx
<div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm animate-fadeIn">
  {/* Backdrop */}
  <div className="absolute inset-0" onClick={onClose} />

  {/* Drawer Panel */}
  <div className="relative w-full max-w-md h-full bg-card/95 backdrop-blur-2xl border-l border-border shadow-2xl flex flex-col animate-slideLeft z-10">
    {/* Pinned Header */}
    <div className="p-5 border-b border-border flex items-center justify-between shrink-0 bg-card/80">
      <h2 className="font-heading font-bold text-base text-foreground">Order Details</h2>
      <button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>

    {/* Scrollable Body */}
    <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
      {/* Line Items */}
      {order.items.map((item, idx) => (
        <div key={idx} className="p-3 rounded-xl bg-card border border-border flex justify-between">
          <div>
            <p className="font-semibold text-xs text-foreground">{item.productName}</p>
            <p className="text-[10px] text-muted-foreground">{formatCurrency(item.unitPriceCents)} × {item.quantity}</p>
          </div>
          <p className="font-mono font-bold text-xs">{formatCurrency(item.unitPriceCents * item.quantity)}</p>
        </div>
      ))}
    </div>

    {/* Pinned Footer */}
    <div className="p-5 border-t border-border bg-card/90 space-y-4 shrink-0">
      <div className="flex justify-between text-sm font-bold">
        <span>Total Due</span>
        <span className="text-primary font-mono">{formatCurrency(order.totalCents)}</span>
      </div>
      {order.status === 'RESERVED' && (
        <button onClick={() => onPay(order)} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold">
          Pay {formatCurrency(order.totalCents)}
        </button>
      )}
    </div>
  </div>
</div>
```

---

## 4. Scrollable POS Cart Fix (CSS / Tailwind Structure)

To keep the Cart Header and Pay Button fixed while allowing the item list to scroll freely, the parent and child flex containers require specific Tailwind classes:

```tsx
/* Outer POS Layout: Fixed Height Sticky Container */
<div className="w-full xl:w-[400px] shrink-0 sticky top-20">
  
  /* Cart Container: Bounded Viewport Height & Flex Column */
  <div className="glass-panel rounded-2xl border border-border flex flex-col h-[calc(100vh-6rem)] max-h-[850px] overflow-hidden shadow-xl">
    
    /* 1. Header: Fixed with shrink-0 */
    <div className="shrink-0 p-4 border-b border-border flex items-center justify-between bg-card/60">
      <h2 className="font-bold text-base">Current Order</h2>
    </div>

    /* 2. Items List: Scrollable with flex-1, overflow-y-auto, and min-h-0 */
    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 scrollbar-thin">
      {items.map((item) => (
        <CartItemRow key={item.product.id} item={item} />
      ))}
    </div>

    /* 3. Footer: Pinned at bottom with shrink-0 */
    <div className="shrink-0 p-4 border-t border-border bg-card/80 space-y-3">
      <div className="flex justify-between font-bold text-base">
        <span>Total Due</span>
        <span className="text-primary font-extrabold">{formatCurrency(totalCents)}</span>
      </div>
      <button className="w-full py-3 rounded-xl bg-primary font-bold">
        Reserve Stock & Pay
      </button>
    </div>

  </div>
</div>
```

> **Why `min-h-0` is Critical:** In CSS Flexbox, flex children have a default `min-height: auto`. Without `min-h-0`, a child container with `flex-1 overflow-y-auto` will expand to fit its contents rather than scrolling within the parent's fixed height. Adding `min-h-0` forces the browser to constrain the container and trigger vertical scrolling.
