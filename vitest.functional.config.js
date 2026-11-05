import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// These tests need the isolated test database, so they do not run with the fast form tests.
export default defineConfig({
  root: 'client',
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globalSetup: '../tests/functional-setup.js',
    include: ['src/**/*.functional.test.js']
  }
});
