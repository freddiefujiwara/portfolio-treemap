import { computed, reactive, ref } from 'vue'
import { fetchStockData as fetchStockDataDefault } from '../utils/yahooFinance'
import { getPortfolioFromUrl as getPortfolioFromUrlDefault, updateUrlWithPortfolio as updateUrlWithPortfolioDefault } from '../utils/urlState'
import {
  isValidQuantity,
  isValidSymbol,
  normalizeQuantity,
  parsePortfolioCsv,
  toPortfolioCsv,
} from '../domain/portfolioRules'
import {
  buildDisplayData,
  calculateSummary,
  formatNumber,
  getPriceChangeClass,
  getValuation,
} from '../domain/portfolioView'

const createDefaultDeps = () => ({
  fetchStockData: fetchStockDataDefault,
  getPortfolioFromUrl: getPortfolioFromUrlDefault,
  updateUrlWithPortfolio: updateUrlWithPortfolioDefault,
  copyText: (text) => navigator.clipboard.writeText(text),
  notify: (message) => window.alert(message),
  getCurrentUrl: () => window.location.href,
})

export const usePortfolioManager = ({ maxConcurrentRequests = 5, deps = {} } = {}) => {
  const services = { ...createDefaultDeps(), ...deps }

  const portfolio = ref([])
  const stockData = reactive({})
  const isLoading = ref(false)
  const completedCount = ref(0)
  const showImport = ref(false)
  const csvInput = ref('')
  const isMosaic = ref(false)
  const symbolError = ref('')
  const quantityError = ref('')

  const newItem = reactive({
    symbol: '',
    quantity: null,
  })

  const persistPortfolio = () => {
    services.updateUrlWithPortfolio(portfolio.value)
  }

  const fetchSingle = async (symbol) => {
    const data = await services.fetchStockData(symbol)
    if (!data.error) {
      stockData[symbol] = data
    }
  }

  const summary = computed(() => calculateSummary(portfolio.value, stockData))
  const displayData = computed(() => buildDisplayData(portfolio.value, stockData))

  const onQuantityChange = (item) => {
    if (!isValidQuantity(item.quantity)) {
      item.quantity = normalizeQuantity(item.quantity)
    }
    persistPortfolio()
  }

  const addItem = async () => {
    symbolError.value = ''
    quantityError.value = ''

    const symbol = newItem.symbol.toUpperCase()

    if (!isValidSymbol(symbol)) {
      symbolError.value = '無効な銘柄コードです'
    }
    if (!isValidQuantity(newItem.quantity)) {
      quantityError.value = '1以上の整数を入力してください'
    }
    if (symbolError.value || quantityError.value) return

    if (!portfolio.value.find((item) => item.symbol === symbol)) {
      portfolio.value.push({ symbol, quantity: newItem.quantity })
      await fetchSingle(symbol)
    }

    newItem.symbol = ''
    newItem.quantity = null
    persistPortfolio()
  }

  const removeItem = (index) => {
    portfolio.value.splice(index, 1)
    persistPortfolio()
  }

  const toggleImport = () => {
    showImport.value = !showImport.value
    if (showImport.value) {
      csvInput.value = toPortfolioCsv(portfolio.value)
    }
  }

  const importCSV = async () => {
    portfolio.value = parsePortfolioCsv(csvInput.value)
    persistPortfolio()
    await refreshData()
    showImport.value = false
    csvInput.value = ''
  }

  const copyShareUrl = async () => {
    await services.copyText(services.getCurrentUrl())
    services.notify('現在の状態を含むURLをコピーしました。')
  }

  const refreshData = async () => {
    if (portfolio.value.length === 0) return

    isLoading.value = true
    completedCount.value = 0

    const symbols = portfolio.value.map((item) => item.symbol)
    let nextIndex = 0

    const worker = async () => {
      while (nextIndex < symbols.length) {
        const currentIndex = nextIndex
        nextIndex += 1

        await fetchSingle(symbols[currentIndex])
        completedCount.value += 1
      }
    }

    const workerCount = Math.min(maxConcurrentRequests, symbols.length)
    await Promise.all(Array.from({ length: workerCount }, () => worker()))

    isLoading.value = false
  }

  const toggleMosaic = () => {
    isMosaic.value = !isMosaic.value
  }

  const initialize = async () => {
    const saved = services.getPortfolioFromUrl()
    if (!saved) return

    portfolio.value = saved
    await refreshData()
  }

  return {
    portfolio,
    stockData,
    isLoading,
    completedCount,
    showImport,
    csvInput,
    isMosaic,
    newItem,
    symbolError,
    quantityError,
    summary,
    displayData,
    addItem,
    removeItem,
    toggleImport,
    importCSV,
    copyShareUrl,
    refreshData,
    onQuantityChange,
    toggleMosaic,
    initialize,
    formatNumber,
    getValuation: (item) => getValuation(item, stockData),
    getPriceChangeClass,
  }
}
