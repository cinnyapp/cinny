import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { wasm } from '@rollup/plugin-wasm';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { svgLoader } from './viteSvgLoader';

const copyFiles = {
  targets: [
    {
      src: 'node_modules/@matrix-org/olm/olm.wasm',
      dest: '',
    },
    {
      src: '_redirects',
      dest: '',
    },
    {
      src: 'config.json',
      dest: '',
    },
    {
      src: 'public/res/android',
      dest: 'public/',
    }
  ],
}

export default defineConfig({
  appType: 'spa',
  publicDir: false,
  server: {
    port: 8080,
    host: true,
  },
  plugins: [
    viteStaticCopy(copyFiles),
    svgLoader(),
    wasm(),
    react(),
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
    copyPublicDir: false,
  },
});
