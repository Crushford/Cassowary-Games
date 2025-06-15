import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

function publicPath() {
  if (process.env.CI_PAGES_URL) {
    return new URL(process.env.CI_PAGES_URL).pathname;
  }
  return '/';
}

// https://vitejs.dev/config/
export default defineConfig({
  base: publicPath(),
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
