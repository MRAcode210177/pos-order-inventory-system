'use client';

import React, { useState, useEffect } from 'react';
import type { ProductDto } from '@pos/shared-types';
import { fetchProducts, createOrder, updateProductStock } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Zap,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Cpu,
  AlertTriangle,
} from 'lucide-react';

interface SimulationResult {
  buyerIndex: number;
  success: boolean;
  status: number;
  orderId?: string;
  errorMessage?: string;
  latencyMs: number;
}

export default function StressTestPage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [concurrentCount, setConcurrentCount] = useState<number>(20);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [initialStockBeforeRun, setInitialStockBeforeRun] = useState<number | null>(null);
  const [finalStockAfterRun, setFinalStockAfterRun] = useState<number | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);

  const loadProducts = async () => {
    const res = await fetchProducts();
    if (res.ok) {
      setProducts(res.data);
      if (res.data.length > 0 && !selectedProductId) {
        // Default to low stock item if available, or first item
        const lowStock = res.data.find((p) => p.stockQuantity > 0 && p.stockQuantity <= 5);
        setSelectedProductId(lowStock?.id || res.data[0]!.id);
      }
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Set selected product's stock to 5 for an ideal demonstration
  const handleResetStockTo5 = async () => {
    if (!selectedProduct) return;
    const delta = 5 - selectedProduct.stockQuantity;
    const res = await updateProductStock(selectedProduct.id, delta);
    if (res.ok) {
      setProducts((prev) => prev.map((p) => (p.id === selectedProduct.id ? res.data : p)));
    }
  };

  // Run the simultaneous concurrency race
  const runConcurrencyRace = async () => {
    if (!selectedProduct) return;

    setIsRunning(true);
    setResults([]);
    setFinalStockAfterRun(null);
    setExecutionTimeMs(null);

    const initialStock = selectedProduct.stockQuantity;
    setInitialStockBeforeRun(initialStock);

    const startTime = performance.now();

    // Fire all concurrent requests simultaneously using Promise.all
    const promises = Array.from({ length: concurrentCount }).map(async (_, idx) => {
      const buyerIndex = idx + 1;
      const reqStart = performance.now();

      const res = await createOrder({
        items: [{ productId: selectedProduct.id, quantity: 1 }],
      });

      const latencyMs = Math.round(performance.now() - reqStart);

      if (res.ok) {
        return {
          buyerIndex,
          success: true,
          status: 201,
          orderId: res.data.id,
          latencyMs,
        };
      } else {
        return {
          buyerIndex,
          success: false,
          status: 409,
          errorMessage: res.error.message,
          latencyMs,
        };
      }
    });

    const settledResults = await Promise.all(promises);
    const totalDuration = Math.round(performance.now() - startTime);

    setResults(settledResults);
    setExecutionTimeMs(totalDuration);

    // Refresh stock from DB after the test
    const updatedProductsRes = await fetchProducts();
    if (updatedProductsRes.ok) {
      setProducts(updatedProductsRes.data);
      const updatedProduct = updatedProductsRes.data.find((p) => p.id === selectedProduct.id);
      setFinalStockAfterRun(updatedProduct?.stockQuantity ?? 0);
    }

    setIsRunning(false);
  };

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;
  const isVerifiedSafe =
    initialStockBeforeRun !== null &&
    finalStockAfterRun !== null &&
    successCount <= initialStockBeforeRun &&
    finalStockAfterRun === Math.max(0, initialStockBeforeRun - successCount);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-5 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-extrabold text-2xl text-foreground">
                Concurrency Race Visualizer
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                Stress Tester
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Simulate high-concurrency flash sales to prove PostgreSQL row-level locks prevent overselling.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-card px-3 py-1.5 rounded-xl border border-border shadow-xs">
          <Cpu className="w-4 h-4 text-primary" />
          <span>PostgreSQL FOR UPDATE</span>
        </div>
      </div>

      {/* Control Configuration Panel */}
      <div className="glass-panel rounded-2xl p-6 border border-border space-y-5 shadow-sm">
        <h2 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
          <span>1. Configure Race Condition Scenario</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Target Product Picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">Target Product to Race For</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={isRunning}
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary font-medium shadow-inner"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.stockQuantity} in stock)
                </option>
              ))}
            </select>
            {selectedProduct && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>
                  Current Stock: <strong className="text-primary font-mono">{selectedProduct.stockQuantity}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleResetStockTo5}
                  disabled={isRunning}
                  className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
                >
                  Set to 5 Units
                </button>
              </div>
            )}
          </div>

          {/* Concurrent Buyers Count */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground block">Simultaneous Concurrent Buyers</label>
            <div className="grid grid-cols-3 gap-2">
              {[10, 20, 50].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setConcurrentCount(count)}
                  disabled={isRunning}
                  className={cn(
                    'py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all border shadow-xs',
                    concurrentCount === count
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-card text-muted-foreground border-border hover:border-foreground/20 hover:text-foreground'
                  )}
                >
                  {count} Buyers
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              All requests fire at the exact same millisecond via <code className="text-primary font-mono">Promise.all()</code>.
            </p>
          </div>

          {/* Trigger Action */}
          <div className="space-y-2 flex flex-col justify-end">
            <button
              onClick={runConcurrencyRace}
              disabled={isRunning || !selectedProduct}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/15 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  Racing {concurrentCount} Simultaneous Requests...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Launch Concurrency Race</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Verification & Proof Panel */}
      {results.length > 0 && (
        <div className="space-y-5 animate-fadeIn">
          {/* Assertion Summary Card */}
          <div
            className={cn(
              'glass-panel rounded-2xl p-5 border shadow-md',
              isVerifiedSafe ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-destructive/40 bg-destructive/5'
            )}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    isVerifiedSafe ? 'bg-emerald-500/20 text-emerald-500' : 'bg-destructive/20 text-destructive'
                  )}
                >
                  {isVerifiedSafe ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-foreground">
                    {isVerifiedSafe ? '100% Concurrency Safe — Zero Overselling' : 'Concurrency Violation Detected'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Execution time: <span className="font-mono text-foreground font-semibold">{executionTimeMs}ms</span> across {concurrentCount} parallel connections.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1 rounded-full font-mono font-bold bg-card border border-border text-primary shadow-xs">
                  Proof: Initial ({initialStockBeforeRun}) = Reserved ({successCount}) + Remaining ({finalStockAfterRun})
                </span>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              <div className="bg-card p-3 rounded-xl border border-border shadow-xs">
                <p className="text-[11px] text-muted-foreground">Total Fired</p>
                <p className="font-mono font-bold text-xl text-foreground">{results.length}</p>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 shadow-xs">
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">201 Success (Reserved)</p>
                <p className="font-mono font-bold text-xl text-emerald-600 dark:text-emerald-300">{successCount}</p>
              </div>
              <div className="bg-destructive/10 p-3 rounded-xl border border-destructive/20 shadow-xs">
                <p className="text-[11px] text-destructive font-medium">409 Out of Stock (Blocked)</p>
                <p className="font-mono font-bold text-xl text-destructive">{failedCount}</p>
              </div>
              <div className="bg-card p-3 rounded-xl border border-border shadow-xs">
                <p className="text-[11px] text-muted-foreground">Final DB Stock</p>
                <p className="font-mono font-bold text-xl text-primary">{finalStockAfterRun}</p>
              </div>
            </div>
          </div>

          {/* Live Request Waterfall Stream */}
          <div className="glass-panel rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="p-4 bg-card border-b border-border flex items-center justify-between">
              <h4 className="font-heading font-bold text-sm text-foreground">
                Live Transaction Waterfall Log
              </h4>
              <span className="text-xs text-muted-foreground font-mono">{results.length} requests processed</span>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-border/40 p-2 space-y-1">
              {results.map((res) => (
                <div
                  key={res.buyerIndex}
                  className={cn(
                    'p-2.5 rounded-xl text-xs flex items-center justify-between gap-3 font-mono transition-all',
                    res.success
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-destructive/10 border border-destructive/20 text-destructive'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {res.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                    )}
                    <span className="font-bold">Buyer #{res.buyerIndex.toString().padStart(2, '0')}</span>
                    <span className="text-muted-foreground">→</span>
                    <span>
                      {res.success
                        ? `HTTP 201 Created — Order #${res.orderId?.substring(0, 8)}`
                        : `HTTP 409 Rejected — ${res.errorMessage}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{res.latencyMs}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
