<template>
  <div class="app-container">
    <header>
      <h1><a href="/portfolio-treemap/" class="header-title-link">Portfolio Treemap</a></h1>
      <div class="actions">
        <button @click="isMosaic = !isMosaic" :class="['btn-info', { 'active': isMosaic }]">金額モザイク</button>
        <button @click="copyShareUrl" class="btn-info">共有</button>
        <button @click="toggleImport" class="btn-secondary">CSVインポート</button>
        <button @click="refreshData" :disabled="isLoading" class="btn-primary">
          {{ isLoading ? '更新中...' : 'データを更新' }}
        </button>
      </div>
    </header>

    <div v-if="summary.totalValuation > 0" class="portfolio-summary">
      <div class="summary-item main">
        <div class="label">総評価額</div>
        <div class="value" :class="{ 'mosaic-blur': isMosaic }">¥{{ formatNumber(summary.totalValuation) }}</div>
      </div>
      <div class="summary-item" :class="getPriceChangeClass(summary.totalChangePercent)">
        <div class="label">前日比</div>
        <div class="value">
          <span :class="{ 'mosaic-blur': isMosaic }">
            {{ summary.totalChangeAmount >= 0 ? '+' : '' }}{{ formatNumber(summary.totalChangeAmount) }}
          </span>
          <span class="percent">({{ summary.totalChangePercent.toFixed(2) }}%)</span>
        </div>
      </div>
    </div>

    <div v-if="showImport" class="import-section">
      <h3>CSVインポート (Symbol, Quantity)</h3>
      <p class="import-hint">既存のデータは上書きされます。</p>
      <textarea v-model="csvInput" placeholder="4755.T,1000&#10;7203.T,500"></textarea>
      <div class="import-actions">
        <button @click="importCSV" class="btn-primary">インポート実行</button>
        <button @click="showImport = false" class="btn-secondary">キャンセル</button>
      </div>
    </div>

    <main>
      <div class="treemap-section">
        <Treemap v-if="displayData.length > 0" :data="displayData" :is-mosaic="isMosaic" />
        <div v-else-if="!isLoading" class="empty-state">
          銘柄を追加してポートフォリオを可視化しましょう。
        </div>
        <div v-if="isLoading" class="loading-overlay">
          データを取得しています... ({{ completedCount }}/{{ portfolio.length }})
        </div>
      </div>

      <div class="portfolio-section">
        <div class="add-item-form">
          <div class="input-group">
            <div class="input-wrapper">
              <input v-model="newItem.symbol" :class="{ 'input-error': symbolError }" placeholder="銘柄コード (e.g. 4755.T)" @keyup.enter="addItem" />
              <div v-if="symbolError" class="error-text">{{ symbolError }}</div>
            </div>
            <div class="input-wrapper">
              <input v-model.number="newItem.quantity" :class="{ 'input-error': quantityError }" type="number" placeholder="保有数" @keyup.enter="addItem" />
              <div v-if="quantityError" class="error-text">{{ quantityError }}</div>
            </div>
          </div>
          <button @click="addItem" class="btn-primary add-btn">追加</button>
        </div>

        <div class="table-container">
          <table class="portfolio-table">
            <thead>
              <tr>
                <th>銘柄</th>
                <th>保有数</th>
                <th>現在値</th>
                <th>評価額</th>
                <th>前日比</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in portfolio" :key="item.symbol">
                <td data-label="銘柄">
                  <a :href="'https://finance.yahoo.co.jp/quote/' + item.symbol" target="_blank" rel="noopener noreferrer" class="stock-link">
                    <div class="symbol">{{ item.symbol }}</div>
                    <div class="name">{{ stockData[item.symbol]?.name || '---' }}</div>
                  </a>
                </td>
                <td data-label="保有数">
                  <input
                    v-model.number="item.quantity"
                    type="number"
                    min="1"
                    step="1"
                    @change="onQuantityChange(item)"
                    class="quantity-input"
                    :class="{ 'mosaic-blur': isMosaic }"
                  />
                </td>
                <td data-label="現在値">{{ stockData[item.symbol]?.price ? `¥${stockData[item.symbol].price.toLocaleString()}` : '---' }}</td>
                <td data-label="評価額">
                  <span :class="{ 'mosaic-blur': isMosaic }">{{ getValuation(item) ? `¥${getValuation(item).toLocaleString()}` : '---' }}</span>
                </td>
                <td data-label="前日比" :class="getPriceChangeClass(stockData[item.symbol]?.changePercent)">
                  {{ stockData[item.symbol]?.changePercent ? `${stockData[item.symbol].changePercent.toFixed(2)}%` : '---' }}
                </td>
                <td class="actions-cell">
                  <button @click="removeItem(index)" class="btn-danger">削除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import Treemap from './components/Treemap.vue';
