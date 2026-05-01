const PROXY_URL = "https://script.google.com/macros/s/AKfycbx6iFGnB5EaSVedN5mk8F1L0iO9orwZZiOz_2m6wIRzHA1XsU555ib0Ex2LMCR1nLOvhw/exec";

export const fetchStockData = async (symbol) => {
  const targetUrl = `https://finance.yahoo.co.jp/quote/${symbol}`;
  const fetchUrl = `${PROXY_URL}?u=${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(fetchUrl);
    const data = await response.json();
    if (!data.content) throw new Error("No content found in response");

    return parseYahooHTML(data.content, symbol);
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return { symbol, error: error.message };
  }
};

export const parseYahooHTML = (html, symbol) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const name = doc.querySelector('[class*="_BasePriceBoard__name_"]')?.textContent || symbol;

  // Current Price
  const priceElement = doc.querySelector('[class*="_CommonPriceBoard__price_"] [class*="_StyledNumber__value_"]');
  const price = priceElement ? parseFloat(priceElement.textContent.replace(/,/g, "")) : null;

  // Change percentage
  const changePercentElement = doc.querySelector('[class*="_PriceChangeLabel__secondary_"] [class*="_StyledNumber__value_"]');
  const changePercent = changePercentElement ? parseFloat(changePercentElement.textContent) : 0;

  return {
    symbol,
    name,
    price,
    changePercent,
    updatedAt: new Date().toISOString()
  };
};
