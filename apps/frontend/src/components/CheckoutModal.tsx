'use client';

import React, { useState } from 'react';
import type { OrderDto, PaymentDto } from '@pos/shared-types';
import { payOrder } from '@/lib/api';
import { CountdownBadge } from './CountdownBadge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import confetti from 'canvas-confetti';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  Copy,
  Receipt,
  Sparkles,
} from 'lucide-react';

interface CheckoutModalProps {
  order: OrderDto;
  onClose: () => void;
  onSuccess: (order: OrderDto, payment: PaymentDto) => void;
  onCancelReservation: (orderId: string) => void;
}

export function CheckoutModal({
  order,
  onClose,
  onSuccess,
  onCancelReservation,
}: CheckoutModalProps) {
  const [cardNumber, setCardNumber] = useState('4242424242424242');
  const [idempotencyKey, setIdempotencyKey] = useState(
    () => `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedPayment, setCompletedPayment] = useState<PaymentDto | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const testCards = [
    { label: 'Standard Visa (Success)', number: '4242424242424242', color: 'emerald' },
    { label: 'Card Decline (402)', number: '4000000000000000', color: 'rose' },
    { label: 'Fraud Flag (402)', number: '4000000000008888', color: 'amber' },
  ];

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

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
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#6ee7b7', '#3b82f6'],
      });
    } else {
      setErrorMessage(result.error.message || 'Payment processing failed');
    }
  };

  const copyIdempotencyKey = () => {
    navigator.clipboard.writeText(idempotencyKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const regenerateKey = () => {
    setIdempotencyKey(`idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg glass-panel rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-scaleUp">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              {completedPayment ? <Receipt className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white">
                {completedPayment ? 'Payment Successful' : 'Checkout & Payment'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">Order ID: {order.id.substring(0, 12)}...</p>
            </div>
          </div>

          {!completedPayment && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Reservation Timer Banner (Active during checkout) */}
          {!completedPayment && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-brand-500/20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-400" />
                <span className="text-xs text-slate-300 font-medium">Inventory Reserved</span>
              </div>
              <CountdownBadge expiresAt={order.expiresAt} />
            </div>
          )}

          {/* Success State */}
          {completedPayment ? (
            <div className="space-y-5 text-center py-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-glow">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-heading font-extrabold text-2xl text-white">
                  {formatCurrency(order.totalCents)} Paid
                </h4>
                <p className="text-xs text-slate-400 mt-1">Transaction completed with verified stock</p>
              </div>

              {/* Receipt Summary Card */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 text-left space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Transaction ID</span>
                  <span className="text-slate-200 font-mono font-medium">
                    {completedPayment.transactionId || 'tx_mock_pos'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Status</span>
                  <span className="text-emerald-400 font-semibold uppercase">PAID & DEDUCTED</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Idempotency Key</span>
                  <span className="text-slate-300 font-mono truncate max-w-[200px]">
                    {completedPayment.idempotencyKey}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Timestamp</span>
                  <span className="text-slate-300">{formatDateTime(completedPayment.createdAt)}</span>
                </div>
                <div className="pt-2 border-t border-white/10 space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">Line Items:</span>
                  {order.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between text-slate-300">
                      <span>
                        {i.quantity}x {i.productName || i.productId.substring(0, 8)}
                      </span>
                      <span>{formatCurrency(i.unitPriceCents * i.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-sm shadow-glow transition-all"
              >
                Done / Start Next Order
              </button>
            </div>
          ) : (
            /* Checkout Form */
            <form onSubmit={handlePay} className="space-y-4">
              {/* Order Items Summary */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Order Items ({order.items.length})</span>
                  <span className="text-brand-400 font-bold">{formatCurrency(order.totalCents)} Total</span>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-slate-400">
                      <span className="truncate max-w-[240px]">
                        {item.quantity}x {item.productName || item.productId}
                      </span>
                      <span className="font-mono">{formatCurrency(item.unitPriceCents * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Payment Failed</p>
                    <p className="mt-0.5 text-rose-300/90">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* 1-Click Test Cards Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-brand-400" /> 1-Click Simulation Cards:
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {testCards.map((c) => (
                    <button
                      key={c.number}
                      type="button"
                      onClick={() => setCardNumber(c.number)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border text-center transition-all ${
                        cardNumber === c.number
                          ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 border-white/5 hover:border-white/20 hover:text-slate-200'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Number Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>Card Number</span>
                  <span className="text-[10px] text-slate-500 font-mono">16-digits simulated</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    required
                    placeholder="4242 •••• •••• 4242"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm font-mono text-white placeholder-slate-600 outline-none transition-all pl-10"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Idempotency Key Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-slate-300">Idempotency Key</label>
                  <button
                    type="button"
                    onClick={regenerateKey}
                    className="text-[10px] text-brand-400 hover:text-brand-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> New Key
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={idempotencyKey}
                    onChange={(e) => setIdempotencyKey(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-xs font-mono text-slate-300 outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={copyIdempotencyKey}
                    title="Copy Idempotency Key"
                    className="absolute right-3 text-slate-400 hover:text-white"
                  >
                    {isCopied ? (
                      <span className="text-[10px] text-brand-400">Copied!</span>
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Guarantees safe retries without double-charging under network hiccups.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onCancelReservation(order.id)}
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/5 transition-all"
                >
                  Cancel & Release Stock
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !cardNumber}
                  className="flex-[2] py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-400 hover:to-emerald-500 text-slate-950 font-bold text-sm shadow-glow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <span>Pay {formatCurrency(order.totalCents)}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
