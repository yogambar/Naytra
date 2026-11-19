import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    // Base sizing with min 44px touch targets on md and lg
    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'h-9 px-3.5 text-xs font-semibold rounded-lg',
      md: 'h-11 min-h-[44px] px-5 text-sm font-semibold rounded-xl',
      lg: 'h-13 min-h-[52px] px-7 text-base font-bold rounded-2xl',
    };

    let variantClasses = '';
    let variantStyle: React.CSSProperties = {};

    const isDisabled = disabled || loading;

    switch (variant) {
      case 'primary':
        variantClasses = isDisabled
          ? 'bg-brand-marigold/50 text-white cursor-not-allowed opacity-60'
          : 'bg-brand-marigold text-brand-ink active:translate-y-[2px] cursor-pointer';
        variantStyle = isDisabled
          ? { boxShadow: 'none' }
          : { boxShadow: 'var(--shadow-keycap-primary)' };
        break;

      case 'secondary':
        variantClasses = isDisabled
          ? 'bg-surface-raised border border-surface-border text-text-tertiary cursor-not-allowed opacity-60'
          : 'bg-surface-raised border border-surface-border text-text-primary active:translate-y-[2px] cursor-pointer hover:border-brand-marigold/40';
        variantStyle = isDisabled
          ? { boxShadow: 'none' }
          : { boxShadow: 'var(--shadow-keycap-secondary)' };
        break;

      case 'ghost':
        variantClasses = isDisabled
          ? 'text-text-tertiary cursor-not-allowed opacity-60'
          : 'text-text-primary hover:bg-surface-inset active:translate-y-[1px] cursor-pointer';
        variantStyle = { boxShadow: 'none' };
        break;

      case 'danger':
        variantClasses = isDisabled
          ? 'bg-[#C43232]/50 text-white cursor-not-allowed opacity-60'
          : 'bg-[#C43232] text-white active:translate-y-[2px] cursor-pointer';
        variantStyle = isDisabled
          ? { boxShadow: 'none' }
          : { boxShadow: '0 3px 0 #8B1E1E, 0 4px 6px rgba(196, 50, 50, 0.3)' };
        break;
    }

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={`inline-flex flex-row flex-nowrap items-center justify-center gap-2 font-medium tracking-wide transition-all select-none focus-visible:outline-2 focus-visible:outline-brand-marigold focus-visible:outline-offset-2 ${sizeClasses[size]} ${variantClasses} ${className}`}
        style={{ ...variantStyle, ...style }}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {!loading && leftIcon && <span className="shrink-0 inline-flex items-center">{leftIcon}</span>}
        <span className="inline-flex items-center justify-center gap-2 flex-nowrap leading-none whitespace-nowrap">{children}</span>
        {!loading && rightIcon && <span className="shrink-0 inline-flex items-center">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
