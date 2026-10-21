// Runs after `vite build`. Cross-platform (no shell `cp`).
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const dts = 'dist/index.d.ts';
if (!existsSync(dts)) throw new Error(`${dts} was not generated`);

// CommonJS consumers need their own declaration file, or TypeScript treats the
// types as ESM under "moduleResolution": "node16" / "nodenext".
writeFileSync('dist/index.d.cts', readFileSync(dts, 'utf8'));

// Tailwind v4 utilities, exported as "@joshtwc/react-gauges/tailwind.css".
copyFileSync('src/tailwind.css', 'dist/tailwind.css');

console.log('postbuild: wrote dist/index.d.cts and dist/tailwind.css');
