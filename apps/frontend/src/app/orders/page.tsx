'use client';

import React, { useEffect, useState } from 'react';
import type { OrderDto, OrderStatus } from '@pos/shared-types';
import { ORDER_STATUSES } from '@pos/shared-types';
import { fetchOrders, cancelOrder } from '@/lib/api';
import { CountdownBadge } from '@/components/CountdownBadge';
import { CheckoutModal } from '@/components/CheckoutModal';
import { formatCurrency, formatDateTime, cn } from '@/lib/utils';
import {
  Layers,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  CreditCard,
  Ban,
  Package,
} from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [payingOrder, setPayingOrder] = useState<OrderDto | null>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    const filter = selectedStatus !== 'All' ? (selectedStatus as OrderStatus) : undefined;
    const result = await fetchOrders(filter);
    if (result.ok) {
      setOrders(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000); // Auto-sync every 10s
    return () => clearInterval(interval);
  }, [selectedStatus]);

  const handleCancelOrder = async (orderId: string) => {
    const result = await cancelOrder(orderId);
    if (result.ok) {
      loadOrders();
      if (payingOrder?.id === orderId) {
        setPayingOrder(null);
      }
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'RESERVED':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> RESERVED
          </span>
        );
      case 'PAID':
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> {status}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
            <XCircle className="w-3.5 h-3.5" /> CANCELLED
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-destructive/15 text-destructive border border-destructive/30">
            <AlertOctagon className="w-3.5 h-3.5" /> EXPIRED
          </span>
        );
      default:
        return (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-5 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-2xl text-foreground">Order Lifecycle</h1>
              <p className="text-xs text-muted-foreground">
                Track active stock reservations, completed transactions, and automated stock release events.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadOrders}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-semibold border border-border transition-all self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedStatus('All')}
          className={cn(
            'px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap',
            selectedStatus === 'All'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border'
          )}
        >
          All Orders ({orders.length})
        </button>
        {ORDER_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap',
              selectedStatus === status
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border'
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {isLoading && orders.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl h-28 animate-pulse bg-muted/40 border border-border" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-border space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-foreground">No orders found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {selectedStatus === 'All'
              ? 'No orders have been placed yet. Place an order from the POS Terminal.'
              : `No orders currently match the '${selectedStatus}' status filter.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="glass-card rounded-2xl p-5 border border-border flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-primary/40 transition-all shadow-sm"
            >
              {/* Order Meta & Status */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-1 rounded-md border border-border">
                    #{order.id.substring(0, 8)}
                  </span>
                  {getStatusBadge(order.status)}
                  {order.status === 'RESERVED' && (
                    <CountdownBadge expiresAt={order.expiresAt} onExpire={loadOrders} />
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Created: {formatDateTime(order.createdAt)}
                </p>

                {/* Line Items Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {order.items.map((item, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-lg bg-card text-foreground border border-border font-medium shadow-xs"
                    >
                      {item.quantity}x {item.productName || item.productId.substring(0, 8)} (
                      {formatCurrency(item.unitPriceCents)})
                    </span>
                  ))}
                </div>
              </div>

              {/* Price and Actions */}
              <div className="flex sm:items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                <div className="text-left md:text-right">
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="font-heading font-extrabold text-xl text-primary">
                    {formatCurrency(order.totalCents)}
                  </p>
                </div>

                {order.status === 'RESERVED' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="p-2.5 rounded-xl bg-card hover:bg-destructive/10 text-destructive border border-border hover:border-destructive/30 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                      title="Cancel order and release reserved inventory"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Cancel</span>
                    </button>
                    <button
                      onClick={() => setPayingOrder(order)}
                      className="py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-glow transition-all flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay Now</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checkout Modal */}
      {payingOrder && (
        <CheckoutModal
          order={payingOrder}
          onClose={() => setPayingOrder(null)}
          onSuccess={() => {
            setPayingOrder(null);
            loadOrders();
          }}
          onCancelReservation={(orderId) => {
            handleCancelOrder(orderId);
            setPayingOrder(null);
          }}
        />
      )}
    </div>
  );
}
