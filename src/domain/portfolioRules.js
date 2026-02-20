export const SYMBOL_REGEX = /^([0-9]{4,5}\.[TFNS]|[A-Z]{1,5})$/

export const isValidSymbol = (symbol) => SYMBOL_REGEX.test(symbol)

export const isValidQuantity = (quantity) => Number.isInteger(quantity) && quantity >= 1

export const normalizeQuantity = (quantity) => Math.max(1, Math.floor(quantity || 1))

export const parsePortfolioCsv = (csvText) => {
  const lines = csvText.split('\n')
  const items = []

  lines.forEach((line) => {
    const parts = line.split(',').map((part) => part.trim())
    if (parts.length < 2) return

    const symbol = parts[0].toUpperCase()
    const quantity = parseFloat(parts[1])

    if (!symbol || Number.isNaN(quantity)) return

    items.push({
      symbol,
      quantity,
    })
  })

  return items
}

export const toPortfolioCsv = (portfolio) => portfolio
  .map((item) => `${item.symbol},${item.quantity}`)
  .join('\n')
