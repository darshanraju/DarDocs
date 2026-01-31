/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Root-level config for vitest only (app dev/build uses apps/web/vite.config.ts)
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@dardocs/core': path.resolve(__dirname, 'packages/core/src'),
      '@dardocs/editor': path.resolve(__dirname, 'packages/editor/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./apps/web/src/test/setup.ts'],
    include: [
      'packages/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'apps/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