import { fetchStockData } from './utils/yahooFinance';
import { getPortfolioFromUrl, updateUrlWithPortfolio } from './utils/urlState';

const portfolio = ref([]);
const stockData = reactive({});
const isLoading = ref(false);
const completedCount = ref(0);
const showImport = ref(false);
const csvInput = ref('');
const isMosaic = ref(false);
const MAX_CONCURRENT_REQUESTS = 5;

const newItem = reactive({
  symbol: '',
  quantity: null
});

const symbolError = ref('');
const quantityError = ref('');

const SYMBOL_REGEX = /^([0-9]{4,5}\.[TFNS]|[A-Z]{1,5})$/;

const isValidSymbol = (symbol) => SYMBOL_REGEX.test(symbol);
const isValidQuantity = (q) => Number.isInteger(q) && q >= 1;

const summary = computed(() => {
  let totalValuation = 0;
  let totalYesterdayValuation = 0;

  portfolio.value.forEach(item => {
    const data = stockData[item.symbol];
    if (data && data.price) {
      const currentVal = data.price * item.quantity;
      totalValuation += currentVal;

      const yesterdayPrice = data.price / (1 + (data.changePercent || 0) / 100);
      totalYesterdayValuation += yesterdayPrice * item.quantity;
    }
  });

  const totalChangeAmount = totalValuation - totalYesterdayValuation;
  const totalChangePercent = totalYesterdayValuation !== 0
    ? (totalChangeAmount / totalYesterdayValuation) * 100
    : 0;

  return {
    totalValuation,
    totalChangeAmount,
    totalChangePercent
  };
});

const displayData = computed(() => {
  return portfolio.value
    .map(item => {
      const data = stockData[item.symbol];
      if (!data || !data.price) return null;
      return {
        symbol: item.symbol,
        name: data.name,
        valuation: data.price * item.quantity,
        change: data.changePercent
      };
    })
    .filter(d => d !== null);
});

const formatNumber = (num) => {
  return Math.round(num).toLocaleString();
};

const getValuation = (item) => {
  const data = stockData[item.symbol];
  if (!data || !data.price) return null;
  return data.price * item.quantity;
};

const getPriceChangeClass = (change) => {
  if (change === undefined || change === null) return '';
  if (change > 0) return 'text-up';
  if (change < 0) return 'text-down';
  return '';
};

const onQuantityChange = (item) => {
  if (!isValidQuantity(item.quantity)) {
    item.quantity = Math.max(1, Math.floor(item.quantity || 1));
  }
  updateUrlWithPortfolio(portfolio.value);
};

const addItem = async () => {
  symbolError.value = '';
  quantityError.value = '';

  const symbol = newItem.symbol.toUpperCase();

  if (!isValidSymbol(symbol)) {
    symbolError.value = '無効な銘柄コードです';
  }
  if (!isValidQuantity(newItem.quantity)) {
    quantityError.value = '1以上の整数を入力してください';
  }

  if (symbolError.value || quantityError.value) return;

  if (!portfolio.value.find(i => i.symbol === symbol)) {
    portfolio.value.push({
      symbol,
      quantity: newItem.quantity
    });
    fetchSingle(symbol);
  }

  newItem.symbol = '';
  newItem.quantity = null;

  updateUrlWithPortfolio(portfolio.value);
};

const removeItem = (index) => {
  portfolio.value.splice(index, 1);
  updateUrlWithPortfolio(portfolio.value);
};

const toggleImport = () => {
  showImport.value = !showImport.value;
  if (showImport.value) {
    csvInput.value = portfolio.value
      .map(item => `${item.symbol},${item.quantity}`)
      .join('\n');
  }
};

const importCSV = () => {
  const lines = csvInput.value.split('\n');
  const newItems = [];
  lines.forEach(line => {
    const parts = line.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      const symbol = parts[0].toUpperCase();
      const quantity = parseFloat(parts[1]);
      if (symbol && !isNaN(quantity)) {
        newItems.push({
          symbol,
          quantity
        });
      }
    }
  });

  portfolio.value = newItems;
  updateUrlWithPortfolio(portfolio.value);
  refreshData();
  showImport.value = false;
  csvInput.value = '';
};

const copyShareUrl = () => {
  navigator.clipboard.writeText(window.location.href).then(() => {
    alert('現在の状態を含むURLをコピーしました。');
  });
};

const fetchSingle = async (symbol) => {
  const data = await fetchStockData(symbol);
  if (!data.error) {
    stockData[symbol] = data;
  }
};

const refreshData = async () => {
  if (portfolio.value.length === 0) return;

  isLoading.value = true;
  completedCount.value = 0;

  const symbols = portfolio.value.map(item => item.symbol);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < symbols.length) {
      const currentIndex = nextIndex;
      nextIndex++;

      await fetchSingle(symbols[currentIndex]);
      completedCount.value++;
    }
  };

  const workerCount = Math.min(MAX_CONCURRENT_REQUESTS, symbols.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  isLoading.value = false;
};

