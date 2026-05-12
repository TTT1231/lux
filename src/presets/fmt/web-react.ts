import type { FmtPreset } from '../types';

export const webReactFmt: FmtPreset = {
   name: 'web-react',
   description: 'React Web frontend (Vite + React + TypeScript)',

   eslint: () => `import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  prettierConfig,
)
`,

   prettier: () =>
      JSON.stringify(
         {
            semi: false,
            singleQuote: true,
            tabWidth: 2,
            trailingComma: 'all',
            printWidth: 100,
            endOfLine: 'lf',
         },
         null,
         2,
      ) + '\n',

   prettierIgnore: () => `node_modules/
<lockfile>
dist/
coverage/
`,

   stylelint: () => `export default {
  plugins: ['stylelint-order', '@stylistic/stylelint-plugin'],
  extends: [
    'stylelint-config-standard-scss',
    'stylelint-config-recess-order',
  ],
  rules: {
    'selector-class-pattern': null,
    'scss/dollar-variable-pattern': null,
    'scss/percent-placeholder-pattern': null,
    'scss/at-mixin-pattern': null,
    'order/properties-order': null,
  },
}
`,

   stylelintIgnore: () => `node_modules/
dist/
`,

   cspell: () =>
      JSON.stringify(
         {
            $schema:
               'https://raw.githubusercontent.com/streetsidesoftware/cspell/main/cspell.schema.json',
            version: '0.2',
            language: 'en,en-US',
            allowCompoundWords: true,
            words: ['vite', 'react', 'zustand', 'tanstack'],
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
         'eslint',
         '@eslint/js',
         'typescript-eslint',
         'eslint-plugin-react-hooks',
         'eslint-plugin-react-refresh',
         'eslint-config-prettier',
         'globals',
         'prettier',
         'stylelint',
         'stylelint-config-standard-scss',
         'stylelint-order',
         'stylelint-scss',
         '@stylistic/stylelint-plugin',
         'postcss-scss',
         'cspell',
      ],
   },

   scripts: {
      lint: 'eslint .',
      'lint:fix': 'eslint "src/**/*.{js,ts,jsx,tsx}" --fix',
      format: 'prettier --write "src/**/*.{ts,js,json,jsx,tsx,css,scss}"',
      'format:check': 'prettier --check "src/**/*.{ts,js,json,jsx,tsx,css,scss}"',
      stylelint: 'stylelint "src/**/*.{css,scss}"',
      'stylelint:fix': 'stylelint "src/**/*.{css,scss}" --fix',
      cspell: 'cspell --gitignore "src/**/*"',
      'type:check': 'tsc --noEmit',
      'code:check': '<pm> lint && <pm> format:check',
      'code:fix': '<pm> lint:fix && <pm> format',
      'code:check:all': '<pm> lint && <pm> format:check && <pm> stylelint && <pm> cspell',
      'code:fix:all': '<pm> lint:fix && <pm> format && <pm> stylelint:fix',
   },
};
