import React, { useEffect, useState } from 'react';
import { useMotionPrefs } from '../hooks/useMotionPrefs';

export interface NumberTickerProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  durationMs?: number;
  className?: string;
}

export const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  durationMs = 1200,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const { prefersReducedMotion } = useMotionPrefs();

  useEffect(() => {
    if (prefersReducedMotion || durationMs <= 0) {
      setDisplayValue(value);
      return;
    }

    const startValue = displayValue;
    const diff = value - startValue;
    const startTime = performance.now();

    let animationFrameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Ease out expo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startValue + diff * ease;

      if (progress < 1) {
        setDisplayValue(current);
        animationFrameId = requestAnimationFrame(tick);
      } else {
        // MUST land exactly on the target value
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, durationMs, prefersReducedMotion]);

  const formatted = displayValue.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span
      className={`tabular-nums font-mono font-semibold tracking-tight inline-block ${className}`}
      aria-label={`${prefix}${value.toLocaleString('en-IN', { minimumFractionDigits: decimals })}${suffix}`}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
