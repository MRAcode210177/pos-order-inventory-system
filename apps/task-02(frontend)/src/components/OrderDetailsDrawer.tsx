'use client';

import React, { useEffect } from 'react';
import type { OrderDto } from '@pos/shared-types';
import { CountdownBadge } from './CountdownBadge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  X,
  Receipt,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ShieldCheck,
  Ban,
  Package,
  Calendar,
} from 'lucide-react';

interface OrderDetailsDrawerProps {
  order: OrderDto | null;
  isOpen: boolean;
  onClose: () => void;
  onPay?: (order: OrderDto) => void;
  onCancel?: (orderId: string) => void;
}

export function OrderDetailsDrawer({
  order,
  isOpen,
  onClose,
  onPay,
  onCancel,
}: OrderDetailsDrawerProps) {
  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const subtotalCents = order.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0
  );
  const taxCents = Math.round(subtotalCents * 0.0825); // 8.25% Tax
  const totalCents = order.totalCents || (subtotalCents + taxCents);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESERVED':
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> RESERVED
          </span>
        );
      case 'PAID':
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> {status}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">
            <XCircle className="w-3.5 h-3.5" /> CANCELLED
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-destructive/15 text-destructive border border-destructive/30">
            <AlertOctagon className="w-3.5 h-3.5" /> EXPIRED
          </span>
        );
      default:
        return (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-50 flex justify-end bg-background/80 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop Click Dismissal */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-out Drawer Panel */}
      <div className="relative w-full max-w-md h-full bg-card/95 backdrop-blur-2xl border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-out animate-slideLeft z-10">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-card/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-base text-foreground">Order Details</h2>
                <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                  #{order.id.substring(0, 8)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" />
                {order.createdAt ? formatDateTime(order.createdAt) : 'Recent Order'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-colors shadow-xs"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          {/* Status & Expiry Bar */}
          <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between gap-3 shadow-xs">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
                Order Lifecycle Status
              </p>
              {getStatusBadge(order.status)}
            </div>

            {order.status === 'RESERVED' && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
                  Hold Expiry
                </p>
                <CountdownBadge expiresAt={order.expiresAt} />
              </div>
            )}
          </div>

          {/* Reserved Stock Info Notice */}
          {order.status === 'RESERVED' && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Stock is locked in PostgreSQL via row-level locks. Complete payment before the reservation timer expires to confirm this transaction.
              </p>
            </div>
          )}

          {/* Purchased Line Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-primary" />
                <span>Line Items ({order.items.length})</span>
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">
                {order.items.reduce((s, i) => s + i.quantity, 0)} total units
              </span>
            </div>

            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-card border border-border flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-xs truncate">
                      {item.productName || `Product (${item.productId.substring(0, 8)})`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[11px] text-primary font-medium">
                        {formatCurrency(item.unitPriceCents)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        × {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono font-bold text-xs text-foreground">
                      {formatCurrency(item.unitPriceCents * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment & Audit Details */}
          {order.payment && (
            <div className="p-4 rounded-xl bg-card border border-border space-y-2 text-xs shadow-xs">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-primary" /> Payment Verification
              </p>
              <div className="space-y-1.5 pt-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gateway Status:</span>
                  <span className="font-semibold text-emerald-500 uppercase">{order.payment.status}</span>
                </div>
                {order.payment.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <span className="text-foreground truncate max-w-[180px]">{order.payment.transactionId}</span>
                  </div>
                )}
                {order.payment.createdAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Settled At:</span>
                    <span className="text-foreground">{formatDateTime(order.payment.createdAt)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pinned Bottom Footer: Summary & Actions */}
        <div className="p-5 border-t border-border bg-card/90 space-y-4 shrink-0 shadow-lg">
          {/* Financial Breakdown */}
          <div className="space-y-1.5 text-xs text-muted-foreground font-mono">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-foreground font-semibold">{formatCurrency(subtotalCents)}</span>
            </div>
            <div className="flex justify-between">
              <span>Sales Tax (8.25%)</span>
              <span className="text-foreground font-semibold">{formatCurrency(taxCents)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border text-sm font-bold text-foreground font-sans">
              <span className="font-heading">Grand Total</span>
              <span className="font-heading font-extrabold text-primary text-base font-mono">
                {formatCurrency(totalCents)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          {order.status === 'RESERVED' ? (
            <div className="flex items-center gap-2.5 pt-1">
              {onCancel && (
                <button
                  type="button"
                  onClick={() => onCancel(order.id)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-card hover:bg-destructive/10 text-destructive border border-border hover:border-destructive/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel Order</span>
                </button>
              )}
              {onPay && (
                <button
                  type="button"
                  onClick={() => onPay(order)}
                  className="flex-[2] py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-glow flex items-center justify-center gap-1.5 transition-all"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pay {formatCurrency(totalCents)}</span>
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-card hover:bg-accent text-foreground text-xs font-semibold border border-border transition-all shadow-xs"
            >
              Close Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
