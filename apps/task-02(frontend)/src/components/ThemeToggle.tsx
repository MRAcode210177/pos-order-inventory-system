'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          'w-9 h-9 rounded-xl border border-border bg-card/50 flex items-center justify-center text-muted-foreground',
          className
        )}
      >
        <Sun className="w-4 h-4 opacity-40" />
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
      className={cn(
        'relative w-9 h-9 rounded-xl border border-border bg-card/70 hover:bg-accent hover:text-accent-foreground flex items-center justify-center text-foreground transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary',
        className
      )}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform duration-300" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 hover:-rotate-12 transition-transform duration-300" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
