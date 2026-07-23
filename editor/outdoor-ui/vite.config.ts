import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rnWeb = path.resolve(__dirname, 'node_modules/react-native-web');

const uiPort = Number(process.env.OUTDOOR_UI_PORT || 5173);
const agentProxyPort = Number(
  process.env.AGENT_INTERNAL_PORT || process.env.AGENT_PORT || 8788,
);

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Keep .web.js resolution for SafeAreaProvider (prebundle pulls native specs otherwise).
    exclude: ['react-native-safe-area-context'],
  },
  root: path.join(__dirname, 'web'),
  base: '/',
  build: {
    outDir: path.join(__dirname, '../outdoor_agent/web'),
    emptyOutDir: false,
    assetsDir: 'app',
    sourcemap: true,
    rollupOptions: {
      input: path.join(__dirname, 'web/index.html'),
    },
  },
  resolve: {
    alias: [
      {
        find: 'react-native/Libraries/Utilities/codegenNativeComponent',
        replacement: path.join(__dirname, 'src/shims/codegen-native-component.ts'),
      },
      { find: 'react-native', replacement: rnWeb },
      {
        find: 'react-native-webview',
        replacement: path.join(__dirname, 'src/shims/empty-webview.ts'),
      },
      {
        find: 'expo-video',
        replacement: path.join(__dirname, 'src/shims/empty-expo-video.ts'),
      },
    ],
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.jsx', '.web.js', '.jsx', '.js'],
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
  server: {
    host: process.env.OUTDOOR_UI_HOST || '127.0.0.1',
    port: uiPort,
    strictPort: Boolean(process.env.OUTDOOR_UI_PORT),
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${agentProxyPort}`,
        changeOrigin: true,
      },
    },
  },
});
