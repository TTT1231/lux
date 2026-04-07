// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

export default defineConfig(
   {
      ignores: ['eslint.config.mjs', 'dist/', 'vitest.config.ts', 'tsup.config.ts', '.trees/'],
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
            tsconfigRootDir: import.meta.dirname,
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
