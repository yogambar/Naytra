import { describe, it, expect } from 'vitest';
import { formatCompactINR } from '../utils/formatCompactINR';

describe('formatCompactINR (Groww Indian compact suffixes)', () => {
  it('formats values under 1,000 in plain INR', () => {
    expect(formatCompactINR(0)).toBe('₹0');
    expect(formatCompactINR(85)).toBe('₹85');
    expect(formatCompactINR(999.5)).toBe('₹999.5');
  });

  it('formats thousands with K suffix', () => {
    expect(formatCompactINR(1_000)).toBe('₹1K');
    expect(formatCompactINR(1_200)).toBe('₹1.2K');
    expect(formatCompactINR(53_000)).toBe('₹53K');
  });

  it('formats lakhs with L suffix', () => {
    expect(formatCompactINR(1_00_000)).toBe('₹1L');
    expect(formatCompactINR(1_50_000)).toBe('₹1.5L');
    expect(formatCompactINR(12_00_000)).toBe('₹12L');
  });

  it('formats crores with Cr suffix cleanly for badges', () => {
    expect(formatCompactINR(1_00_00_000)).toBe('₹1Cr');
    expect(formatCompactINR(11_72_00_000)).toBe('₹11.72Cr');
    expect(formatCompactINR(99_90_32_81_549)).toBe('₹9,990Cr');
  });

  it('handles negative values', () => {
    expect(formatCompactINR(-3_12_000)).toBe('-₹3.12L');
  });
});
