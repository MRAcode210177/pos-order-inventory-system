'use client';

import React from 'react';
import type { ProductDto } from '@pos/shared-types';
import { formatCurrency, cn } from '@/lib/utils';
import { ShoppingCart, Trash2, Plus, Minus, ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export interface CartItem {
  product: ProductDto;
  quantity: number;
}

interface CartDrawerProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  isLoading: boolean;
  errorMessage: string | null;
}

export function CartDrawer({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  isLoading,
  errorMessage,
}: CartDrawerProps) {
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  );
  const taxCents = Math.round(subtotalCents * 0.0825); // 8.25% tax
  const totalCents = subtotalCents + taxCents;
  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="glass-panel rounded-2xl border border-border flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-card/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-foreground text-base">Current Order</h2>
            <p className="text-xs text-muted-foreground">
              {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} in cart
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <button
            onClick={onClearCart}
            disabled={isLoading}
            className="text-xs text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-destructive/20 transition-all flex items-center gap-1 font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Error Alert if any */}
      {errorMessage && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Order Reservation Failed</p>
            <p className="mt-0.5 text-destructive/90">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[calc(100vh-380px)] lg:max-h-[calc(100vh-360px)]">
        {items.length === 0 ? (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <p className="font-medium text-foreground text-sm">Cart is empty</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Select products from the catalog to build an order.
            </p>
          </div>
        ) : (
          items.map(({ product, quantity }) => (
            <div
              key={product.id}
              className="p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all flex items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-primary font-semibold">
                    {formatCurrency(product.priceCents)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ({product.stockQuantity} avail)
                  </span>
                </div>
              </div>

              {/* Quantity Spinner */}
              <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg border border-border">
                <button
                  onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                  className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center text-xs font-bold font-mono text-foreground">
                  {quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                  disabled={quantity >= product.stockQuantity}
                  className={cn(
                    'w-6 h-6 rounded flex items-center justify-center transition-colors',
                    quantity >= product.stockQuantity
                      ? 'text-muted-foreground/40 cursor-not-allowed'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card'
                  )}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Line Total */}
              <div className="text-right min-w-[65px]">
                <p className="text-xs font-bold font-heading text-foreground">
                  {formatCurrency(product.priceCents * quantity)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary Footer */}
      {items.length > 0 && (
        <div className="p-4 border-t border-border bg-card/80 space-y-3">
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-foreground font-mono">{formatCurrency(subtotalCents)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (8.25%)</span>
              <span className="text-foreground font-mono">{formatCurrency(taxCents)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border text-base font-bold text-foreground">
              <span className="font-heading">Total Due</span>
              <span className="font-heading font-extrabold text-primary text-lg">
                {formatCurrency(totalCents)}
              </span>
            </div>
          </div>

          {/* Concurrency Safe Guarantee Note */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-primary/5 px-2.5 py-1.5 rounded-lg border border-primary/15">
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Row-level locks hold stock for 10 min during checkout</span>
          </div>

          {/* Action Button */}
          <button
            onClick={onCheckout}
            disabled={isLoading || items.length === 0}
            className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-glow transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
                Reserving Stock via PostgreSQL...
              </>
            ) : (
              <>
                <span>Reserve Stock & Pay</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
