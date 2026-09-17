'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Layers, Database, Sparkles, Bell } from 'lucide-react';
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
    { href: '/', label: 'Products', icon: ShoppingBag },
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
                MRA<span className="text-brand-600 dark:text-brand-400">Store</span>
              </span>
            </div>
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

        {/* Right Actions: Health Status, Cashier Badge & Theme Toggle */}
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
              {isBackendHealthy === true ? 'Live' : isBackendHealthy === false ? 'Offline' : 'Connecting...'}
            </span>
          </div>

          {/* Vertical Divider */}
          <div className="h-6 w-px bg-border/60 mx-0.5 hidden sm:block" />

          {/* Cashier User Profile Badge (UI Display) */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
              <span>MRA</span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full border border-background absolute -bottom-0.5 -right-0.5" />
            </div>
            <div className="hidden sm:flex flex-col text-left leading-none">
              <span className="text-xs font-bold text-foreground">MRA</span>
              <span className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 mt-0.5">Cashier Lead</span>
            </div>
            <button
              type="button"
              aria-label="Notifications"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-0.5"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Theme Toggle Button */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
