import React from 'react';

export type BadgeVariant = 'replay' | 'demo' | 'live' | 'success' | 'error' | 'warning' | 'default';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  pulse?: boolean;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  pulse = false,
  children,
  className = '',
  ...props
}) => {
  let variantClasses = '';

  switch (variant) {
    case 'replay':
      variantClasses = 'bg-brand-ink text-brand-marigold border border-brand-marigold/30';
      break;
    case 'demo':
      variantClasses = 'bg-surface-inset text-brand-marigold-text border border-brand-marigold/40';
      break;
    case 'live':
      variantClasses = 'bg-brand-up-bg text-brand-up border border-brand-up/40 font-bold';
      break;
    case 'success':
      variantClasses = 'bg-brand-up-bg text-brand-up border border-brand-up/30';
      break;
    case 'error':
      variantClasses = 'bg-brand-down-bg text-brand-down border border-brand-down/30';
      break;
    case 'warning':
      variantClasses = 'bg-brand-marigold-bg text-brand-marigold-text border border-brand-marigold/40';
      break;
    case 'default':
    default:
      variantClasses = 'bg-surface-inset text-text-secondary border border-surface-border';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase select-none ${variantClasses} ${className}`}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              variant === 'live' || variant === 'success'
                ? 'bg-brand-up'
                : variant === 'error'
                  ? 'bg-brand-down'
                  : 'bg-brand-marigold'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              variant === 'live' || variant === 'success'
                ? 'bg-brand-up'
                : variant === 'error'
                  ? 'bg-brand-down'
                  : 'bg-brand-marigold'
            }`}
          />
        </span>
      )}
      {children}
    </span>
  );
};

export const DataModeBadge: React.FC<{ mode?: string; className?: string }> = ({
  mode = 'REPLAY',
  className = '',
}) => {
  const normalized = mode.toUpperCase();
  const isLive = normalized === 'LIVE';
  const isDemo = normalized === 'DEMO';

  return (
    <Badge
      variant={isLive ? 'live' : isDemo ? 'demo' : 'replay'}
      pulse={isLive}
      className={className}
      aria-label={`Current data mode: ${normalized}`}
    >
      {isLive ? 'LIVE' : isDemo ? 'DEMO DATA' : 'REPLAY DATA'}
    </Badge>
  );
};
