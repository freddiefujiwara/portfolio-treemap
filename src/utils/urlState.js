import LZString from "lz-string";

export const decode = (encoded) => {
  if (!encoded) return null;
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) return null;
    return JSON.parse(decompressed);
  } catch (e) {
    console.error("Failed to decode URL state", e);
    return null;
  }
};

export const encode = (value) => {
  return LZString.compressToEncodedURIComponent(JSON.stringify(value));
};

export const getPortfolioFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const p = urlParams.get('p');

  if (p) {
    // If we were redirected from 404.html, the data is in 'p' query param
    const decoded = decode(p);
    if (decoded) {
      // Clean up the URL
      const newPath = `/portfolio-treemap/${p}`;
      window.history.replaceState(null, "", newPath);
      return decoded;
    }
  }

  const path = window.location.pathname;
  const base = "/portfolio-treemap/";
  if (path.startsWith(base)) {
    const encoded = path.substring(base.length);
    if (encoded && encoded !== "" && encoded !== "index.html") {
      return decode(encoded);
    }
  }
  return null;
};

export const updateUrlWithPortfolio = (portfolio) => {
  if (!portfolio || portfolio.length === 0) {
    window.history.replaceState(null, "", "/portfolio-treemap/");
    return;
  }
  const encoded = encode(portfolio);
  const newPath = `/portfolio-treemap/${encoded}`;
  window.history.replaceState(null, "", newPath);
};
