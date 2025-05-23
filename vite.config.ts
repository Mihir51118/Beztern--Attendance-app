import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: {
      disableDotRule: true,
      rewrites: [
        { from: /^\/auth\/callback/, to: '/index.html' },
        { from: /./, to: '/index.html' }
      ]
    },
    port: 5173
  }
});
