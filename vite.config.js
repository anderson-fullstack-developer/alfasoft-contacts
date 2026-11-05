import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const API_SERVER = 'http://localhost:3000';

export default defineConfig({
  root: 'client',
  plugins: [vue()],
  build: {
    outDir: fileURLToPath(new URL('./public', import.meta.url)),
    emptyOutDir: true
  },
  server: {
    // The form imports the validation rules from outside client/.
    fs: { allow: ['..'] },
    proxy: {
      '/auth': API_SERVER,
      '/contacts': API_SERVER,
      '/uploads': API_SERVER
    }
  },
  test: {
    environment: 'happy-dom'
  }
});
