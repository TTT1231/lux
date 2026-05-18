import { composeLintStaged } from '../../core/shared';
import type { DepsRegistry, FmtPreset } from '../types';
import depsData from './node/deps.json';

const deps = depsData as DepsRegistry;

const lintStagedFragments = {
   eslint: {
      '*.{ts,js}': ['eslint --fix'],
   },
   prettier: {
      '*.{ts,js}': ['prettier --write'],
   },
};

export const nodeFmt: FmtPreset = {
   name: 'node',
   description: 'Node.js CLI / scripts',

   eslint: () => `// @ts-check
import eslint from '@eslint/js'
import { defineConfig } from 'eslint/config'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: ['node_modules/', '<lockfile>', 'eslint.config.mjs', 'dist/'],
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
)
`,

   prettier: () =>
      JSON.stringify(
         {
            semi: true,
            trailingComma: 'all',
            singleQuote: true,
            printWidth: 100,
            tabWidth: 2,
            useTabs: false,
            quoteProps: 'as-needed',
            jsxSingleQuote: true,
            bracketSpacing: true,
            bracketSameLine: false,
            arrowParens: 'avoid',
            endOfLine: 'lf',
            proseWrap: 'preserve',
            htmlWhitespaceSensitivity: 'css',
            embeddedLanguageFormatting: 'auto',
         },
         null,
         2,
      ) + '\n',

   prettierIgnore: () => `node_modules/
<lockfile>
dist/
build/
coverage/
`,

   // No stylelint for node projects

   cspell: () =>
      JSON.stringify(
         {
            version: '0.2',
            language: 'en,en-US',
            allowCompoundWords: true,
            words: [],
            ignorePaths: ['**/*.svg', '**/*.png'],
         },
         null,
         2,
      ) + '\n',

   editorconfig: () => `root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
`,

   deps,

   scripts: {
      eslint: 'eslint . --cache --cache-location node_modules/.cache/eslint',
      'eslint:fix': 'eslint . --cache --cache-location node_modules/.cache/eslint --fix',
      cspell: 'cspell --cache --cache-location node_modules/.cache/cspell --gitignore "src/**/*"',
      'type:check': 'tsc --noEmit',
      format: 'prettier --write "src/**/*.{ts,js,json}"',
      'lint-staged': 'lint-staged',
   },

   lintStagedFragments,

   husky: ({ lintStaged }) => {
      if (lintStaged) {
         return '<pmx> lint-staged\n';
      }
      return '<pm> type:check\n';
   },

   lintStaged: ({ stylelint }) => {
      const composed = composeLintStaged(lintStagedFragments, { stylelint });
      return JSON.stringify(composed, null, 2) + '\n';
   },
};
