import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { wasm } from '@rollup/plugin-wasm';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import inject from '@rollup/plugin-inject';
import topLevelAwait from 'vite-plugin-top-level-await';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import path from 'path';
import buildConfig from './build.config';

const copyFiles = {
  targets: [
    {
      src: 'node_modules/@element-hq/element-call-embedded/dist/*',
      dest: 'public/element-call',
    },
    {
      src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
      dest: '',
      rename: 'pdf.worker.min.js',
    },
    {
      src: 'netlify.toml',
      dest: '',
    },
    {
      src: 'config.json',
      dest: '',
    },
    {
      src: 'public/manifest.json',
      dest: '',
    },
    {
      src: 'public/res/android',
      dest: 'public/',
    },
    {
      src: 'public/locales',
      dest: 'public/',
    },
  ],
};

function serverMatrixSdkCryptoWasm(wasmFilePath) {
  return {
    name: 'vite-plugin-serve-matrix-sdk-crypto-wasm',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === wasmFilePath) {
          const resolvedPath = path.join(
            path.resolve(),
            '/node_modules/@matrix-org/matrix-sdk-crypto-wasm/pkg/matrix_sdk_crypto_wasm_bg.wasm'
          );

          if (fs.existsSync(resolvedPath)) {
            res.setHeader('Content-Type', 'application/wasm');
            res.setHeader('Cache-Control', 'no-cache');

            const fileStream = fs.createReadStream(resolvedPath);
            fileStream.pipe(res);
          } else {
            res.writeHead(404);
            res.end('File not found');
          }
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  appType: 'spa',
  publicDir: false,
  base: buildConfig.base,
  server: {
    port: 8080,
    host: true,
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
  },
  plugins: [
    serverMatrixSdkCryptoWasm('/node_modules/.vite/deps/pkg/matrix_sdk_crypto_wasm_bg.wasm'),
    topLevelAwait({
      // The export name of top-level await promise for each chunk module
      promiseExportName: '__tla',
      // The function to generate import names of top-level await promise in each chunk module
      promiseImportName: (i) => `__tla_${i}`,
    }),
    viteStaticCopy(copyFiles),
    vanillaExtractPlugin(),
    wasm(),
    react(),
    VitePWA({
      srcDir: 'src',
      filename: 'sw.ts',
      strategies: 'injectManifest',
      injectRegister: false,
      manifest: false,
      injectManifest: {
        injectionPoint: undefined,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  optimizeDeps: {
    // Rebuild dep optimizer cache on each dev start to avoid stale API shapes.
    force: true,
    // Keep matrix-widget-api prebundled so matrix-js-sdk can import its named exports in dev.
    // Force CJS interop for stability across optimizer cache rebuilds.
    include: ['matrix-widget-api'],
    needsInterop: ['matrix-widget-api'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      plugins: [
        // Enable esbuild polyfill plugins
        NodeGlobalsPolyfillPlugin({
          process: false,
          buffer: true,
        }),
      ],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    copyPublicDir: false,
    rollupOptions: {
      plugins: [inject({ Buffer: ['buffer', 'Buffer'] })],
    },
  },
});
