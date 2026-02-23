<template>
  <div ref="container" class="treemap-container" :style="{ height: height + 'px' }">
    <div v-if="layoutNodes.length === 0" class="empty-treemap-message">
      銘柄データを取得中か、有効な銘柄データがありません。
    </div>
    <div
      v-for="leaf in layoutNodes"
      :key="leaf.data.symbol"
      class="stock-tile"
      :style="{
        left: leaf.x0 + 'px',
        top: leaf.y0 + 'px',
        width: (leaf.x1 - leaf.x0) + 'px',
        height: (leaf.y1 - leaf.y0) + 'px',
        fontSize: getFontSize(leaf) + 'px',
        backgroundColor: getTileColor(leaf.data.change)
      }"
      @mousemove="showTooltip($event, leaf)"
      @mouseleave="hideTooltip"
    >
      <div v-if="(leaf.x1 - leaf.x0) >= 30 && (leaf.y1 - leaf.y0) >= 20" class="tile-label-container">
        <div class="stock-tile-name">{{ leaf.data.name }}</div>
        <div class="tile-symbol" :style="{ fontSize: (getFontSize(leaf) * 0.7) + 'px' }">{{ leaf.data.symbol }}</div>
        <div class="tile-change" :style="{ fontSize: (getFontSize(leaf) * 0.8) + 'px' }">
          {{ leaf.data.change > 0 ? '+' : '' }}{{ leaf.data.change.toFixed(2) }}%
        </div>
      </div>
    </div>

    <div v-if="tooltip.show" class="stock-tile-tooltip" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px', opacity: 1, position: 'fixed' }">
      <div class="stock-tile-name" style="margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
        {{ tooltip.data.name }} ({{ tooltip.data.symbol }})
      </div>
      <div style="display: flex; justify-content: space-between; gap: 16px;">
        <span>評価額:</span>
        <span :class="{ 'mosaic-blur': isMosaic }">¥{{ formatNumber(tooltip.data.valuation) }}</span>
      </div>
      <div style="display: flex; justify-content: space-between; gap: 16px;">
        <span>比率:</span>
        <span>{{ tooltip.data.ratio.toFixed(2) }}%</span>
      </div>
      <div style="display: flex; justify-content: space-between; gap: 16px;">
        <span>前日比:</span>
        <span :class="tooltip.data.change > 0 ? 'is-positive' : tooltip.data.change < 0 ? 'is-negative' : ''">
          {{ tooltip.data.change > 0 ? '+' : '' }}{{ tooltip.data.change.toFixed(2) }}%
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted, computed } from 'vue';
import * as d3 from 'd3';

const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  isMosaic: {
    type: Boolean,
    default: false
  }
});

const container = ref(null);
const width = ref(800);
const height = ref(500);
const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  data: {}
});

const formatNumber = (num) => {
  return Math.round(num).toLocaleString();
};

const updateDimensions = () => {
  if (container.value) {
    const newWidth = container.value.clientWidth;
    if (newWidth > 0) {
      width.value = newWidth;
    }
    height.value = Math.max(400, window.innerHeight * 0.6);
  }
};

const layoutNodes = computed(() => {
  if (!props.data || props.data.length === 0) return [];

  const validData = props.data.filter(d => d.valuation > 0);
  if (validData.length === 0) return [];

  const root = d3.hierarchy({ children: validData })
    .sum(d => d.valuation)
    .sort((a, b) => b.value - a.value);

  d3.treemap()
    .size([width.value, height.value])
    .padding(1)
    (root);

  return root.leaves();
});

const getFontSize = (leaf) => {
  const w = leaf.x1 - leaf.x0;
  const h = leaf.y1 - leaf.y0;
  const side = Math.min(w, h);
  return Math.max(8, Math.min(side / 4.5, w / 8, 36));
};

const getTileColor = (change) => {
  const neutral = "#1f2937"; // --surface-elevated
  const positive = "#22c55e";
  const negative = "#ef4444";

  if (change > 0) {
    const intensity = Math.min(change / 5, 1);
    return d3.interpolateRgb(neutral, positive)(intensity);
  } else if (change < 0) {
    const intensity = Math.min(Math.abs(change) / 5, 1);
    return d3.interpolateRgb(neutral, negative)(intensity);
  }
  return neutral;
};

const showTooltip = (event, leaf) => {
  const totalValuation = props.data.reduce((sum, d) => sum + d.valuation, 0);
  tooltip.value = {
    show: true,
    x: event.clientX + 10,
    y: event.clientY + 10,
    data: {
      ...leaf.data,
      ratio: (leaf.data.valuation / totalValuation) * 100
    }
  };
};

const hideTooltip = () => {
  tooltip.value.show = false;
};

let ro;
onMounted(() => {
  updateDimensions();
  ro = new ResizeObserver(() => {
    updateDimensions();
  });
  if (container.value) {
    ro.observe(container.value);
  }
});

onUnmounted(() => {
  if (ro) ro.disconnect();
});
</script>

<style scoped>
.treemap-container {
  width: 100%;
  position: relative;
  background: var(--surface-elevated);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-treemap-message {
  color: var(--muted);
  font-size: 0.9rem;
  text-align: center;
}

.stock-tile {
  position: absolute;
  box-sizing: border-box;
  padding: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow: hidden;
  cursor: help;
  transition: opacity 0.2s;
  color: #fff;
  text-shadow: 0 1px 2px rgb(2 6 23 / 0.28);
}

.stock-tile:hover {
  filter: brightness(1.1);
}

.tile-label-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.tile-symbol {
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.8;
}

.tile-change {
  font-weight: bold;
}

.mosaic-blur {
  filter: blur(6px);
  transition: filter 0.2s;
  user-select: none;
}

.is-positive {
  color: #22c55e;
}

.is-negative {
  color: #f87171;
}
</style>
