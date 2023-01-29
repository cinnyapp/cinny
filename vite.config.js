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

const nodePolyfillAliases = {
  util: 'rollup-plugin-node-polyfills/polyfills/util',
  sys: 'util',
  // events: 'rollup-plugin-node-polyfills/polyfills/events',
  stream: 'rollup-plugin-node-polyfills/polyfills/stream',
  path: 'rollup-plugin-node-polyfills/polyfills/path',
  querystring: 'rollup-plugin-node-polyfills/polyfills/qs',
  punycode: 'rollup-plugin-node-polyfills/polyfills/punycode',
  url: 'rollup-plugin-node-polyfills/polyfills/url',
  string_decoder:
      'rollup-plugin-node-polyfills/polyfills/string-decoder',
  http: 'rollup-plugin-node-polyfills/polyfills/http',
  https: 'rollup-plugin-node-polyfills/polyfills/http',
  os: 'rollup-plugin-node-polyfills/polyfills/os',
  assert: 'rollup-plugin-node-polyfills/polyfills/assert',
  constants: 'rollup-plugin-node-polyfills/polyfills/constants',
  _stream_duplex:
      'rollup-plugin-node-polyfills/polyfills/readable-stream/duplex',
  _stream_passthrough:
      'rollup-plugin-node-polyfills/polyfills/readable-stream/passthrough',
  _stream_readable:
      'rollup-plugin-node-polyfills/polyfills/readable-stream/readable',
  _stream_writable:
      'rollup-plugin-node-polyfills/polyfills/readable-stream/writable',
  _stream_transform:
      'rollup-plugin-node-polyfills/polyfills/readable-stream/transform',
  timers: 'rollup-plugin-node-polyfills/polyfills/timers',
  console: 'rollup-plugin-node-polyfills/polyfills/console',
  vm: 'rollup-plugin-node-polyfills/polyfills/vm',
  zlib: 'rollup-plugin-node-polyfills/polyfills/zlib',
  tty: 'rollup-plugin-node-polyfills/polyfills/tty',
  domain: 'rollup-plugin-node-polyfills/polyfills/domain',
  buffer: 'rollup-plugin-node-polyfills/polyfills/buffer-es6',
  process: 'rollup-plugin-node-polyfills/polyfills/process-es6'
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
  resolve: {
    alias: nodePolyfillAliases
  },
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
        rollupNodePolyFill({ crypto: true }),
      ]
    }
  },
});
