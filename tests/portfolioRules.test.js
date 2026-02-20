import { describe, expect, it } from 'vitest'
import {
  isValidQuantity,
  isValidSymbol,
  normalizeQuantity,
  parsePortfolioCsv,
  toPortfolioCsv,
} from '../src/domain/portfolioRules'

describe('portfolioRules', () => {
  it('validates symbol formats', () => {
    expect(isValidSymbol('4755.T')).toBe(true)
    expect(isValidSymbol('AAPL')).toBe(true)
    expect(isValidSymbol('bad-symbol')).toBe(false)
  })

  it('validates and normalizes quantity', () => {
    expect(isValidQuantity(1)).toBe(true)
    expect(isValidQuantity(0)).toBe(false)
    expect(isValidQuantity(1.2)).toBe(false)
    expect(normalizeQuantity(2.8)).toBe(2)
    expect(normalizeQuantity(0)).toBe(1)
  })

  it('parses and serializes csv', () => {
    const csv = '4755.T,100\n7203.T,50\ninvalid'
    const parsed = parsePortfolioCsv(csv)

    expect(parsed).toEqual([
      { symbol: '4755.T', quantity: 100 },
      { symbol: '7203.T', quantity: 50 },
    ])
    expect(toPortfolioCsv(parsed)).toBe('4755.T,100\n7203.T,50')
  })
})
