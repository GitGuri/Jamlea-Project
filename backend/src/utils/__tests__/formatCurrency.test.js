const { formatCurrency } = require('../formatCurrency');

// Intl's 'en-ZA' ZAR formatting uses U+00A0 (no-break space) after the "R"
// symbol and as the thousands separator, not a regular space -- easy to
// miss since terminals render both identically. Built via an escape rather
// than a literal character in this file for the same reason.
const NBSP = ' ';

describe('formatCurrency', () => {
  it('formats a positive number as ZAR', () => {
    expect(formatCurrency(1234.5)).toBe(`R${NBSP}1${NBSP}234,50`);
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe(`R${NBSP}0,00`);
  });

  it('defaults to zero for null/undefined/NaN input instead of throwing', () => {
    expect(formatCurrency(null)).toBe(`R${NBSP}0,00`);
    expect(formatCurrency(undefined)).toBe(`R${NBSP}0,00`);
    expect(formatCurrency('not a number')).toBe(`R${NBSP}0,00`);
  });

  it('coerces a numeric string', () => {
    expect(formatCurrency('99.99')).toBe(`R${NBSP}99,99`);
  });
});
