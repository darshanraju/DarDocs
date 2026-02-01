import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds the webview React app into dist/webview/
export default defineConfig({
  plugins: [react()],
  root: 'src/webview',
  build: {
    outDir: '../../dist/webview',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/webview/main.tsx',
      output: {
        entryFileNames: 'index.js',
        assetFileNames: 'index.[ext]',
      },
    },
  },
});
