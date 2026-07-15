import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      buffer: 'buffer/',
      string_decoder: 'string_decoder/',
    },
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
  },
});
