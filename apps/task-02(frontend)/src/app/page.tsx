'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { ProductDto, OrderDto, PaymentDto } from '@pos/shared-types';
import { fetchProducts, createOrder, cancelOrder } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { CartDrawer, type CartItem } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { Search, RefreshCw, AlertTriangle, Filter } from 'lucide-react';

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
    <div className="w-full space-y-6">
      {/* Top Banner / Hero */}
      <div className="glass-card rounded-2xl p-5 border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-2xl text-foreground tracking-tight">
              Cashier Terminal
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Live DB Stock
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select items to build an order. Stock is locked via PostgreSQL transactions upon reservation.
          </p>
        </div>

        <button
          onClick={loadProducts}
          disabled={isLoadingProducts}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card hover:bg-accent text-muted-foreground hover:text-foreground border border-border text-xs font-semibold transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProducts ? 'animate-spin text-primary' : ''}`} />
          <span>Sync Stock</span>
        </button>
      </div>

      {/* Main Responsive Layout: Dynamic Catalog + Expanded Sticky Cart */}
      <div className="flex flex-col xl:flex-row gap-6 items-start w-full">
        {/* Product Catalog Section: Fluid and expanding */}
        <div className="flex-1 w-full min-w-0 space-y-4">
          {/* Search & Category Filter Bar */}
          <div className="glass-panel rounded-2xl p-4 border border-border space-y-3 shadow-sm">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search products by name or SKU (e.g. Nitro, BEV-LAT)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 rounded-xl bg-background border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
              />
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 mr-1 font-medium">
                <Filter className="w-3.5 h-3.5" /> Category:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                      : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Responsive Product Grid (1-2 mobile, 3 tablet, 4 laptop, 5-6 ultrawide) */}
          {isLoadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-6 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="glass-card rounded-2xl h-72 animate-pulse bg-muted/50 border border-border"
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-border space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground">No products found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No items match your filter criteria. Try adjusting your search query or category filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-6 gap-4">
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

        {/* Sticky POS Cart Panel: Wider, dedicated width on desktop/ultrawide */}
        <div className="w-full xl:w-[400px] 2xl:w-[440px] 3xl:w-[480px] shrink-0 sticky top-20">
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
