const { normalizePhone } = require('../whatsappConversationService');

describe('normalizePhone', () => {
  it('returns null for falsy input', () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });

  it('strips spaces, dashes, and a leading + from an international-format number', () => {
    expect(normalizePhone('+27 82 123 4567')).toBe('27821234567');
    expect(normalizePhone('+27-82-123-4567')).toBe('27821234567');
  });

  it('leaves a local-format number (leading 0, no country code) as-is -- this is a known limitation, not full parsing', () => {
    expect(normalizePhone('0821234567')).toBe('0821234567');
  });

  it('coerces a numeric input to its digit string', () => {
    expect(normalizePhone(27821234567)).toBe('27821234567');
  });

  it('returns null when there are no digits at all', () => {
    expect(normalizePhone('not a phone number')).toBeNull();
  });

  it('is idempotent -- normalizing an already-normalized number is a no-op', () => {
    const normalized = normalizePhone('+27 82 123 4567');
    expect(normalizePhone(normalized)).toBe(normalized);
  });
});
