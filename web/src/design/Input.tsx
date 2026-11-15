import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, leftIcon, rightIcon, className = '', id: customId, disabled, ...props }, ref) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={id} className="text-xs font-semibold text-text-secondary tracking-wide select-none">
            {label}
          </label>
        )}

        <div
          className={`relative flex items-center w-full rounded-xl transition-all duration-200 border bg-surface-inset text-text-primary ${
            error
              ? 'border-brand-down ring-1 ring-brand-down/40'
              : 'border-surface-border-subtle focus-within:border-brand-marigold focus-within:ring-2 focus-within:ring-brand-marigold/30 focus-within:bg-surface-raised'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ boxShadow: 'var(--shadow-inset)' }}
        >
          {leftIcon && <div className="pl-3.5 pr-1 text-text-tertiary select-none">{leftIcon}</div>}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full h-11 min-h-[44px] px-3.5 bg-transparent text-sm placeholder:text-text-tertiary outline-none disabled:cursor-not-allowed ${className}`}
            {...props}
          />

          {rightIcon && <div className="pr-3.5 pl-1 text-text-tertiary select-none">{rightIcon}</div>}
        </div>

        {error ? (
          <p id={errorId} role="alert" className="text-xs text-brand-down font-medium flex items-center gap-1">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-text-tertiary">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
