'use client';

import React, { useEffect, useState, useCallback } from 'react';
import type { OrderDto, OrderStatus, PaginationMeta } from '@pos/shared-types';
import { ORDER_STATUSES } from '@pos/shared-types';
import { fetchOrders, cancelOrder } from '@/lib/api';
import { CountdownBadge } from '@/components/CountdownBadge';
import { CheckoutModal } from '@/components/CheckoutModal';
import { OrderDetailsDrawer } from '@/components/OrderDetailsDrawer';
import { Pagination } from '@/components/Pagination';
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
  FileText,
  Loader2,
  Calendar,
} from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(8);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 8,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [payingOrder, setPayingOrder] = useState<OrderDto | null>(null);
  const [viewingOrder, setViewingOrder] = useState<OrderDto | null>(null);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    const filter = selectedStatus !== 'All' ? (selectedStatus as OrderStatus) : undefined;
    const result = await fetchOrders(filter, page, limit);
    if (result.ok) {
      setOrders(result.data);
      if (result.pagination) {
        setPagination(result.pagination);
      } else {
        setPagination({
          total: result.data.length,
          totalPages: Math.max(1, Math.ceil(result.data.length / limit)),
          currentPage: page,
          limit,
        });
      }
    }
    setIsLoading(false);
  }, [selectedStatus, page, limit]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000); // Auto-sync every 10s
    return () => clearInterval(interval);
  }, [loadOrders]);

  // Handle status filter click
  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    setPage(1); // Reset to page 1 on filter change
  };

  const handleCancelOrder = async (orderId: string) => {
    const result = await cancelOrder(orderId);
    if (result.ok) {
      loadOrders();
      if (payingOrder?.id === orderId) {
        setPayingOrder(null);
      }
      if (viewingOrder?.id === orderId) {
        setViewingOrder(result.data);
      }
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'RESERVED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> RESERVED
          </span>
        );
      case 'PAID':
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> {status}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
            <XCircle className="w-3.5 h-3.5" /> CANCELLED
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-destructive/15 text-destructive border border-destructive/30">
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-heading font-extrabold text-2xl text-foreground">Order Management</h1>
            <p className="text-xs text-muted-foreground">
              Audit trail of reservations, payments, stock settlements, and customer receipts.
            </p>
          </div>
        </div>

        <button
          onClick={loadOrders}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-semibold border border-border transition-all self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          <span>Sync Orders</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => handleStatusFilter('All')}
          className={cn(
            'px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shadow-xs',
            selectedStatus === 'All'
              ? 'bg-primary text-primary-foreground font-bold shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border'
          )}
        >
          All Orders ({pagination.total})
        </button>
        {ORDER_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => handleStatusFilter(status)}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shadow-xs',
              selectedStatus === status
                ? 'bg-primary text-primary-foreground font-bold shadow-glow'
                : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border'
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Responsive Enterprise Orders Table */}
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
              {isLoading && orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    Loading orders database...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
                      <Package className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">No orders found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                      {selectedStatus === 'All'
                        ? 'No transactions recorded yet. Create an order from the POS Terminal.'
                        : `No records currently match the '${selectedStatus}' filter.`}
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const totalUnits = order.items.reduce((s, i) => s + i.quantity, 0);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      {/* Order # and Item Preview */}
                      <td className="py-3.5 px-3 sm:px-4 max-w-[220px] sm:max-w-[320px] min-w-0">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                              #{order.id.substring(0, 8)}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-card text-[11px] font-medium border border-border text-muted-foreground">
                              {totalUnits} {totalUnits === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                          {/* Mobile-only date view */}
                          <p className="text-[11px] text-muted-foreground md:hidden flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3" />
                            {order.createdAt ? formatDateTime(order.createdAt) : ''}
                          </p>
                          {/* Sliced & truncated item preview snippet */}
                          <p className="text-[11px] text-muted-foreground truncate block max-w-full">
                            {order.items.slice(0, 3).map((i) => `${i.quantity}x ${i.productName || 'Item'}`).join(', ') +
                              (order.items.length > 3 ? ` +${order.items.length - 3} more` : '')}
                          </p>
                        </div>
                      </td>

                      {/* Date & Time (Desktop/Tablet) */}
                      <td className="py-3.5 px-4 hidden md:table-cell font-mono text-muted-foreground text-xs">
                        {order.createdAt ? formatDateTime(order.createdAt) : 'N/A'}
                      </td>

                      {/* Status + Countdown */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                          {getStatusBadge(order.status)}
                          {order.status === 'RESERVED' && (
                            <CountdownBadge expiresAt={order.expiresAt} onExpire={loadOrders} />
                          )}
                        </div>
                      </td>

                      {/* Payment / Gateway (Desktop) */}
                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        {order.payment ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground bg-card px-2 py-0.5 rounded border border-border">
                              <CreditCard className="w-3 h-3 text-primary" /> Card (Mock)
                            </span>
                            {order.payment.transactionId && (
                              <p className="font-mono text-[10px] text-muted-foreground truncate max-w-[140px]">
                                {order.payment.transactionId}
                              </p>
                            )}
                          </div>
                        ) : order.status === 'RESERVED' ? (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            Awaiting Payment
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-mono">Unpaid</span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-primary">
                        {formatCurrency(order.totalCents)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Order Drawer Button */}
                          <button
                            onClick={() => setViewingOrder(order)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-card hover:bg-accent text-muted-foreground hover:text-foreground border border-border text-xs font-semibold transition-all shadow-xs"
                            title="View complete order details & receipt"
                          >
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            <span className="hidden sm:inline">View</span>
                          </button>

                          {/* Quick Pay Now for Reserved Orders */}
                          {order.status === 'RESERVED' && (
                            <>
                              <button
                                onClick={() => setPayingOrder(order)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-glow transition-all"
                                title="Process payment for this order"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay</span>
                              </button>

                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                className="p-1.5 rounded-lg bg-card hover:bg-destructive/15 text-destructive border border-border hover:border-destructive/30 transition-all text-xs"
                                title="Cancel order and release reserved stock"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Enterprise Pagination Component */}
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={(newPage) => setPage(newPage)}
        />
      </div>

      {/* Slide-out Order Details Drawer */}
      <OrderDetailsDrawer
        order={viewingOrder}
        isOpen={Boolean(viewingOrder)}
        onClose={() => setViewingOrder(null)}
        onPay={(order) => {
          setViewingOrder(null);
          setPayingOrder(order);
        }}
        onCancel={(orderId) => {
          handleCancelOrder(orderId);
        }}
      />

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
