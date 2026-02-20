import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePortfolioManager } from '../src/composables/usePortfolioManager'

describe('usePortfolioManager', () => {
  let deps

  beforeEach(() => {
    deps = {
      fetchStockData: vi.fn(async (symbol) => ({ symbol, name: symbol, price: 100, changePercent: 1 })),
      getPortfolioFromUrl: vi.fn(() => null),
      updateUrlWithPortfolio: vi.fn(),
      copyText: vi.fn(async () => {}),
      notify: vi.fn(),
      getCurrentUrl: vi.fn(() => 'https://example.com/share'),
    }
  })

  it('adds a valid item and persists state', async () => {
    const manager = usePortfolioManager({ deps })
    manager.newItem.symbol = '4755.t'
    manager.newItem.quantity = 10

    await manager.addItem()

    expect(manager.portfolio.value).toEqual([{ symbol: '4755.T', quantity: 10 }])
    expect(deps.fetchStockData).toHaveBeenCalledWith('4755.T')
    expect(deps.updateUrlWithPortfolio).toHaveBeenCalledWith([{ symbol: '4755.T', quantity: 10 }])
  })

  it('returns validation errors for invalid input', async () => {
    const manager = usePortfolioManager({ deps })
    manager.newItem.symbol = 'bad!'
    manager.newItem.quantity = 0

    await manager.addItem()

    expect(manager.symbolError.value).toBe('無効な銘柄コードです')
    expect(manager.quantityError.value).toBe('1以上の整数を入力してください')
    expect(manager.portfolio.value).toEqual([])
  })

  it('imports csv and refreshes all symbols', async () => {
    const manager = usePortfolioManager({ deps })
    manager.csvInput.value = '4755.T,100\n7203.T,50'

    await manager.importCSV()

    expect(manager.portfolio.value).toEqual([
      { symbol: '4755.T', quantity: 100 },
      { symbol: '7203.T', quantity: 50 },
    ])
    expect(deps.fetchStockData).toHaveBeenCalledTimes(2)
    expect(manager.showImport.value).toBe(false)
    expect(manager.csvInput.value).toBe('')
  })

  it('copies share url', async () => {
    const manager = usePortfolioManager({ deps })

    await manager.copyShareUrl()

    expect(deps.copyText).toHaveBeenCalledWith('https://example.com/share')
    expect(deps.notify).toHaveBeenCalledWith('現在の状態を含むURLをコピーしました。')
  })
})
