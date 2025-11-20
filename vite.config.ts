import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(() => ({
  server: {
    host: true, // allow external access
    port: 8080,
    hmr: {
      protocol: 'ws',       // WebSocket for hot reload
      host: 'localhost',    // your local dev host
    },
    watch: {
      usePolling: true,     // ensures reliable detection of changes (especially for pnpm)
    },
    allowedHosts: [
      'create-remains-reviews-knee.trycloudflare.com', // external domain
    ],
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // your @ alias for src/
    },
  },
}));
