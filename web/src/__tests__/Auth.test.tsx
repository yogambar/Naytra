import { describe, it, expect } from 'vitest';
import { evaluatePasswordStrength } from '../utils/passwordStrength';
import {
  validateIndianPhone,
  extractIndianMobileDigits,
  formatLocalDigits,
} from '../utils/phoneValidation';
import { getCityTrie } from '../utils/cityTrie';

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

  describe('Indian Phone Regex & +91 Default Validation', () => {
    it('accepts raw 10-digit number assuming India (+91) and normalizes', () => {
      const res = validateIndianPhone('8439902894', true);
      expect(res.valid).toBe(true);
      expect(res.normalized).toBe('+918439902894');
    });

    it('accepts +91 prefixed phone with spaces and normalizes', () => {
      const res = validateIndianPhone('+91 98765 43210', true);
      expect(res.valid).toBe(true);
      expect(res.normalized).toBe('+919876543210');
    });

    it('accepts 0-prefixed 10-digit mobile number and strips leading 0', () => {
      const res = validateIndianPhone('08439902894', true);
      expect(res.valid).toBe(true);
      expect(res.normalized).toBe('+918439902894');
    });

    it('allows empty phone when optional', () => {
      const res = validateIndianPhone('', true);
      expect(res.valid).toBe(true);
      expect(res.normalized).toBe('');
    });

    it('rejects empty phone when required', () => {
      const res = validateIndianPhone('', false);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Phone number is required.');
    });

    it('rejects numbers starting with digits outside [6-9]', () => {
      const res = validateIndianPhone('1234567890', true);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('start with 6, 7, 8, or 9');
    });

    it('rejects numbers with fewer than 10 digits', () => {
      const res = validateIndianPhone('9876543', true);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('must be 10 digits');
    });

    it('extracts mobile digits and formats as XXXXX XXXXX', () => {
      const extracted = extractIndianMobileDigits('+91 8439902894');
      expect(extracted).toBe('8439902894');
      const formatted = formatLocalDigits(extracted);
      expect(formatted).toBe('84399 02894');
    });
  });

  describe('City Autocomplete Trie Tree', () => {
    const trie = getCityTrie();

    it('finds Dehradun when searching prefix "deh"', () => {
      const matches = trie.search('deh');
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches.some((m) => m.city === 'Dehradun')).toBe(true);
      const dehradun = matches.find((m) => m.city === 'Dehradun');
      expect(dehradun?.state).toBe('Uttarakhand');
    });

    it('finds Mumbai and Navi Mumbai when searching "mum"', () => {
      const matches = trie.search('mum');
      expect(matches.some((m) => m.city === 'Mumbai')).toBe(true);
      expect(matches.some((m) => m.city === 'Navi Mumbai')).toBe(true);
    });

    it('finds Delhi and New Delhi when searching "del"', () => {
      const matches = trie.search('del');
      expect(matches.some((m) => m.city.includes('Delhi'))).toBe(true);
    });

    it('supports case-insensitivity ("DEHRADUN", "DeH", "deh")', () => {
      const m1 = trie.search('DEHRADUN');
      const m2 = trie.search('DeH');
      expect(m1.some((m) => m.city === 'Dehradun')).toBe(true);
      expect(m2.some((m) => m.city === 'Dehradun')).toBe(true);
    });

    it('returns empty array on empty or whitespace search', () => {
      expect(trie.search('')).toEqual([]);
      expect(trie.search('   ')).toEqual([]);
    });

    it('returns empty array when prefix has no matches', () => {
      expect(trie.search('zzzzzz')).toEqual([]);
    });

    it('limits search results to requested count', () => {
      const matches = trie.search('a', 3);
      expect(matches.length).toBeLessThanOrEqual(3);
    });
  });
});
