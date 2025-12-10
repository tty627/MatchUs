import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 监听所有网络接口
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4040',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4040',
        changeOrigin: true,
      },
    },
  },
});
