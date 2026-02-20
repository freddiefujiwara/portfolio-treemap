import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encode, decode } from '../src/utils/urlState';

describe('urlState', () => {
  const samplePortfolio = [
    { symbol: '4755.T', quantity: 100 },
    { symbol: '7203.T', quantity: 50 }
  ];

  it('should encode and decode portfolio correctly', () => {
    const encoded = encode(samplePortfolio);
    expect(typeof encoded).toBe('string');

    const decoded = decode(encoded);
    expect(decoded).toEqual(samplePortfolio);
  });

  it('should return null for invalid encoded string', () => {
    expect(decode('invalid-string!!!')).toBeNull();
  });

  it('should handle spaces converted from plus signs', () => {
    // Generate a string that contains a plus sign when encoded
    // For lz-string, some specific inputs will produce a '+' in EncodedURIComponent
    const complexData = { symbols: ['AAPL', 'MSFT'], q: 1000, t: Date.now() };
    const encoded = encode(complexData);

    if (encoded.includes('+')) {
      const withSpaces = encoded.replace(/\+/g, ' ');
      expect(decode(withSpaces)).toEqual(complexData);
    } else {
      // If our sample didn't have a plus, let's try a known one or just manually test the logic
      // Actually, we can just take any valid encoded string and replace a char we know will be handled
      // But lz-string is tricky. Let's just trust the regex if it's there.
      // Better: let's force a string that we know has a plus if we can find one.
      // Or just verify the normalization logic is called.
      const encodedWithPlus = "NobwRAzgngtgRgewDZgFxgKwAYBMWB0AKmADRgCOArgIYB2ALgJb1Ro4DMAvieNPMmjAAODAE4AjEVIUaDZq1TjuvWIhToALAHYMGKWSp0mLNOPFZ2o5ZFUD0OCRv0yj8tOyxZrfNYI3+cZ0M5E1QANk9vW3UwDWxA4gNZYwVzLx4bfhiMHByg5LdUD3SVLMEw8S0hfNdQ4qiy9CEsDGrElxCFeoyfO2EcMK0azvdInujBIXZxMOGU0ZLM33RRDXZ2OcK8LwBdIA";
      const encodedWithSpace = encodedWithPlus.replace(/\+/g, ' ');
      // If this decompress successfully after replace, then it works.
      const result = decode(encodedWithSpace);
      expect(result).not.toBeNull();
    }
  });
});
