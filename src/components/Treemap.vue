<template>
  <div ref="container" class="treemap-container">
    <svg ref="svg" :width="width" :height="height"></svg>
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
import { ref, onMounted, watch, onUnmounted } from 'vue';
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
const svg = ref(null);
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

const getPriceChangeClass = (change) => {
  if (change > 0) return 'text-up';
  if (change < 0) return 'text-down';
  return '';
};

const updateDimensions = () => {
  if (container.value) {
    width.value = container.value.clientWidth;
    height.value = Math.max(400, window.innerHeight * 0.7);
  }
};

const colorScale = d3.scaleLinear()
  .domain([-3, 0, 3])
  .range(['#ef4444', '#334155', '#22c55e'])
  .clamp(true);

const getTextColor = (d) => {
  return '#fff';
};

const renderTreemap = () => {
  if (!props.data || props.data.length === 0) return;

  const totalValuation = props.data.reduce((sum, d) => sum + d.valuation, 0);

  const root = d3.hierarchy({ children: props.data })
    .sum(d => d.valuation)
    .sort((a, b) => b.value - a.value);

  d3.treemap()
    .size([width.value, height.value])
    .padding(1)
    (root);

  const svgElement = d3.select(svg.value);
  svgElement.selectAll('*').remove();

  const leaf = svgElement.selectAll('g')
    .data(root.leaves())
    .join('g')
    .attr('transform', d => `translate(${d.x0},${d.y0})`);

  leaf.append('rect')
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0))
    .attr('fill', d => colorScale(d.data.change))
    .on('mousemove', (event, d) => {
      tooltip.value = {
        show: true,
        x: event.clientX + 10,
        y: event.clientY + 10,
        data: {
          ...d.data,
          ratio: (d.data.valuation / totalValuation) * 100
        }
      };
    })
    .on('mouseleave', () => {
      tooltip.value.show = false;
    });

  leaf.append('foreignObject')
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0))
    .attr('pointer-events', 'none')
    .append('xhtml:div')
    .attr('class', 'tile-content')
    .style('width', d => `${Math.max(0, d.x1 - d.x0)}px`)
    .style('height', d => `${Math.max(0, d.y1 - d.y0)}px`)
    .style('color', d => getTextColor(d))
    .html(d => {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        if (w < 30 || h < 20) return '';

        // Dynamic font size logic
        const area = w * h;
        const side = Math.min(w, h);
        const fontSize = Math.max(8, Math.min(side / 4.5, w / 8, 36));

        return `
          <div class="tile-label-container" style="font-size: ${fontSize}px; padding: 4px;">
            <div class="stock-tile-name" style="font-size: ${fontSize}px;">${d.data.name}</div>
            <div class="tile-symbol" style="font-size: ${fontSize * 0.7}px; opacity: 0.8;">${d.data.symbol}</div>
            <div class="tile-change" style="font-size: ${fontSize * 0.8}px; font-weight: bold;">${d.data.change > 0 ? '+' : ''}${d.data.change.toFixed(2)}%</div>
          </div>
        `;
    });
};

onMounted(() => {
  updateDimensions();
  renderTreemap();
  window.addEventListener('resize', () => {
    updateDimensions();
    renderTreemap();
  });
});

watch(() => props.data, renderTreemap, { deep: true });
watch([width, height], renderTreemap);

onUnmounted(() => {
  window.removeEventListener('resize', updateDimensions);
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
}

.tile-content {
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  overflow: hidden;
  text-align: center;
  text-shadow: 0 1px 2px rgb(2 6 23 / 0.28);
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
