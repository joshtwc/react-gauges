import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

// Library build: ESM + CJS bundles and one bundled declaration file.
// scripts/postbuild.mjs then adds the CommonJS twin (index.d.cts) and tailwind.css.
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.*'],
      tsconfigPath: './tsconfig.json',
      bundleTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        // Every gauge uses hooks, so mark the bundle as client code for React Server Components (Next.js App Router).
        banner: "'use client';",
      },
    },
    sourcemap: true,
    minify: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
