import { defineConfig } from 'tsup';

export default defineConfig({
   entry: ['src/index.ts'],
   format: ['esm'],
   target: 'node18',
   outDir: 'dist',
   clean: true,
   splitting: false,
   sourcemap: process.env.NODE_ENV !== 'production',
   dts: false,
   banner: {
      js: '#!/usr/bin/env node',
   },
});
