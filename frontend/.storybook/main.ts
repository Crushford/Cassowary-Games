import path from 'path';

const config = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  // During CI builds, static files are copied manually via `cp -rp` to avoid a
  // Node 20 race condition in fs.cp where parallel mkdir calls throw EEXIST.
  // Set STORYBOOK_SKIP_STATIC=1 (see build-storybook script) to skip this copy;
  // leave it unset for local dev so storybook dev serves static assets normally.
  staticDirs: process.env.STORYBOOK_SKIP_STATIC === '1' ? [] : ['../public'],
  outDir: 'dist/storybook-static',
  async viteFinal(config, { configType }) {
    // Mirror project Vite config for aliases and defines
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve?.alias || {}),
      '@': path.resolve(__dirname, '../src'),
    };

    // Carry over any define values used in app build that stories may import
    config.define = {
      ...(config.define || {}),
      'import.meta.env.VITE_PAGES_URL': JSON.stringify(process.env.CI_PAGES_URL || ''),
    };

    // Loosen fs boundary just in case stories import from root-level paths
    config.server = {
      ...(config.server || {}),
      fs: { ...(config.server?.fs || {}), strict: false },
    };

    return config;
  },
};
export default config;
