import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate } from '../formatters';

// Same NBSP caveat as the backend's formatCurrency tests -- 'en-ZA' ZAR
// formatting uses U+00A0, not a regular space, between "R" and the number.
const NBSP = ' ';

describe('formatCurrency', () => {
  it('formats a positive number as ZAR', () => {
    expect(formatCurrency(1234.5)).toBe(`R${NBSP}1${NBSP}234,50`);
  });

  it('defaults to zero for a falsy amount instead of throwing', () => {
    expect(formatCurrency(0)).toBe(`R${NBSP}0,00`);
    expect(formatCurrency(null)).toBe(`R${NBSP}0,00`);
    expect(formatCurrency(undefined)).toBe(`R${NBSP}0,00`);
  });
});

describe('formatDate', () => {
  it('returns an em dash placeholder for a falsy value', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('formats a real ISO date -- checking the date portion only, since the time-of-day rendered depends on the machine\'s local timezone', () => {
    const result = formatDate('2026-03-05T14:30:00Z');
    expect(result).toContain('Mar 5, 2026');
  });
});
