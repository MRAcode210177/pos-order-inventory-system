'use client';

import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownBadgeProps {
  expiresAt: string | null;
  onExpire?: () => void;
  className?: string;
}

export function CountdownBadge({ expiresAt, onExpire, className }: CountdownBadgeProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setSecondsRemaining(null);
      return;
    }

    const calculateTime = () => {
      const diffMs = new Date(expiresAt).getTime() - Date.now();
      const remainingSec = Math.max(0, Math.floor(diffMs / 1000));
      setSecondsRemaining(remainingSec);

      if (remainingSec === 0 && onExpire) {
        onExpire();
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (secondsRemaining === null) return null;

  const isExpired = secondsRemaining === 0;
  const isCritical = secondsRemaining > 0 && secondsRemaining < 60;
  const isWarning = secondsRemaining >= 60 && secondsRemaining < 180;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wider font-mono border transition-colors',
        isExpired && 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        isCritical && 'bg-rose-500/15 text-rose-300 border-rose-500/40 animate-pulse',
        isWarning && 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        !isExpired && !isCritical && !isWarning && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        className
      )}
    >
      {isCritical ? (
        <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
      ) : (
        <Clock className="w-3.5 h-3.5" />
      )}
      <span>{isExpired ? 'EXPIRED' : `HELD: ${formattedTime}`}</span>
    </div>
  );
}
