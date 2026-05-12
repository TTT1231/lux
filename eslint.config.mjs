import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
   {
      ignores: ['eslint.config.mjs', 'dist/', 'vitest.config.ts', 'tsup.config.ts', '.trees/', 'bun.lock', 'bun.lockb', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'scripts/'],
   },
   eslint.configs.recommended,
   ...tseslint.configs.recommended,
   eslintPluginPrettierRecommended,
   {
      files: ['src/**/*.ts'],
      languageOptions: {
         sourceType: 'module',
         parserOptions: {
            projectService: true,
            tsconfigRootDir: __dirname,
         },
      },
   },
   {
      files: ['scripts/**/*.ts', 'tests/**/*.ts'],
      languageOptions: {
         sourceType: 'module',
      },
   },
   {
      rules: {
         '@typescript-eslint/no-explicit-any': 'warn',
         '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      },
   },
);
