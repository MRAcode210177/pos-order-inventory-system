'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Layers, Database, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';

import { checkBackendHealth } from '@/lib/api';

export function Navbar() {
  const pathname = usePathname();
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await checkBackendHealth();
      setIsBackendHealthy(healthy);
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { href: '/', label: 'POS Terminal', icon: ShoppingBag },
    { href: '/orders', label: 'Order Lifecycle', icon: Layers },
    { href: '/inventory', label: 'Inventory Manager', icon: Database },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border glass-panel backdrop-blur-xl transition-colors duration-200">
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-emerald-700 p-0.5 shadow-glow flex items-center justify-center transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-background rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand-500 dark:text-brand-400 group-hover:rotate-12 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-lg text-foreground tracking-tight">
                Nexus<span className="text-brand-600 dark:text-brand-400">POS</span>
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium hidden sm:block">
              Concurrency-Safe Inventory & Order Engine
            </p>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 whitespace-nowrap',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/30 shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Health Status & Theme Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Backend Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border text-xs shadow-sm">
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
            <span className="font-medium text-foreground text-[11px] hidden lg:inline">
              {isBackendHealthy === true ? 'Backend Live' : isBackendHealthy === false ? 'API Offline' : 'Connecting...'}
            </span>
          </div>

          {/* Theme Toggle Button */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
