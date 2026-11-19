/**
 * Phone Number Validation & Formatting Utility
 * Standard: Indian Telecom Regulatory Authority (TRAI) E.164 mobile allocation.
 *
 * Rule:
 * - Country code: +91 by default (assuming India).
 * - Indian mobile numbers are strictly 10 digits starting with 6, 7, 8, or 9.
 */

export const INDIAN_MOBILE_REGEX = /^[6789]\d{9}$/;
export const INDIAN_PHONE_FULL_REGEX = /^(?:\+91[\s\-]?)?[6789]\d{9}$/;

/**
 * Extracts the 10-digit mobile number from input, stripping country code (+91 / 91)
 * or trunk prefix (0) if provided by the user.
 */
export function extractIndianMobileDigits(raw: string): string {
  if (!raw) return '';
  // Remove non-digit characters except a leading +
  let cleaned = raw.trim().replace(/[^\d+]/g, '');

  // Strip leading +91
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length > 10) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length > 10) {
    cleaned = cleaned.slice(1);
  }

  // Remove any remaining non-digits
  cleaned = cleaned.replace(/\D/g, '');

  // Limit to 10 digits
  return cleaned.slice(0, 10);
}

/**
 * Formats a 10-digit number as "XXXXX XXXXX" for readable display.
 */
export function formatLocalDigits(digits: string): string {
  if (!digits) return '';
  if (digits.length <= 5) {
    return digits;
  }
  return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
}

export interface PhoneValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Validates a phone string.
 * @param phone The raw or formatted phone input.
 * @param optional If true, empty input is considered valid.
 */
export function validateIndianPhone(phone: string, optional = true): PhoneValidationResult {
  const trimmed = phone.trim();
  if (!trimmed) {
    if (optional) {
      return { valid: true, normalized: '' };
    }
    return { valid: false, error: 'Phone number is required.' };
  }

  const digits = extractIndianMobileDigits(trimmed);

  if (digits.length < 10) {
    return {
      valid: false,
      error: `Phone number must be 10 digits (${digits.length}/10 entered).`,
    };
  }

  if (!/^[6789]/.test(digits)) {
    return {
      valid: false,
      error: 'Indian mobile numbers must start with 6, 7, 8, or 9.',
    };
  }

  if (!INDIAN_MOBILE_REGEX.test(digits)) {
    return {
      valid: false,
      error: 'Please enter a valid 10-digit Indian mobile number.',
    };
  }

  return {
    valid: true,
    normalized: `+91${digits}`,
  };
}
