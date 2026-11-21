import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/ws': {
        target: `ws://localhost:${process.env.PORT ?? 4001}`,
        ws: true,
      },
    },
  },
});
