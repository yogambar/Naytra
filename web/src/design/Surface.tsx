import React from 'react';

export type ElevationLevel = 'e0' | 'e1' | 'e2' | 'e3' | 'e4' | 'e5';
export type SurfaceVariant = 'base' | 'raised' | 'inset' | 'glass' | 'hero';

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: ElevationLevel;
  variant?: SurfaceVariant;
  interactive?: boolean;
  children?: React.ReactNode;
}

const elevationShadows: Record<ElevationLevel, string> = {
  e0: 'var(--shadow-e0)',
  e1: 'var(--shadow-e1)',
  e2: 'var(--shadow-e2)',
  e3: 'var(--shadow-e3)',
  e4: 'var(--shadow-e4)',
  e5: 'var(--shadow-e5)',
};

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ elevation = 'e1', variant = 'raised', interactive = false, className = '', style, children, ...props }, ref) => {
    let variantClasses = '';
    let variantStyle: React.CSSProperties = {};

    switch (variant) {
      case 'base':
        variantClasses = 'bg-surface-base text-text-primary border border-surface-border-subtle';
        break;
      case 'raised':
        variantClasses = 'bg-surface-raised text-text-primary border border-surface-border';
        variantStyle = { boxShadow: elevationShadows[elevation] };
        break;
      case 'inset':
        variantClasses = 'bg-surface-inset text-text-primary border border-surface-border-subtle';
        variantStyle = { boxShadow: 'var(--shadow-inset)' };
        break;
      case 'glass':
        variantClasses = 'bg-surface-glass backdrop-blur-md text-text-primary border border-surface-border';
        variantStyle = {
          boxShadow: elevationShadows[elevation],
          WebkitBackdropFilter: 'blur(12px)',
        };
        break;
      case 'hero':
        variantClasses = 'bg-gradient-to-br from-surface-raised to-surface-inset text-text-primary border border-surface-border';
        variantStyle = { boxShadow: elevationShadows[elevation] };
        break;
    }

    return (
      <div
        ref={ref}
        className={`rounded-xl transition-all duration-200 ${variantClasses} ${interactive ? 'cursor-pointer hover:border-brand-marigold/40' : ''} ${className}`}
        style={{ ...variantStyle, ...style }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Surface.displayName = 'Surface';
