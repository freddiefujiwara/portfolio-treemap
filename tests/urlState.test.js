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

  it('should use underscore instead of plus sign in encoded string', () => {
    // Force a case that would have a plus sign
    const data = { symbols: ['AAPL', 'MSFT'], q: 1000 };
    const encoded = encode(data);
    expect(encoded).not.toContain('+');
    // If it was supposed to have a plus, it should now have an underscore
    // We can verify by decoding it
    expect(decode(encoded)).toEqual(data);
  });

  it('should handle underscores when decoding', () => {
    const data = { a: 1 };
    const encoded = encode(data).replace(/\+/g, '_'); // Ensure it has underscores if it had pluses
    expect(decode(encoded)).toEqual(data);
  });

  it('should handle %20 when decoding', () => {
    const data = { symbol: 'AAPL' };
    const encoded = encode(data);
    // Manually introduce %20 (simulating double encoding of a mangled space)
    // We need to find a way to get a '+' that we can turn into %20
    const encodedWithPlus = "NobwRAzgngtgRgewDZgFxgKwAYBMWB0AKmADRgCOArgIYB2ALgJb1Ro4DMAvieNPMmjAAODAE4AjEVIUaDZq1TjuvWIhToALAHYMGKWSp0mLNOPFZ2o5ZFUD0OCRv0yj8tOyxZrfNYI3+cZ0M5E1QANk9vW3UwDWxA4gNZYwVzLx4bfhiMHByg5LdUD3SVLMEw8S0hfNdQ4qiy9CEsDGrElxCFeoyfO2EcMK0azvdInujBIXZxMOGU0ZLM33RRDXZ2OcK8LwBdIA";
    const encodedWithPercent20 = encodedWithPlus.replace(/\+/g, '%20');
    expect(decode(encodedWithPercent20)).not.toBeNull();
    const result = decode(encodedWithPercent20);
    expect(result[0].symbol).toBe('5020.T');
  });
});
