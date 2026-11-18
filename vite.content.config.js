import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Bundles the claude.ai content script as a single self-contained IIFE.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2022',
    lib: {
      entry: fileURLToPath(new URL('./src/content/index.js', import.meta.url)),
      formats: ['iife'],
      name: 'CPBContent',
      fileName: () => 'content.js',
    },
  },
});
