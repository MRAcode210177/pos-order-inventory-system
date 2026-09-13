'use client';

import React, { useEffect, useState } from 'react';
import type { ProductDto, CreateProductRequest } from '@pos/shared-types';
import { fetchProducts, updateProductStock, createProduct } from '@/lib/api';
import { formatCurrency, formatDateTime, cn } from '@/lib/utils';
import {
  Database,
  Plus,
  Minus,
  RefreshCw,
  AlertTriangle,
  Package,
  Layers,
  Sparkles,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    sku: string;
    price: string;
    stockQuantity: string;
    category: string;
    imageUrl: string;
  }>({
    name: '',
    sku: '',
    price: '',
    stockQuantity: '10',
    category: 'Beverages',
    imageUrl: '',
  });

  const loadInventory = async () => {
    setIsLoading(true);
    const result = await fetchProducts();
    if (result.ok) {
      setProducts(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Quick Stock Adjustment
  const handleStockDelta = async (productId: string, delta: number) => {
    setAdjustingId(productId);
    const result = await updateProductStock(productId, delta);
    if (result.ok) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? result.data : p))
      );
    }
    setAdjustingId(null);
  };

  // Create Product Submit
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const priceCents = Math.round(parseFloat(formData.price) * 100);
    const stockQty = parseInt(formData.stockQuantity, 10);

    if (isNaN(priceCents) || priceCents < 0) {
      setFormError('Please enter a valid price');
      setIsSubmitting(false);
      return;
    }

    if (isNaN(stockQty) || stockQty < 0) {
      setFormError('Please enter a valid stock quantity');
      setIsSubmitting(false);
      return;
    }

    const payload: CreateProductRequest = {
      name: formData.name.trim(),
      sku: formData.sku.trim().toUpperCase(),
      priceCents,
      stockQuantity: stockQty,
      category: formData.category,
      imageUrl: formData.imageUrl.trim() || undefined,
    };

    const result = await createProduct(payload);
    setIsSubmitting(false);

    if (result.ok) {
      setShowAddModal(false);
      setFormData({
        name: '',
        sku: '',
        price: '',
        stockQuantity: '10',
        category: 'Beverages',
        imageUrl: '',
      });
      loadInventory();
    } else {
      setFormError(result.error.message || 'Failed to create product');
    }
  };

  // Metrics
  const totalStockUnits = products.reduce((sum, p) => sum + p.stockQuantity, 0);
  const lowStockCount = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 5).length;
  const outOfStockCount = products.filter((p) => p.stockQuantity === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-heading font-extrabold text-2xl text-white">Inventory Manager</h1>
            <p className="text-xs text-slate-400">
              Live stock levels, row versions, and instant stock replenishment controls.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadInventory}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold shadow-glow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <p className="text-xs text-slate-400 font-medium">Catalog SKUs</p>
          <p className="font-heading font-extrabold text-2xl text-white mt-1">{products.length}</p>
          <span className="text-[10px] text-slate-500">Active items</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <p className="text-xs text-slate-400 font-medium">Total Stock in Hand</p>
          <p className="font-heading font-extrabold text-2xl text-brand-400 mt-1">{totalStockUnits}</p>
          <span className="text-[10px] text-slate-500">Available across all products</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <p className="text-xs text-slate-400 font-medium">Low Stock Warning</p>
          <p className="font-heading font-extrabold text-2xl text-amber-400 mt-1">{lowStockCount}</p>
          <span className="text-[10px] text-amber-400/80">{"<= 5 units remaining"}</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10">
          <p className="text-xs text-slate-400 font-medium">Out of Stock</p>
          <p className="font-heading font-extrabold text-2xl text-rose-400 mt-1">{outOfStockCount}</p>
          <span className="text-[10px] text-rose-400/80">Require immediate restock</span>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-white/10 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Product Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Stock Level</th>
                <th className="py-3.5 px-4">DB Version</th>
                <th className="py-3.5 px-4 text-right">Quick Restock / Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-400 mb-2" />
                    Loading product inventory...
                  </td>
                </tr>
              ) : products.map((product) => {
                const isAdjusting = adjustingId === product.id;
                const isOutOfStock = product.stockQuantity === 0;
                const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;

                return (
                  <tr key={product.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-9 h-9 rounded-lg object-cover bg-slate-800 shrink-0 border border-white/10"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 font-mono text-[10px] shrink-0">
                            POS
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-200 text-sm">{product.name}</p>
                          <p className="font-mono text-[11px] text-slate-400">{product.sku}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-slate-900 text-slate-300 border border-white/5 font-medium">
                        {product.category || 'General'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-200 text-sm">
                      {formatCurrency(product.priceCents)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'font-mono font-bold text-sm px-2.5 py-0.5 rounded-md border',
                            isOutOfStock
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : isLowStock
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          )}
                        >
                          {product.stockQuantity}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {isOutOfStock ? 'Sold Out' : isLowStock ? 'Low Stock' : 'In Stock'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      v{product.version}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleStockDelta(product.id, -1)}
                          disabled={isAdjusting || product.stockQuantity <= 0}
                          title="Deduct 1"
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono disabled:opacity-40"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleStockDelta(product.id, 1)}
                          disabled={isAdjusting}
                          title="Add 1"
                          className="px-2 py-1 rounded bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 text-xs font-mono"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleStockDelta(product.id, 5)}
                          disabled={isAdjusting}
                          title="Add 5"
                          className="px-2 py-1 rounded bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 text-xs font-mono"
                        >
                          +5
                        </button>
                        <button
                          onClick={() => handleStockDelta(product.id, 20)}
                          disabled={isAdjusting}
                          title="Restock 20"
                          className="px-2 py-1 rounded bg-brand-500/30 hover:bg-brand-500/40 text-brand-200 border border-brand-500/40 text-xs font-mono font-bold"
                        >
                          +20
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-bold text-base text-white">Add New Product</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lavender Honey Latte"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    placeholder="BEV-LAV-01"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-brand-500 uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="Beverages">Beverages</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Merchandise">Merchandise</option>
                    <option value="Food">Food</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Price (USD $)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="5.75"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="15"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold shadow-glow flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...
                    </>
                  ) : (
                    'Save Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
