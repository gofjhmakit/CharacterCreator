import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Generates `sw.js` after the bundle is written. The service worker pre-caches every
 * emitted asset so the app works fully offline after the first visit.
 */
function offlineServiceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'offline-service-worker',
    apply: 'build',
    configResolved(cfg) {
      outDir = cfg.build.outDir;
    },
    writeBundle(_opts, bundle) {
      // .woff duplicates are skipped: every browser with service workers supports woff2.
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && !f.endsWith('.woff'));
      const assets = ['./', './index.html', './icon.svg', './manifest.webmanifest', ...files.filter((f) => f !== 'index.html').map((f) => './' + f)];
      const version = Date.now().toString(36);
      const template = readFileSync(fileURLToPath(new URL('./src/sw-template.js', import.meta.url)), 'utf8');
      const sw = template
        .replace('__CACHE_VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(Array.from(new Set(assets))));
      writeFileSync(join(outDir, 'sw.js'), sw);
    },
  };
}

export default defineConfig({
  // Relative base so the build works on GitHub Pages project sites (user.github.io/repo/) and any static host.
  base: './',
  plugins: [react(), offlineServiceWorker()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 3000,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as any);
