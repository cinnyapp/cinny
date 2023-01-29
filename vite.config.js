import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { wasm } from '@rollup/plugin-wasm';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import rollupNodePolyFill from 'rollup-plugin-node-polyfills'
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
  define: {
    global: "globalThis",
  },
  plugins: [
    viteStaticCopy(copyFiles),
    svgLoader(),
    wasm(),
    react(),
  ],
  optimizeDeps: {
    esbuildOptions: {
        define: {
          global: 'globalThis'
        },
        plugins: [
          // Enable esbuild polyfill plugins
          NodeGlobalsPolyfillPlugin({
            process: false,
            buffer: true,
          }),
        ]
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    copyPublicDir: false,
    rollupOptions: {
      plugins: [
        // Enable rollup polyfills plugin
        // used during production bundling
        rollupNodePolyFill(),
      ]
    }
  },
});
