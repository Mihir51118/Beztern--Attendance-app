// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow external connections
    port: 5173,
    // Remove https: true for now
    open: false,
    historyApiFallback: {
      disableDotRule: true,
      rewrites: [
        { from: /^\/auth\/callback/, to: '/index.html' },
        { from: /./, to: '/index.html' }
      ]
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
