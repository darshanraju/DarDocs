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
})
