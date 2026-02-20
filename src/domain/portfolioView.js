export const calculateSummary = (portfolio, stockData) => {
  let totalValuation = 0
  let totalYesterdayValuation = 0

  portfolio.forEach((item) => {
    const data = stockData[item.symbol]
    if (!data || !data.price) return

    const currentValuation = data.price * item.quantity
    totalValuation += currentValuation

    const yesterdayPrice = data.price / (1 + (data.changePercent || 0) / 100)
    totalYesterdayValuation += yesterdayPrice * item.quantity
  })

  const totalChangeAmount = totalValuation - totalYesterdayValuation
  const totalChangePercent = totalYesterdayValuation !== 0
    ? (totalChangeAmount / totalYesterdayValuation) * 100
    : 0

  return {
    totalValuation,
    totalChangeAmount,
    totalChangePercent,
  }
}

export const buildDisplayData = (portfolio, stockData) => portfolio
  .map((item) => {
    const data = stockData[item.symbol]
    if (!data || !data.price) return null

    return {
      symbol: item.symbol,
      name: data.name,
      valuation: data.price * item.quantity,
      change: data.changePercent,
    }
  })
  .filter((item) => item !== null)

export const getValuation = (item, stockData) => {
  const data = stockData[item.symbol]
  if (!data || !data.price) return null

  return data.price * item.quantity
}

export const formatNumber = (num) => Math.round(num).toLocaleString()

export const getPriceChangeClass = (change) => {
  if (change === undefined || change === null) return ''
  if (change > 0) return 'text-up'
  if (change < 0) return 'text-down'
  return ''
}
