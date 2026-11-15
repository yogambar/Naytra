import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Surface } from './Surface';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps {
  id: string;
  variant?: ToastVariant;
  title: string;
  message?: string;
  durationMs?: number;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  variant = 'info',
  title,
  message,
  durationMs = 4000,
  onDismiss,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (durationMs <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        onDismiss(id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [id, durationMs, onDismiss]);

  const icons = {
    info: <Info className="w-5 h-5 text-brand-marigold shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-brand-up shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-brand-marigold shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-brand-down shrink-0" />,
  };

  return (
    <Surface
      elevation="e4"
      variant="raised"
      role={variant === 'error' ? 'alert' : 'status'}
      className="relative overflow-hidden w-full max-w-sm p-4 rounded-xl border border-surface-border flex items-start gap-3 select-none"
    >
      {icons[variant]}
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-xs font-bold text-text-primary">{title}</h4>
        {message && <p className="text-xs text-text-secondary mt-0.5">{message}</p>}
      </div>
      <button
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className="text-text-tertiary hover:text-text-primary p-0.5 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {durationMs > 0 && (
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-brand-marigold/60 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      )}
    </Surface>
  );
};
