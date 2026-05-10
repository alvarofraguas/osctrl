import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    port: 5173,
    proxy: {
      '/login':           { target: 'http://localhost:9001', changeOrigin: false },
      '/logout':          { target: 'http://localhost:9001', changeOrigin: false },
      '/json':            { target: 'http://localhost:9001', changeOrigin: false },
      '/paginated-json':  { target: 'http://localhost:9001', changeOrigin: false },
      '/environment':     { target: 'http://localhost:9001', changeOrigin: false },
      '/ui/api':          { target: 'http://localhost:9001', changeOrigin: false }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    passWithNoTests: true
  }
});
