import { describe, expect, it } from 'vitest'
import {
  buildDisplayData,
  calculateSummary,
  formatNumber,
  getPriceChangeClass,
  getValuation,
} from '../src/domain/portfolioView'

describe('portfolioView', () => {
  const portfolio = [
    { symbol: 'AAA', quantity: 2 },
    { symbol: 'BBB', quantity: 1 },
  ]
  const stockData = {
    AAA: { name: 'A', price: 100, changePercent: 10 },
    BBB: { name: 'B', price: 50, changePercent: -5 },
  }

  it('calculates summary', () => {
    const summary = calculateSummary(portfolio, stockData)
    expect(summary.totalValuation).toBe(250)
    expect(summary.totalChangeAmount).not.toBe(0)
  })

  it('builds display data and valuations', () => {
    expect(buildDisplayData(portfolio, stockData)).toEqual([
      { symbol: 'AAA', name: 'A', valuation: 200, change: 10 },
      { symbol: 'BBB', name: 'B', valuation: 50, change: -5 },
    ])
    expect(getValuation(portfolio[0], stockData)).toBe(200)
  })

  it('formats numbers and classes', () => {
    expect(formatNumber(1234.4)).toBe('1,234')
    expect(getPriceChangeClass(1)).toBe('text-up')
    expect(getPriceChangeClass(-1)).toBe('text-down')
    expect(getPriceChangeClass(0)).toBe('')
  })
})
