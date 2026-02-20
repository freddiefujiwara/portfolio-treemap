import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encode, decode } from '../src/utils/urlState';

describe('urlState', () => {
  const samplePortfolio = [
    { symbol: '4755.T', quantity: 100, cost: 800 },
    { symbol: '7203.T', quantity: 50, cost: 2500 }
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
});
