import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ mode }) => ({
  server: {
    host: true, // allow external access
    port: 8080,
    hmr: false,
    allowedHosts: [
      'september-offshore-allows-finances.trycloudflare.com', // <-- add your ngrok domain here
    ],
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}));
