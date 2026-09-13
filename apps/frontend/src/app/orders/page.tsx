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
          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> RESERVED
          </span>
        );
      case 'PAID':
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> {status}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-300 border border-white/10">
            <XCircle className="w-3.5 h-3.5" /> CANCELLED
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertOctagon className="w-3.5 h-3.5" /> EXPIRED
          </span>
        );
      default:
        return (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/10">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-2xl text-white">Order Lifecycle</h1>
              <p className="text-xs text-slate-400">
                Track active stock reservations, completed transactions, and automated stock release events.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadOrders}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
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
              ? 'bg-brand-500 text-slate-950 shadow-glow'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/5'
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
                ? 'bg-brand-500 text-slate-950 shadow-glow'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/5'
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
            <div key={i} className="glass-card rounded-2xl h-28 animate-pulse bg-slate-800/40 border border-white/5" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-white/10 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-500">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-200">No orders found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
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
              className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-brand-500/30 transition-all"
            >
              {/* Order Meta & Status */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-slate-300 bg-slate-900 px-2 py-1 rounded-md border border-white/10">
                    #{order.id.substring(0, 8)}
                  </span>
                  {getStatusBadge(order.status)}
                  {order.status === 'RESERVED' && (
                    <CountdownBadge expiresAt={order.expiresAt} onExpire={loadOrders} />
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  Created: {formatDateTime(order.createdAt)}
                </p>

                {/* Line Items Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {order.items.map((item, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-900/80 text-slate-300 border border-white/5 font-medium"
                    >
                      {item.quantity}x {item.productName || item.productId.substring(0, 8)} (
                      {formatCurrency(item.unitPriceCents)})
                    </span>
                  ))}
                </div>
              </div>

              {/* Price and Actions */}
              <div className="flex sm:items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
                <div className="text-left md:text-right">
                  <p className="text-xs text-slate-400">Total Amount</p>
                  <p className="font-heading font-extrabold text-xl text-brand-400">
                    {formatCurrency(order.totalCents)}
                  </p>
                </div>

                {order.status === 'RESERVED' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 border border-white/5 transition-all text-xs font-semibold flex items-center gap-1.5"
                      title="Cancel order and release reserved inventory"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Cancel</span>
                    </button>
                    <button
                      onClick={() => setPayingOrder(order)}
                      className="py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-glow transition-all flex items-center gap-1.5"
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
