import { defineConfig } from 'astro/config';
import path from 'node:path';

/**
 * The x2t WASM ships as brotli bytes under its `.wasm.br` name so the browser
 * decodes it at the network layer and `instantiateStreaming` compiles it
 * straight off the response. Astro's dev/preview servers would hand the
 * compressed bytes over unlabelled, so declare the encoding the same way
 * `public/_headers`, `sws.toml` and Cloudflare Pages do.
 */
const BROTLI_ASSETS = ['/sdkjs/common/wasm/x2t/x2t.wasm.br'];

const precompressedAssets = () => ({
  name: 'precompressed-assets',
  hooks: {
    'astro:config:setup': ({ updateConfig }) => {
      updateConfig({
        vite: {
          plugins: [
            {
              name: 'precompressed-assets-middleware',
              configureServer(server) {
                server.middlewares.use((req, res, next) => {
                  const pathname = req.url ?? '/';
                  if (BROTLI_ASSETS.some((asset) => pathname.split('?')[0] === asset)) {
                    res.setHeader('Content-Encoding', 'br');
                    res.setHeader('Content-Type', 'application/octet-stream');
                  }
                  next();
                });
              },
            },
          ],
        },
      });
    },
  },
});

/**
 * `/` `/home` `/history` `/editor` as files.
 *
 * Cloudflare Pages, static-web-server and the E2E preview server all resolve
 * an extensionless URL to `<name>.html`, which is the shape the app's own URLs
 * (and the service worker's route table) have always used.
 */
export default defineConfig({
  site: 'https://office.inled.es',
  publicDir: 'public',
  srcDir: './src',
  // E2E runs on a second port must not share the output directory with the
  // first one (its build would be overwritten mid-serve).
  outDir: process.env.ASTRO_OUT_DIR ?? './dist',
  build: {
    format: 'file',
    // Keep hashed assets under /assets/ so public/sw.js (isHashedAsset) and
    // public/_headers keep addressing them.
    assets: 'assets',
  },
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  integrations: [precompressedAssets()],
  vite: {
    resolve: {
      alias: {
        '@': path.resolve('./'),
      },
    },
  },
});
