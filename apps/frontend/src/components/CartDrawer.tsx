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
    <div className="glass-panel rounded-2xl border border-white/10 flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-slate-100 text-base">Current Order</h2>
            <p className="text-xs text-slate-400">
              {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} in cart
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <button
            onClick={onClearCart}
            disabled={isLoading}
            className="text-xs text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-rose-500/20 transition-all flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Error Alert if any */}
      {errorMessage && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Order Reservation Failed</p>
            <p className="mt-0.5 text-rose-300/90">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-xl">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-500 mb-3">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <p className="font-medium text-slate-300 text-sm">Cart is empty</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
              Select products from the catalog to build an order.
            </p>
          </div>
        ) : (
          items.map(({ product, quantity }) => (
            <div
              key={product.id}
              className="p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-white/10 transition-all flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-200 text-sm truncate">{product.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-brand-400 font-semibold">
                    {formatCurrency(product.priceCents)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ({product.stockQuantity} avail)
                  </span>
                </div>
              </div>

              {/* Quantity Spinner */}
              <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-white/10">
                <button
                  onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                  className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center text-xs font-bold font-mono text-slate-100">
                  {quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                  disabled={quantity >= product.stockQuantity}
                  className={cn(
                    'w-6 h-6 rounded flex items-center justify-center transition-colors',
                    quantity >= product.stockQuantity
                      ? 'text-slate-600 cursor-not-allowed'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Line Total */}
              <div className="text-right min-w-[60px]">
                <p className="text-xs font-bold font-heading text-slate-100">
                  {formatCurrency(product.priceCents * quantity)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary Footer */}
      {items.length > 0 && (
        <div className="p-4 border-t border-white/10 bg-slate-950/80 space-y-3">
          <div className="space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-slate-200 font-mono">{formatCurrency(subtotalCents)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (8.25%)</span>
              <span className="text-slate-200 font-mono">{formatCurrency(taxCents)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/10 text-base font-bold text-slate-100">
              <span className="font-heading">Total Due</span>
              <span className="font-heading font-extrabold text-brand-400 text-lg">
                {formatCurrency(totalCents)}
              </span>
            </div>
          </div>

          {/* Concurrency Safe Guarantee Note */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-brand-500/5 px-2.5 py-1.5 rounded-lg border border-brand-500/15">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            <span>Row-level locks hold stock for 10 min during checkout</span>
          </div>

          {/* Action Button */}
          <button
            onClick={onCheckout}
            disabled={isLoading || items.length === 0}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-400 hover:to-emerald-500 active:from-brand-600 active:to-emerald-700 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-glow transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
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
