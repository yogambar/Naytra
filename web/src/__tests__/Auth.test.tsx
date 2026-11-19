import { describe, it, expect } from 'vitest';
import { evaluatePasswordStrength } from '../utils/passwordStrength';

describe('Authentication Utilities & Validation', () => {
  describe('evaluatePasswordStrength', () => {
    it('flags passwords under 10 characters as Too Short', () => {
      const res = evaluatePasswordStrength('Short1!');
      expect(res.score).toBe(0);
      expect(res.label).toBe('Too Short');
      expect(res.hasMinLength).toBe(false);
    });

    it('evaluates 10-character basic password as Weak or Fair', () => {
      const res = evaluatePasswordStrength('password12');
      expect(res.hasMinLength).toBe(true);
      expect(res.score).toBeGreaterThanOrEqual(1);
    });

    it('evaluates complex password with upper, lower, number, and symbol as Strong', () => {
      const res = evaluatePasswordStrength('Naytra$Sensex2026!Pro');
      expect(res.hasMinLength).toBe(true);
      expect(res.hasUpper).toBe(true);
      expect(res.hasLower).toBe(true);
      expect(res.hasNumber).toBe(true);
      expect(res.hasSpecial).toBe(true);
      expect(res.score).toBe(4);
      expect(res.label).toBe('Strong');
      expect(res.color).toBe('#0B7A5A');
    });
  });

  describe('18+ Age Validation Logic', () => {
    function calculateAge(dobStr: string): number {
      const birth = new Date(dobStr);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    }

    it('approves an adult born in 1995 (31 years old in 2026)', () => {
      const age = calculateAge('1995-05-15');
      expect(age).toBeGreaterThanOrEqual(18);
    });

    it('rejects a minor born in 2015 (11 years old in 2026)', () => {
      const age = calculateAge('2015-01-01');
      expect(age).toBeLessThan(18);
    });
  });
});
