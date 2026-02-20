<template>
  <div class="app-container">
    <header>
      <h1>Portfolio Treemap</h1>
      <div class="actions">
        <button @click="toggleImport" class="btn-secondary">CSVインポート</button>
        <button @click="refreshData" :disabled="isLoading" class="btn-primary">
          {{ isLoading ? '更新中...' : 'データを更新' }}
        </button>
      </div>
    </header>

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
        <Treemap v-if="displayData.length > 0" :data="displayData" />
        <div v-else-if="!isLoading" class="empty-state">
          銘柄を追加してポートフォリオを可視化しましょう。
        </div>
        <div v-if="isLoading" class="loading-overlay">
          データを取得しています... ({{ completedCount }}/{{ portfolio.length }})
        </div>
      </div>

      <div class="portfolio-section">
        <div class="add-item-form">
          <input v-model="newItem.symbol" placeholder="銘柄コード (e.g. 4755.T)" @keyup.enter="addItem" />
          <input v-model.number="newItem.quantity" type="number" placeholder="保有数" @keyup.enter="addItem" />
          <button @click="addItem" class="btn-primary">追加</button>
        </div>

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
              <td>
                <div class="symbol">{{ item.symbol }}</div>
                <div class="name">{{ stockData[item.symbol]?.name || '---' }}</div>
              </td>
              <td>{{ item.quantity.toLocaleString() }}</td>
              <td>{{ stockData[item.symbol]?.price ? `¥${stockData[item.symbol].price.toLocaleString()}` : '---' }}</td>
              <td>{{ getValuation(item) ? `¥${getValuation(item).toLocaleString()}` : '---' }}</td>
              <td :class="getPriceChangeClass(stockData[item.symbol]?.changePercent)">
                {{ stockData[item.symbol]?.changePercent ? `${stockData[item.symbol].changePercent.toFixed(2)}%` : '---' }}
              </td>
              <td>
                <button @click="removeItem(index)" class="btn-danger">削除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue';
import Treemap from './components/Treemap.vue';
import { fetchStockData } from './utils/yahooFinance';
import { getPortfolioFromUrl, updateUrlWithPortfolio } from './utils/urlState';

const portfolio = ref([]);
const stockData = reactive({});
const isLoading = ref(false);
const completedCount = ref(0);
const showImport = ref(false);
const csvInput = ref('');

const newItem = reactive({
  symbol: '',
  quantity: null
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

const addItem = async () => {
  if (!newItem.symbol || !newItem.quantity) return;

  const symbol = newItem.symbol.toUpperCase();
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

  for (const item of portfolio.value) {
    await fetchSingle(item.symbol);
    completedCount.value++;
  }

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
  gap: 20px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.actions {
  display: flex;
  gap: 10px;
}

.import-section {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
  border-radius: 4px;
  font-family: monospace;
}

.import-actions {
  display: flex;
  gap: 10px;
}

.treemap-section {
  position: relative;
  margin-bottom: 20px;
}

.empty-state {
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 8px;
  color: #8e8e93;
  border: 2px dashed #d1d1d6;
}

.loading-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.8);
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.portfolio-section {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.add-item-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.add-item-form input {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  flex: 1;
}

.portfolio-table {
  width: 100%;
  border-collapse: collapse;
}

.portfolio-table th, .portfolio-table td {
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.portfolio-table th {
  background: #fafafa;
  font-weight: 600;
}

.symbol {
  font-weight: bold;
}

.name {
  font-size: 12px;
  color: #8e8e93;
}

.btn-primary {
  background: #007aff;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
}

.btn-secondary {
  background: #fff;
  color: #007aff;
  border: 1px solid #007aff;
  padding: 8px 16px;
  border-radius: 4px;
}

.btn-danger {
  background: #ff3b30;
  color: #fff;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.text-up {
  color: #52c41a;
}

.text-down {
  color: #ff4d4f;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
