import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Demo / playground app (Tailwind v4). `npm run dev` to explore every gauge.
export default defineConfig({
  root: 'demo',
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: '../demo-dist', emptyOutDir: true },
});
