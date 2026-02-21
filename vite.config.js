import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/portfolio-treemap/',
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js']
    }
  }
})
