/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'node:url';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'public',
    emptyOutDir: true,
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env.VITE_PAGES_URL': JSON.stringify(process.env.CI_PAGES_URL || ''),
  },
});
