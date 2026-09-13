'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Layers, Database, Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/health');
        const json = await res.json();
        setIsBackendHealthy(json.ok === true);
      } catch {
        setIsBackendHealthy(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { href: '/', label: 'POS Terminal', icon: ShoppingBag },
    { href: '/orders', label: 'Order Lifecycle', icon: Layers },
    { href: '/inventory', label: 'Inventory Manager', icon: Database },
    { href: '/stress-test', label: 'Concurrency Race Visualizer', icon: Zap, highlight: true },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 glass-panel backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-emerald-700 p-0.5 shadow-glow flex items-center justify-center transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand-400 group-hover:rotate-12 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-lg text-white tracking-tight">
                NEXUS<span className="text-brand-400">POS</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                TypeScript Monorepo
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Concurrency-Safe Inventory & Order Engine
            </p>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-glow'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent',
                  item.highlight && !isActive && 'text-amber-300/90 hover:text-amber-200 hover:bg-amber-500/10'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-brand-400' : 'text-slate-400')} />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Backend Status Indicator */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 text-xs">
          <div className="relative flex h-2.5 w-2.5">
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                isBackendHealthy === true ? 'bg-emerald-400' : isBackendHealthy === false ? 'bg-rose-400' : 'bg-amber-400'
              )}
            />
            <span
              className={cn(
                'relative inline-flex rounded-full h-2.5 w-2.5',
                isBackendHealthy === true ? 'bg-emerald-500' : isBackendHealthy === false ? 'bg-rose-500' : 'bg-amber-500'
              )}
            />
          </div>
          <span className="font-medium text-slate-300 hidden sm:inline">
            {isBackendHealthy === true ? 'Backend Live' : isBackendHealthy === false ? 'API Offline' : 'Connecting...'}
          </span>
        </div>
      </div>
    </header>
  );
}
