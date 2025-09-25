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
  staticDirs: ['../public'],
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
