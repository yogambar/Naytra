/**
 * Compact Indian-style currency formatter (Groww convention: K, L, Cr).
 * Used for tight UI badges such as the sidebar wallet balance pill.
 *
 * Examples:
 *   999             → ₹999
 *   1_200           → ₹1.2K
 *   53_000          → ₹53K
 *   1_50_000        → ₹1.5L
 *   12_00_000       → ₹12L
 *   1_00_00_000     → ₹1Cr
 *   99_90_32_81_549 → ₹9,990Cr
 */
export function formatCompactINR(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs < 1_000) {
    return `${sign}₹${abs.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
  if (abs < 1_00_000) {
    return `${sign}₹${stripTrailingZero(abs / 1_000)}K`;
  }
  if (abs < 1_00_00_000) {
    return `${sign}₹${stripTrailingZero(abs / 1_00_000)}L`;
  }

  const cr = abs / 1_00_00_000;
  if (cr >= 1_00_000) {
    // 1,00,000 Cr+ (1L Cr) — keep badge super compact
    return `${sign}₹${stripTrailingZero(cr / 1_00_000)}L Cr`;
  }
  if (cr >= 100) {
    // Round >= 100 Cr cleanly without decimals so sidebar pills stay crisp
    return `${sign}₹${Math.round(cr).toLocaleString('en-IN')}Cr`;
  }
  return `${sign}₹${stripTrailingZero(cr)}Cr`;
}

/** Formats to 2 decimal places and drops unnecessary trailing zeroes */
function stripTrailingZero(n: number): string {
  return parseFloat(n.toFixed(2)).toString();
}
