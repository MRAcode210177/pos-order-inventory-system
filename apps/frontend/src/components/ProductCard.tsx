'use client';

import React from 'react';
import type { ProductDto } from '@pos/shared-types';
import { formatCurrency, cn } from '@/lib/utils';
import { Plus, Check, AlertCircle } from 'lucide-react';

interface ProductCardProps {
  product: ProductDto;
  cartQuantity: number;
  onAddToCart: (product: ProductDto) => void;
}

export function ProductCard({ product, cartQuantity, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stockQuantity === 0;
  const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;
  const isMaxInCart = cartQuantity >= product.stockQuantity;

  return (
    <div
      className={cn(
        'glass-card rounded-2xl overflow-hidden flex flex-col justify-between border relative group transition-all duration-200',
        isOutOfStock
          ? 'opacity-60 border-rose-500/20 bg-slate-900/40'
          : 'hover:border-brand-500/40'
      )}
    >
      {/* Product Image Area */}
      <div className="relative h-44 w-full bg-slate-800/80 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-500">
            <span className="font-mono text-sm font-semibold">{product.sku}</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-md text-slate-200 border border-white/10">
            {product.category || 'General'}
          </span>
        </div>

        {/* Stock Status Badge */}
        <div className="absolute top-3 right-3">
          {isOutOfStock ? (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-rose-500/90 text-white shadow-lg backdrop-blur-md">
              <AlertCircle className="w-3 h-3" /> Sold Out
            </span>
          ) : isLowStock ? (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-amber-500/90 text-slate-950 shadow-lg animate-pulse backdrop-blur-md">
              Only {product.stockQuantity} left!
            </span>
          ) : (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
              {product.stockQuantity} in stock
            </span>
          )}
        </div>

        {/* SKU tag at bottom left of image */}
        <div className="absolute bottom-2 left-3">
          <span className="text-[10px] font-mono font-medium text-slate-400 bg-black/40 px-1.5 py-0.5 rounded">
            {product.sku}
          </span>
        </div>
      </div>

      {/* Details & Actions */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-100 text-base leading-snug line-clamp-1 group-hover:text-brand-300 transition-colors">
            {product.name}
          </h3>
          <p className="font-heading font-bold text-xl text-brand-400 mt-1">
            {formatCurrency(product.priceCents)}
          </p>
        </div>

        <button
          onClick={() => onAddToCart(product)}
          disabled={isOutOfStock || isMaxInCart}
          className={cn(
            'w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 shadow-md',
            isOutOfStock
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
              : isMaxInCart
              ? 'bg-brand-900/40 text-brand-300 border border-brand-500/30 cursor-not-allowed'
              : 'bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-slate-950 hover:shadow-glow font-bold'
          )}
        >
          {isOutOfStock ? (
            'Out of Stock'
          ) : isMaxInCart ? (
            <>
              <Check className="w-4 h-4" /> Max in Cart ({cartQuantity})
            </>
          ) : cartQuantity > 0 ? (
            <>
              <Plus className="w-4 h-4" /> Add More ({cartQuantity} in cart)
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Add to Order
            </>
          )}
        </button>
      </div>
    </div>
  );
}