onMounted(() => {
  const saved = getPortfolioFromUrl();
  if (saved) {
    portfolio.value = saved;
    refreshData();
  }
});
</script>

<style>
.app-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 100%;
  overflow-x: hidden;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

header h1 {
  margin: 0;
  font-size: 24px;
}

.header-title-link {
  color: #1d1d1f;
  text-decoration: none;
}

.header-title-link:hover {
  opacity: 0.7;
}

.portfolio-summary {
  display: flex;
  gap: 24px;
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.summary-item .label {
  font-size: 14px;
  color: #8e8e93;
  margin-bottom: 4px;
}

.summary-item .value {
  font-size: 24px;
  font-weight: bold;
}

.summary-item.main .value {
  font-size: 32px;
}

.summary-item .percent {
  font-size: 16px;
  margin-left: 4px;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.import-section {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.import-hint {
  font-size: 12px;
  color: #ff3b30;
  margin-top: -10px;
  margin-bottom: 10px;
}

.import-section textarea {
  width: 100%;
  height: 150px;
  margin: 10px 0;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  font-family: monospace;
}

.import-actions {
  display: flex;
  gap: 10px;
}

.treemap-section {
  position: relative;
  width: 100%;
}

.empty-state {
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 12px;
  color: #8e8e93;
  border: 2px dashed #d1d1d6;
}

.loading-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 10;
}

.portfolio-section {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.add-item-form {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.input-group {
  display: flex;
  gap: 8px;
  flex: 1;
  min-width: 280px;
}

.input-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.input-error {
  border-color: #ff3b30 !important;
}

.error-text {
  color: #ff3b30;
  font-size: 12px;
  margin-top: 4px;
}

.add-item-form input {
  padding: 10px 14px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  flex: 1;
  min-width: 0;
  font-size: 16px;
}

.add-btn {
  white-space: nowrap;
}

.actions button,
.import-actions button {
  white-space: nowrap;
}

.table-container {
  overflow-x: auto;
}

.portfolio-table {
  width: 100%;
  border-collapse: collapse;
}

.portfolio-table th, .portfolio-table td {
  text-align: left;
  padding: 14px;
  border-bottom: 1px solid #f0f0f0;
}

.portfolio-table th {
  background: #fafafa;
  font-weight: 600;
  color: #48484a;
}

.symbol {
  font-weight: bold;
}

.name {
  font-size: 12px;
  color: #8e8e93;
}

.stock-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.stock-link:hover .symbol {
  color: #007aff;
}

.quantity-input {
  width: 100px;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  background: #fff;
  transition: all 0.2s;
  color: inherit;
  box-sizing: border-box;
}

.quantity-input:focus {
  border-color: #007aff;
  outline: none;
}

/* Hide spin buttons */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}

.btn-primary {
  background: #007aff;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  transition: opacity 0.2s;
}

.btn-secondary {
  background: #fff;
  color: #007aff;
  border: 1px solid #007aff;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
}

.btn-info.active {
  background: #e5e5ea;
  border-color: #8e8e93;
}

.mosaic-blur {
  filter: blur(6px);
  transition: filter 0.2s;
  user-select: none;
}

.btn-info {
  background: #f2f2f7;
  color: #1d1d1f;
  border: 1px solid #d1d1d6;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
}

.btn-danger {
  background: #ff3b30;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.text-up {
  color: #34c759;
}

.text-down {
  color: #ff3b30;
}

button:active {
  opacity: 0.7;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive Table */
@media screen and (max-width: 768px) {
  .actions {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .actions button {
    width: 100%;
    padding: 10px 12px;
    font-size: 15px;
  }

  .portfolio-summary {
    flex-direction: column;
    gap: 12px;
  }

  .summary-item.main .value {
    font-size: 28px;
  }

  .portfolio-table thead {
    display: none;
  }

  .portfolio-table tr {
    display: block;
    margin-bottom: 16px;
    border: 1px solid #f0f0f0;
    border-radius: 12px;
    padding: 8px;
  }

  .portfolio-table td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: none;
    padding: 8px;
    text-align: right;
  }

  .portfolio-table td::before {
    content: attr(data-label);
    font-weight: 600;
    color: #8e8e93;
    text-align: left;
    margin-right: 16px;
  }

  .portfolio-table td[data-label="銘柄"] {
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 4px;
    padding-bottom: 12px;
  }

  .actions-cell {
    justify-content: flex-end;
  }

  .quantity-input {
    text-align: right;
    width: 120px;
  }

  .add-item-form {
    flex-direction: column;
  }

  .input-group {
    flex-direction: column;
    width: 100%;
    min-width: 0;
  }

  .add-item-form input {
    width: 100%;
    box-sizing: border-box;
  }

  .add-btn {
    width: 100%;
  }
}
</style>
