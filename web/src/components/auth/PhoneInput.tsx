import React, { useId, useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import {
  extractIndianMobileDigits,
  formatLocalDigits,
  validateIndianPhone,
} from '../../utils/phoneValidation';

export interface PhoneInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (normalizedValue: string) => void;
  error?: string | null;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  id: customId,
  label = 'Phone (Optional)',
  value,
  onChange,
  error: externalError,
  helperText,
  disabled = false,
  required = false,
  className = '',
}) => {
  const generatedId = useId();
  const inputId = customId || generatedId;

  // Extract initial 10 digits from incoming prop value
  const [digits, setDigits] = useState(() => extractIndianMobileDigits(value));
  const [touched, setTouched] = useState(false);

  // Sync internal state if prop changes externally
  useEffect(() => {
    const extDigits = extractIndianMobileDigits(value);
    if (extDigits !== digits) {
      setDigits(extDigits);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const extracted = extractIndianMobileDigits(raw);
    setDigits(extracted);
    setTouched(true);

    if (!extracted) {
      onChange('');
    } else {
      onChange(`+91${extracted}`);
    }
  };

  const handleClear = () => {
    setDigits('');
    setTouched(true);
    onChange('');
  };

  // Internal validation for real-time feedback
  const validation = validateIndianPhone(digits ? `+91${digits}` : '', !required);
  const showError = Boolean(externalError || (touched && digits.length > 0 && !validation.valid));
  const errorMessage = externalError || (!validation.valid ? validation.error : null);
  const isValidComplete = digits.length === 10 && validation.valid;

  return (
    <div className={`w-full flex flex-col gap-1.5 text-left ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-text-secondary tracking-wide select-none"
          >
            {label} {required && <span className="text-brand-down">*</span>}
          </label>
          {digits.length > 0 && (
            <span
              className={`text-[11px] font-mono ${
                isValidComplete ? 'text-brand-up' : digits.length < 10 ? 'text-text-tertiary' : 'text-brand-down'
              }`}
            >
              {digits.length}/10
            </span>
          )}
        </div>
      )}

      <div
        className={`relative flex items-center w-full rounded-xl transition-all duration-200 border bg-surface-inset text-text-primary ${
          showError
            ? 'border-brand-down ring-1 ring-brand-down/40'
            : isValidComplete
            ? 'border-brand-up/60 focus-within:border-brand-up focus-within:ring-2 focus-within:ring-brand-up/30'
            : 'border-surface-border-subtle focus-within:border-brand-marigold focus-within:ring-2 focus-within:ring-brand-marigold/30 focus-within:bg-surface-raised'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ boxShadow: 'var(--shadow-inset)' }}
      >
        {/* Country Code Prefix Badge */}
        <div
          className="flex items-center gap-1.5 pl-3 pr-2 py-2 text-xs font-semibold text-text-secondary select-none border-r border-surface-border/60 shrink-0"
          title="Default Country Code: India (+91)"
        >
          <span className="text-sm leading-none" role="img" aria-label="India Flag">
            🇮🇳
          </span>
          <span className="font-mono text-text-primary font-bold">+91</span>
        </div>

        {/* 10-Digit Mobile Input */}
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          disabled={disabled}
          placeholder="98765 43210"
          value={formatLocalDigits(digits)}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          className="w-full h-11 min-h-[44px] px-3 bg-transparent text-sm placeholder:text-text-tertiary outline-none font-mono disabled:cursor-not-allowed"
          aria-label="10-digit mobile number"
          aria-invalid={showError}
        />

        {/* Clear and Status Action Icons */}
        <div className="flex items-center gap-1 pr-3 shrink-0">
          {digits.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-text-tertiary hover:text-text-primary hover:bg-surface-border/30 transition-colors"
              aria-label="Clear phone number"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {isValidComplete && (
            <CheckCircle2 className="w-4 h-4 text-brand-up shrink-0 animate-in fade-in" />
          )}

          {showError && (
            <AlertCircle className="w-4 h-4 text-brand-down shrink-0 animate-in fade-in" />
          )}
        </div>
      </div>

      {showError && errorMessage ? (
        <p role="alert" className="text-xs text-brand-down font-medium flex items-center gap-1">
          {errorMessage}
        </p>
      ) : helperText ? (
        <p className="text-xs text-text-tertiary">{helperText}</p>
      ) : null}
    </div>
  );
};
