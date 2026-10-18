import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Relative base so the build works on GitHub Pages (user site or project
// site), Netlify or a plain folder without changing anything.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: { input: { main: resolve(__dirname, 'index.html'), card: resolve(__dirname, 'card.html'), printCard: resolve(__dirname, 'print-card.html') } },
  },
});
