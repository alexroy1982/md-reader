/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  // 中间产物放 .build/web，根目录 dist/ 保留给最终交付物（见 scripts/copy-dist.mjs）
  build: { chunkSizeWarningLimit: 3000, outDir: '.build/web' },
  test: { environment: 'jsdom', css: true },
})
