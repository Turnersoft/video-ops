import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname, 'web'),
  base: '/',
  build: {
    outDir: path.join(__dirname, '../outdoor_agent/web'),
    emptyOutDir: false,
    assetsDir: 'app',
    rollupOptions: {
      input: path.join(__dirname, 'web/index.html'),
    },
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'react-native-webview': path.join(__dirname, 'src/shims/empty-webview.ts'),
      'expo-video': path.join(__dirname, 'src/shims/empty-expo-video.ts'),
    },
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.jsx', '.web.js', '.jsx', '.js'],
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8788',
    },
  },
});
