'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { ProductDto, OrderDto, PaymentDto } from '@pos/shared-types';
import { fetchProducts, createOrder, cancelOrder } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { CartDrawer, type CartItem } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { Search, RefreshCw, AlertTriangle, Sparkles, Filter } from 'lucide-react';

export default function POSTerminalPage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [isReservingOrder, setIsReservingOrder] = useState<boolean>(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [activeReservedOrder, setActiveReservedOrder] = useState<OrderDto | null>(null);

  // Load products from backend
  const loadProducts = async () => {
    setIsLoadingProducts(true);
    const result = await fetchProducts();
    if (result.ok) {
      setProducts(result.data);
    }
    setIsLoadingProducts(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Compute categories
  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'All' || p.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart operations
  const handleAddToCart = (product: ProductDto) => {
    setReservationError(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    setReservationError(null);
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const clampedQty = Math.min(quantity, item.product.stockQuantity);
          return { ...item, quantity: clampedQty };
        }
        return item;
      })
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setReservationError(null);
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setReservationError(null);
    setCart([]);
  };

  // Place order & reserve stock
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsReservingOrder(true);
    setReservationError(null);

    const payload = {
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    };

    const result = await createOrder(payload);
    setIsReservingOrder(false);

    if (result.ok) {
      setActiveReservedOrder(result.data);
      // Refresh products to reflect decremented stock in real-time
      loadProducts();
    } else {
      setReservationError(result.error.message || 'Failed to reserve stock. Please try again.');
      // Refresh products in case stock changed externally
      loadProducts();
    }
  };

  // Cancel reservation
  const handleCancelReservation = async (orderId: string) => {
    await cancelOrder(orderId);
    setActiveReservedOrder(null);
    loadProducts();
  };

  // On successful payment
  const handlePaymentSuccess = (_order: OrderDto, _payment: PaymentDto) => {
    setCart([]);
    loadProducts();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="glass-card rounded-2xl p-5 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-2xl text-white tracking-tight">
              Cashier Terminal
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Live DB Stock
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            Select items to build an order. Stock is locked via PostgreSQL transactions upon reservation.
          </p>
        </div>

        <button
          onClick={loadProducts}
          disabled={isLoadingProducts}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProducts ? 'animate-spin text-brand-400' : ''}`} />
          <span>Sync Stock</span>
        </button>
      </div>

      {/* Main Grid: Catalog (Left) + Cart Drawer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Product Catalog Section (8 Columns) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search & Category Filter Bar */}
          <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search products by name or SKU (e.g. Nitro, BEV-LAT)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 rounded-xl bg-slate-900/90 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0 mr-1">
                <Filter className="w-3.5 h-3.5" /> Category:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-brand-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900/60 text-slate-300 hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          {isLoadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="glass-card rounded-2xl h-72 animate-pulse bg-slate-800/40 border border-white/5"
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-white/10 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-200">No products found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No items match your filter criteria. Try adjusting your search query or category filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const inCart = cart.find((c) => c.product.id === product.id)?.quantity || 0;
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    cartQuantity={inCart}
                    onAddToCart={handleAddToCart}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky POS Cart Sidebar (4 Columns) */}
        <div className="lg:col-span-4 sticky top-20">
          <CartDrawer
            items={cart}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveFromCart}
            onClearCart={handleClearCart}
            onCheckout={handleCheckout}
            isLoading={isReservingOrder}
            errorMessage={reservationError}
          />
        </div>
      </div>

      {/* Checkout Modal */}
      {activeReservedOrder && (
        <CheckoutModal
          order={activeReservedOrder}
          onClose={() => setActiveReservedOrder(null)}
          onSuccess={handlePaymentSuccess}
          onCancelReservation={handleCancelReservation}
        />
      )}
    </div>
  );
}
