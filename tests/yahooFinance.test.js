import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchStockData, parseYahooHTML } from '../src/utils/yahooFinance';

describe('yahooFinance', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch and parse data', async () => {
    const mockHtml = `
      <html>
        <body>
          <h2 class="PriceBoard__name__166W">楽天グループ(株)</h2>
          <div class="PriceBoard__price__1V0k">
            <span class="StyledNumber__value__3rXW">822.4</span>
          </div>
          <div class="PriceChangeLabel__secondary__3BXI">
            <span class="StyledNumber__value__3rXW">-2.94</span>
          </div>
        </body>
      </html>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ content: mockHtml })
    });

    const data = await fetchStockData('4755.T');

    expect(data.symbol).toBe('4755.T');
    expect(data.name).toBe('楽天グループ(株)');
    expect(data.price).toBe(822.4);
    expect(data.changePercent).toBe(-2.94);
    expect(data.updatedAt).toBeTypeOf('string');
  });

  it('should return error object when response content is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({})
    });

    const data = await fetchStockData('7203.T');

    expect(data).toEqual({ symbol: '7203.T', error: 'No content found in response' });
  });

  it('should return error object when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network down'));

    const data = await fetchStockData('9984.T');

    expect(data).toEqual({ symbol: '9984.T', error: 'Network down' });
  });

  it('should parse fallback values when html is missing expected elements', () => {
    const parsed = parseYahooHTML('<html><body><p>empty</p></body></html>', '8306.T');

    expect(parsed.symbol).toBe('8306.T');
    expect(parsed.name).toBe('8306.T');
    expect(parsed.price).toBeNull();
    expect(parsed.changePercent).toBe(0);
    expect(parsed.updatedAt).toBeTypeOf('string');
  });

  it('should parse comma-separated price and positive change', () => {
    const html = `
      <h2 class="PriceBoard__name__166W">テスト銘柄</h2>
      <div class="PriceBoard__price__1V0k">
        <span class="StyledNumber__value__3rXW">1,234.5</span>
      </div>
      <div class="PriceChangeLabel__secondary__3BXI">
        <span class="StyledNumber__value__3rXW">1.25</span>
      </div>
    `;

    const parsed = parseYahooHTML(html, '1111.T');

    expect(parsed.name).toBe('テスト銘柄');
    expect(parsed.price).toBe(1234.5);
    expect(parsed.changePercent).toBe(1.25);
  });
});
