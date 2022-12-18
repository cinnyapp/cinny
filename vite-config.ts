import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { wasm } from '@rollup/plugin-wasm';

export default defineConfig({
  appType: 'spa',
  publicDir: false,
  plugins: [wasm(), react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    copyPublicDir: false,
  },
});
