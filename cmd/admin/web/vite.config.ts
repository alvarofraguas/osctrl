import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit(), svelteTesting()],
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
    passWithNoTests: true,
    exclude: [...configDefaults.exclude, 'tests/e2e/**']
  }
});
