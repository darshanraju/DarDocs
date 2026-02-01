/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@dardocs/core': path.resolve(__dirname, '../../packages/core/src'),
      '@dardocs/editor': path.resolve(__dirname, '../../packages/editor/src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3456',
        changeOrigin: true,
      },
      '/agent-ws': {
        target: 'ws://localhost:3457',
        ws: true,
        rewrite: (path) => path.replace(/^\/agent-ws/, '/ws'),
      },
    },
  },
})
