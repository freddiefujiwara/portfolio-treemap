import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encode, decode, getPortfolioFromUrl, updateUrlWithPortfolio } from '../src/utils/urlState';

describe('urlState', () => {
  const samplePortfolio = [
    { symbol: '4755.T', quantity: 100 },
    { symbol: '7203.T', quantity: 50 }
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/portfolio-treemap/');
  });

  it('should encode and decode portfolio correctly', () => {
    const encoded = encode(samplePortfolio);
    expect(typeof encoded).toBe('string');

    const decoded = decode(encoded);
    expect(decoded).toEqual(samplePortfolio);
  });

  it('should return null for empty encoded value', () => {
    expect(decode('')).toBeNull();
    expect(decode(null)).toBeNull();
  });

  it('should return null for invalid encoded string', () => {
    expect(decode('invalid-string!!!')).toBeNull();
  });

  it('should handle underscores when decoding', () => {
    const data = { a: 1 };
    const encoded = encode(data);
    const underscored = encoded.replace(/\+/g, '_');
    expect(decode(underscored)).toEqual(data);
  });

  it('should handle %20 when decoding', () => {
    const encodedWithPlus = 'NobwRAzgngtgRgewDZgFxgKwAYBMWB0AKmADRgCOArgIYB2ALgJb1Ro4DMAvieNPMmjAAODAE4AjEVIUaDZq1TjuvWIhToALAHYMGKWSp0mLNOPFZ2o5ZFUD0OCRv0yj8tOyxZrfNYI3+cZ0M5E1QANk9vW3UwDWxA4gNZYwVzLx4bfhiMHByg5LdUD3SVLMEw8S0hfNdQ4qiy9CEsDGrElxCFeoyfO2EcMK0azvdInujBIXZxMOGU0ZLM33RRDXZ2OcK8LwBdIA';
    const encodedWithPercent20 = encodedWithPlus.replace(/\+/g, '%20');
    const result = decode(encodedWithPercent20);

    expect(result).not.toBeNull();
    expect(result[0].symbol).toBe('5020.T');
  });

  it('should load portfolio from query parameter and clean URL', () => {
    const encoded = encode(samplePortfolio);
    window.history.replaceState(null, '', `/portfolio-treemap/?p=${encoded}`);

    const decoded = getPortfolioFromUrl();

    expect(decoded).toEqual(samplePortfolio);
    expect(window.location.pathname).toBe(`/portfolio-treemap/${encoded}`);
    expect(window.location.search).toBe('');
  });

  it('should fallback to pathname encoded data', () => {
    const encoded = encode(samplePortfolio);
    window.history.replaceState(null, '', `/portfolio-treemap/${encoded}`);

    expect(getPortfolioFromUrl()).toEqual(samplePortfolio);
  });

  it('should return null for index.html path', () => {
    window.history.replaceState(null, '', '/portfolio-treemap/index.html');

    expect(getPortfolioFromUrl()).toBeNull();
  });

  it('should return null for unrelated path', () => {
    window.history.replaceState(null, '', '/other/path');

    expect(getPortfolioFromUrl()).toBeNull();
  });

  it('should write base path when updating with empty portfolio', () => {
    updateUrlWithPortfolio([]);
    expect(window.location.pathname).toBe('/portfolio-treemap/');
  });

  it('should encode and write path when updating with portfolio', () => {
    updateUrlWithPortfolio(samplePortfolio);

    expect(window.location.pathname.startsWith('/portfolio-treemap/')).toBe(true);
    expect(window.location.pathname).not.toBe('/portfolio-treemap/');

    const encoded = window.location.pathname.replace('/portfolio-treemap/', '');
    expect(decode(encoded)).toEqual(samplePortfolio);
  });
});
