'use client';

import React, { useEffect, useState } from 'react';
import type { ProductDto, CreateProductRequest, UpdateProductRequest, PaginationMeta } from '@pos/shared-types';
import { fetchProducts, updateProductStock, createProduct, updateProduct, deleteProduct, toggleProductStatus } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import {
  Database,
  Plus,
  RefreshCw,
  AlertTriangle,
  X,
  Loader2,
  Pencil,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(8);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 8,
  });
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit & Delete Modal States
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);
  const [editFormData, setEditFormData] = useState<{
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
    stockQuantity: '',
    category: 'Beverages',
    imageUrl: '',
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [deletingProduct, setDeletingProduct] = useState<ProductDto | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Add Product Form State
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

  const loadInventory = async (targetPage: number = page) => {
    setIsLoading(true);
    const result = await fetchProducts(undefined, undefined, true, targetPage, limit);
    if (result.ok) {
      setProducts(result.data);
      if (result.pagination) {
        setPagination(result.pagination);
      } else {
        setPagination({
          total: result.data.length,
          totalPages: Math.max(1, Math.ceil(result.data.length / limit)),
          currentPage: targetPage,
          limit,
        });
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadInventory(page);
  }, [page]);

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

  // Toggle Product Status (Active / Archived)
  const handleToggleStatus = async (productId: string) => {
    setTogglingId(productId);
    const result = await toggleProductStatus(productId);
    setTogglingId(null);
    if (result.ok) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isActive: result.data.isActive } : p))
      );
    } else {
      alert(result.error.message || 'Failed to update product status');
    }
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

  // Open Edit Modal
  const handleOpenEdit = (product: ProductDto) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      sku: product.sku,
      price: (product.priceCents / 100).toFixed(2),
      stockQuantity: product.stockQuantity.toString(),
      category: product.category || 'Beverages',
      imageUrl: product.imageUrl || '',
    });
    setEditError(null);
  };

  // Edit Product Submit
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsEditSubmitting(true);
    setEditError(null);

    const priceCents = Math.round(parseFloat(editFormData.price) * 100);
    const stockQty = parseInt(editFormData.stockQuantity, 10);

    if (isNaN(priceCents) || priceCents < 0) {
      setEditError('Please enter a valid price');
      setIsEditSubmitting(false);
      return;
    }

    if (isNaN(stockQty) || stockQty < 0) {
      setEditError('Please enter a valid stock quantity');
      setIsEditSubmitting(false);
      return;
    }

    const payload: UpdateProductRequest = {
      name: editFormData.name.trim(),
      sku: editFormData.sku.trim().toUpperCase(),
      priceCents,
      stockQuantity: stockQty,
      category: editFormData.category,
      imageUrl: editFormData.imageUrl.trim() || undefined,
    };

    const result = await updateProduct(editingProduct.id, payload);
    setIsEditSubmitting(false);

    if (result.ok) {
      setEditingProduct(null);
      loadInventory();
    } else {
      setEditError(result.error.message || 'Failed to update product details');
    }
  };

  // Delete Product Confirmation Submit
  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;

    setIsDeleting(true);
    setDeleteError(null);

    const result = await deleteProduct(deletingProduct.id);
    setIsDeleting(false);

    if (result.ok) {
      setDeletingProduct(null);
      loadInventory();
    } else {
      setDeleteError(result.error.message || 'Failed to delete product');
    }
  };

  // Metrics
  const totalStockUnits = products.reduce((sum, p) => sum + p.stockQuantity, 0);
  const lowStockCount = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 5).length;
  const outOfStockCount = products.filter((p) => p.stockQuantity === 0).length;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-5 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-heading font-extrabold text-2xl text-foreground">Inventory Manager</h1>
            <p className="text-xs text-muted-foreground">
              Live stock levels, row versions, inline editing, and instant replenishment controls.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadInventory()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-semibold border border-border transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-glow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-border shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Catalog SKUs</p>
          <p className="font-heading font-extrabold text-2xl text-foreground mt-1">{products.length}</p>
          <span className="text-[10px] text-muted-foreground">Active items</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-border shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Total Stock in Hand</p>
          <p className="font-heading font-extrabold text-2xl text-primary mt-1">{totalStockUnits}</p>
          <span className="text-[10px] text-muted-foreground">Available across all products</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-border shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Low Stock Warning</p>
          <p className="font-heading font-extrabold text-2xl text-amber-500 mt-1">{lowStockCount}</p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400">{"<= 5 units remaining"}</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-border shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Out of Stock</p>
          <p className="font-heading font-extrabold text-2xl text-destructive mt-1">{outOfStockCount}</p>
          <span className="text-[10px] text-destructive">Require immediate restock</span>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-panel rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-card text-muted-foreground border-b border-border uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Product Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Stock Level</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">DB Version</th>
                <th className="py-3.5 px-4">Quick Restock</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    Loading product inventory...
                  </td>
                </tr>
              ) : products.map((product) => {
                const isAdjusting = adjustingId === product.id;
                const isOutOfStock = product.stockQuantity === 0;
                const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;

                return (
                  <tr key={product.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-9 h-9 rounded-lg object-cover bg-muted shrink-0 border border-border"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-mono text-[10px] shrink-0 border border-border">
                            POS
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-foreground text-sm">{product.name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{product.sku}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-card text-foreground border border-border font-medium shadow-xs">
                        {product.category || 'General'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-foreground text-sm">
                      {formatCurrency(product.priceCents)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'font-mono font-bold text-sm px-2.5 py-0.5 rounded-md border',
                            isOutOfStock
                              ? 'bg-destructive/15 text-destructive border-destructive/30'
                              : isLowStock
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                          )}
                        >
                          {product.stockQuantity}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {isOutOfStock ? 'Sold Out' : isLowStock ? 'Low Stock' : 'In Stock'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={togglingId === product.id}
                          onClick={() => handleToggleStatus(product.id)}
                          className={cn(
                            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-xs disabled:opacity-50',
                            product.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                          )}
                          title={product.isActive ? 'Click to Archive (Soft Delete)' : 'Click to Activate'}
                        >
                          <span
                            className={cn(
                              'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                              product.isActive ? 'translate-x-4' : 'translate-x-0'
                            )}
                          />
                        </button>
                        <span
                          className={cn(
                            'text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                            product.isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-muted text-muted-foreground border-border'
                          )}
                        >
                          {product.isActive ? 'Active' : 'Archived'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      v{product.version}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStockDelta(product.id, -1)}
                          disabled={isAdjusting || product.stockQuantity <= 0}
                          title="Deduct 1"
                          className="px-2 py-1 rounded bg-card hover:bg-accent text-foreground text-xs font-mono border border-border disabled:opacity-40 shadow-xs"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleStockDelta(product.id, 1)}
                          disabled={isAdjusting}
                          title="Add 1"
                          className="px-2 py-1 rounded bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-xs font-mono font-semibold"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleStockDelta(product.id, 5)}
                          disabled={isAdjusting}
                          title="Add 5"
                          className="px-2 py-1 rounded bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-xs font-mono font-semibold"
                        >
                          +5
                        </button>
                        <button
                          onClick={() => handleStockDelta(product.id, 20)}
                          disabled={isAdjusting}
                          title="Restock 20"
                          className="px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-mono font-bold shadow-sm"
                        >
                          +20
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-all text-xs font-semibold shadow-xs"
                          title="Edit Product Details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            setDeletingProduct(product);
                            setDeleteError(null);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 transition-all text-xs font-semibold shadow-xs"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-border shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-border flex items-center justify-between bg-card/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-bold text-base text-foreground">Add New Product</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lavender Honey Latte"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    placeholder="BEV-LAV-01"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-mono text-foreground focus:outline-none focus:border-primary uppercase shadow-inner"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary shadow-inner"
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
                  <label className="text-xs font-medium text-foreground block mb-1">Price (USD $)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="5.75"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-mono text-foreground focus:outline-none focus:border-primary shadow-inner"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="15"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-mono text-foreground focus:outline-none focus:border-primary shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary shadow-inner"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-card hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-semibold border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-glow flex items-center gap-1.5"
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

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-border shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-border flex items-center justify-between bg-card/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-foreground">Edit Product Details</h3>
                  <p className="text-[10px] text-muted-foreground font-mono">ID: {editingProduct.id.substring(0, 8)}... (v{editingProduct.version})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditProduct} className="p-5 space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lavender Honey Latte"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    placeholder="BEV-LAV-01"
                    value={editFormData.sku}
                    onChange={(e) => setEditFormData({ ...editFormData, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-mono text-foreground focus:outline-none focus:border-primary uppercase shadow-inner"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Category</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary shadow-inner"
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
                  <label className="text-xs font-medium text-foreground block mb-1">Price (USD $)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="5.75"
                    value={editFormData.price}
                    onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-mono text-foreground focus:outline-none focus:border-primary shadow-inner"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="15"
                    value={editFormData.stockQuantity}
                    onChange={(e) => setEditFormData({ ...editFormData, stockQuantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-mono text-foreground focus:outline-none focus:border-primary shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={editFormData.imageUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary shadow-inner"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl bg-card hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-semibold border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-glow flex items-center gap-1.5"
                >
                  {isEditSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating...
                    </>
                  ) : (
                    'Update Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-destructive/30 shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-border flex items-center justify-between bg-destructive/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-destructive/20 text-destructive flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-bold text-base text-foreground">Delete Product</h3>
              </div>
              <button
                onClick={() => setDeletingProduct(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {deleteError ? (
                <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Cannot Delete Product</span>
                  </div>
                  <p className="text-destructive/90 pl-6 leading-relaxed">{deleteError}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete <strong className="text-foreground">{deletingProduct.name}</strong> (<span className="font-mono text-primary">{deletingProduct.sku}</span>)?
                  This action is permanent and will remove the item from the catalog.
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeletingProduct(null)}
                  className="px-4 py-2 rounded-xl bg-card hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-semibold border border-border"
                >
                  {deleteError ? 'Close' : 'Cancel'}
                </button>
                {!deleteError && (
                  <button
                    type="button"
                    onClick={handleDeleteProduct}
                    disabled={isDeleting}
                    className="px-5 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold shadow-sm flex items-center gap-1.5"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...
                      </>
                    ) : (
                      'Confirm Delete'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

