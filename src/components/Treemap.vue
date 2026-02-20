<template>
  <div ref="container" class="treemap-container">
    <svg ref="svg" :width="width" :height="height"></svg>
    <div v-if="tooltip.show" class="tooltip" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
      <div class="tooltip-name">{{ tooltip.data.name }} ({{ tooltip.data.symbol }})</div>
      <div class="tooltip-row">
        <span>評価額:</span>
        <span :class="{ 'mosaic-blur': isMosaic }">¥{{ formatNumber(tooltip.data.valuation) }}</span>
      </div>
      <div class="tooltip-row">
        <span>比率:</span>
        <span>{{ tooltip.data.ratio.toFixed(2) }}%</span>
      </div>
      <div class="tooltip-row">
        <span>前日比:</span>
        <span :class="getPriceChangeClass(tooltip.data.change)">{{ tooltip.data.change.toFixed(2) }}%</span>
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
  .range(['#ff4d4f', '#f0f0f0', '#52c41a'])
  .clamp(true);

const getTextColor = (d) => {
  const c = colorScale(d.data.change);
  const rgb = d3.rgb(c);
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? '#000' : '#fff';
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
          <div class="tile-label-container" style="font-size: ${fontSize}px;">
            <div class="tile-name" style="font-size: ${fontSize}px;">${d.data.name}</div>
            <div class="tile-symbol" style="font-size: ${fontSize * 0.7}px;">${d.data.symbol}</div>
            <div class="tile-change" style="font-size: ${fontSize * 0.8}px;">${d.data.change > 0 ? '+' : ''}${d.data.change.toFixed(2)}%</div>
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
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.tile-content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px;
  box-sizing: border-box;
  overflow: hidden;
  text-align: center;
}

.tile-label-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.tile-name {
  width: 100%;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-symbol {
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.9;
}

.tile-change {
  font-weight: bold;
}

.tooltip {
  position: fixed;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #d9d9d9;
  padding: 10px;
  border-radius: 4px;
  pointer-events: none;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  font-size: 14px;
}

.tooltip-name {
  font-weight: bold;
  margin-bottom: 5px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 5px;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 2px;
}

.text-up {
  color: #52c41a;
  font-weight: bold;
}

.text-down {
  color: #ff4d4f;
  font-weight: bold;
}

.mosaic-blur {
  filter: blur(6px);
  transition: filter 0.2s;
  user-select: none;
}
</style>
