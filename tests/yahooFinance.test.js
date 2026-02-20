import { describe, it, expect, vi } from 'vitest';
// We can't easily import parseYahooHTML because it's not exported.
// I should export it for testing or test it via fetchStockData (which needs fetch mock).

// Let's modify src/utils/yahooFinance.js to export parseYahooHTML.
import { fetchStockData } from '../src/utils/yahooFinance';

describe('yahooFinance', () => {
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
  });
});
