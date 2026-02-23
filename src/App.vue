<template>
  <div class="layout">
    <header class="header">
      <h1>ポートフォリオ構成図</h1>
      <div class="header-actions">
        <div class="header-buttons">
          <a href="https://freddiefujiwara.com/portfolio-treemap" class="theme-toggle reset-link">リセット</a>
          <button @click="toggleTheme" class="theme-toggle">
            {{ theme === 'dark' ? 'ライト' : 'ダーク' }}モードへ
          </button>
          <button @click="toggleMosaic" class="theme-toggle">
            {{ isMosaic ? '金額表示' : '金額モザイク' }}
          </button>
          <button @click="copyShareUrl" class="theme-toggle">共有</button>
          <button @click="toggleImport" class="theme-toggle">CSVインポート</button>
          <button @click="refreshData" :disabled="isLoading" class="theme-toggle">
            {{ isLoading ? '更新中...' : 'データを更新' }}
          </button>
        </div>
      </div>
    </header>

    <div v-if="summary.totalValuation > 0" class="card-grid">
      <article class="card">
        <h2>総評価額</h2>
        <p :class="{ 'mosaic-blur': isMosaic }">¥{{ formatNumber(summary.totalValuation) }}</p>
      </article>
      <article class="card">
        <h2>前日比</h2>
        <p :class="getPriceChangeClass(summary.totalChangePercent)">
          <span :class="{ 'mosaic-blur': isMosaic }">
            {{ summary.totalChangeAmount >= 0 ? '+' : '' }}{{ formatNumber(summary.totalChangeAmount) }}
          </span>
          <span class="meta">({{ summary.totalChangePercent.toFixed(2) }}%)</span>
        </p>
      </article>
    </div>

    <div v-if="showImport" class="table-wrap">
      <h3>CSVインポート (Symbol, Quantity)</h3>
      <p class="error">既存のデータは上書きされます。</p>
      <div class="fire-form-grid" style="display: block;">
        <textarea v-model="csvInput" placeholder="4755.T,1000&#10;7203.T,500" style="height: 150px; margin-bottom: 12px;"></textarea>
      </div>
      <div class="header-buttons" style="justify-content: flex-start;">
        <button @click="importCSV" class="theme-toggle">インポート実行</button>
        <button @click="toggleImport" class="theme-toggle">キャンセル</button>
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

      <div class="table-wrap">
        <h3>ポートフォリオ管理</h3>
        <div class="fire-form-grid">
          <div class="filter-item">
            <label>銘柄コード</label>
            <input v-model="newItem.symbol" :class="{ 'input-error': symbolError }" placeholder="e.g. 4755.T" @keyup.enter="addItem" />
            <div v-if="symbolError" class="error">{{ symbolError }}</div>
          </div>
          <div class="filter-item">
            <label>保有数</label>
            <input v-model.number="newItem.quantity" :class="{ 'input-error': quantityError }" type="number" placeholder="保有数" @keyup.enter="addItem" />
            <div v-if="quantityError" class="error">{{ quantityError }}</div>
          </div>
          <div class="filter-item">
            <button @click="addItem" class="theme-toggle" style="width: 100%;">追加</button>
          </div>
        </div>

        <table class="stack-table">
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
                <a :href="'https://finance.yahoo.co.jp/quote/' + item.symbol + '?term=1d'" target="_blank" rel="noopener noreferrer" class="stock-link">
                  <div class="symbol">{{ item.symbol }}</div>
                  <div class="meta">{{ stockData[item.symbol]?.name || '---' }}</div>
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
                  style="background: transparent; border: 1px solid var(--border); color: inherit; padding: 4px 8px; border-radius: 4px; width: 100%; max-width: 120px;"
                />
              </td>
              <td data-label="現在値">{{ stockData[item.symbol]?.price ? `¥${stockData[item.symbol].price.toLocaleString()}` : '---' }}</td>
              <td data-label="評価額">
                <span :class="{ 'mosaic-blur': isMosaic }">{{ getValuation(item) ? `¥${getValuation(item).toLocaleString()}` : '---' }}</span>
              </td>
              <td data-label="前日比" :class="getPriceChangeClass(stockData[item.symbol]?.changePercent)">
                {{ stockData[item.symbol]?.changePercent ? `${stockData[item.symbol].changePercent.toFixed(2)}%` : '---' }}
              </td>
              <td data-label="操作">
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
import { onMounted } from 'vue';
import Treemap from './components/Treemap.vue';
import { usePortfolioManager } from './composables/usePortfolioManager';

const {
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
  theme,
  toggleTheme,
  initialize,
  formatNumber,
  getValuation,
  getPriceChangeClass,
} = usePortfolioManager();

onMounted(initialize);
</script>

<style scoped>
.reset-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}
</style>
