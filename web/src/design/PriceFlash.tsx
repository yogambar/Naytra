import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface PriceFlashProps {
  value: number;
  change: number;
  changePct?: number;
  currencyPrefix?: string;
  className?: string;
}

export const PriceFlash: React.FC<PriceFlashProps> = ({
  value,
  change,
  changePct,
  currencyPrefix = '₹',
  className = '',
}) => {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (change > 0) {
      setFlash('up');
    } else if (change < 0) {
      setFlash('down');
    }

    const timer = setTimeout(() => {
      setFlash(null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [value, change]);

  const isUp = change > 0;
  const isDown = change < 0;

  const colorClass = isUp
    ? 'text-brand-up'
    : isDown
      ? 'text-brand-down'
      : 'text-text-secondary';

  const flashBg = flash === 'up'
    ? 'bg-brand-up-bg ring-2 ring-brand-up/30'
    : flash === 'down'
      ? 'bg-brand-down-bg ring-2 ring-brand-down/30'
      : 'bg-transparent';

  return (
    <div
      className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg transition-all duration-300 ${flashBg} ${className}`}
      aria-label={`Price: ${currencyPrefix}${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}, ${isUp ? 'Up' : isDown ? 'Down' : 'Unchanged'} ${Math.abs(change).toFixed(2)}`}
    >
      <span className="tabular-nums font-mono font-bold text-text-primary text-base">
        {currencyPrefix}
        {value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>

      <div className={`inline-flex items-center gap-1 text-xs font-semibold ${colorClass}`}>
        {isUp ? (
          <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        ) : isDown ? (
          <TrendingDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <Minus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        )}
        <span className="tabular-nums">
          {isUp ? '+' : isDown ? '-' : ''}
          {Math.abs(change).toFixed(2)}
          {changePct !== undefined ? ` (${Math.abs(changePct).toFixed(2)}%)` : ''}
        </span>
      </div>
    </div>
  );
};
