import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'public',
    assetsDir: 'assets',
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
