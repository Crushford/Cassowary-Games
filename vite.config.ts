import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

// Get the base URL from GitLab Pages URL or default to root
const base = process.env.CI_PAGES_URL ? new URL(process.env.CI_PAGES_URL).pathname : '/';

// https://vitejs.dev/config/
export default defineConfig({
  base,
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
});
