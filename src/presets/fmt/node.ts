import type { FmtPreset } from '../types';

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
    ignores: ['eslint.config.mjs', 'dist/'],
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
            $schema:
               'https://raw.githubusercontent.com/streetsidesoftware/cspell/main/cspell.schema.json',
            version: '0.2',
            language: 'en,en-US',
            allowCompoundWords: true,
            words: [],
            ignorePaths: ['*.svg', '*.png'],
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

   dependencies: {
      dev: [
         '@eslint/js',
         'eslint',
         'typescript-eslint',
         'eslint-plugin-prettier',
         'eslint-config-prettier',
         'prettier',
         'cspell',
      ],
   },

   scripts: {
      lint: 'eslint . --cache --cache-location node_modules/.cache/eslint && cspell --cache --cache-location node_modules/.cache/cspell --gitignore "src/**/*" && tsc --noEmit',
      'lint:fix': 'eslint . --cache --cache-location node_modules/.cache/eslint --fix',
      format: 'prettier --write "src/**/*.{ts,js,json}"',
   },
};
