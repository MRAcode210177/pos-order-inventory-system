'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { ProductDto, OrderDto, PaymentDto } from '@pos/shared-types';
import { fetchProducts, createOrder, cancelOrder } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { CartDrawer, type CartItem } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { CATEGORY_TREE, matchesCategoryFilter, getParentCategory } from '@/config/categories';
import { Search, RefreshCw, AlertTriangle, Filter, ChevronDown, X } from 'lucide-react';

export default function POSTerminalPage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
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

  // Filtered products using helper
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = matchesCategoryFilter(p.category, selectedCategory);
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
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
      {/* Main Responsive Layout: Dynamic Catalog + Expanded Sticky Cart */}
      <div className="flex flex-col xl:flex-row gap-6 items-start w-full">
        {/* Product Catalog Section: Fluid and expanding */}
        <div className="flex-1 w-full min-w-0 space-y-4">
          {/* Search & Category Filter Bar */}
          <div className="glass-panel rounded-2xl p-4 border border-border space-y-3 shadow-sm relative z-30 overflow-visible">
            {/* Search Input & Sync Action */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search products by name or SKU (e.g. Nitro, BEV-LAT)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 rounded-xl bg-background border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
                />
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
              </div>
              <button
                type="button"
                onClick={loadProducts}
                disabled={isLoadingProducts}
                title="Sync Live Stock"
                aria-label="Sync Live Stock"
                className="p-2.5 rounded-xl bg-card hover:bg-accent text-muted-foreground hover:text-foreground border border-border transition-all shadow-sm shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingProducts ? 'animate-spin text-primary' : ''}`} />
              </button>
            </div>

            {/* Backdrop overlay for closing dropdown on outside click */}
            {activeDropdown && (
              <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setActiveDropdown(null)}
              />
            )}

            {/* Hierarchical 2-Tier Category Bar */}
            <div className="flex flex-wrap items-center gap-2 relative z-50 overflow-visible">
              <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 mr-1 font-medium">
                <Filter className="w-3.5 h-3.5 text-primary" /> Category:
              </span>

              {/* All Products Tab */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setActiveDropdown(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === 'All'
                    ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                    : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border'
                }`}
              >
                All
              </button>

              {/* Main Categories with Subcategory Dropdowns */}
              {CATEGORY_TREE.map((group) => {
                const parentOfSelected = getParentCategory(selectedCategory);
                const isGroupActive =
                  selectedCategory.toLowerCase() === group.name.toLowerCase() ||
                  parentOfSelected?.toLowerCase() === group.name.toLowerCase() ||
                  group.subcategories.some((s) => s.toLowerCase() === selectedCategory.toLowerCase());

                const isOpen = activeDropdown === group.id;

                return (
                  <div key={group.id} className={`relative inline-block ${isOpen ? 'z-50' : 'z-10'}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdown(isOpen ? null : group.id);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        isGroupActive
                          ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                          : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent border border-border'
                      }`}
                    >
                      <span>{group.name}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Interactive Subcategories Dropdown Floating Overlay */}
                    {isOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-56 rounded-xl bg-card border border-border shadow-2xl z-50 p-1.5 animate-scaleUp">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory(group.name);
                            setActiveDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                            selectedCategory.toLowerCase() === group.name.toLowerCase()
                              ? 'bg-primary/15 text-primary font-bold'
                              : 'text-foreground hover:bg-accent'
                          }`}
                        >
                          <span>All {group.name}</span>
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                            Group
                          </span>
                        </button>
                        <div className="my-1 border-t border-border/60" />
                        {group.subcategories.map((sub) => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(sub);
                              setActiveDropdown(null);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              selectedCategory.toLowerCase() === sub.toLowerCase()
                                ? 'bg-primary/15 text-primary font-bold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Active Filter Indicator Badge */}
            {selectedCategory !== 'All' && (
              <div className="flex items-center gap-2 pt-1 border-t border-border/40 text-xs">
                <span className="text-muted-foreground">Active Filter:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/25 text-primary font-semibold">
                  {getParentCategory(selectedCategory) &&
                    getParentCategory(selectedCategory) !== selectedCategory && (
                    <span className="text-muted-foreground text-[10px]">
                      {getParentCategory(selectedCategory)} &gt;
                    </span>
                  )}
                  <span>{selectedCategory}</span>
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className="hover:bg-primary/20 rounded p-0.5 transition-colors text-primary ml-1"
                    title="Clear category filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </div>
            )}
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
