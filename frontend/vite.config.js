import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/summoner-info': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/match-history': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
