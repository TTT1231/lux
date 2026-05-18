import { composeLintStaged } from '../../core/shared';
import type { DepsRegistry, FmtPreset } from '../types';
import depsData from './uniapp/deps.json';

const deps = depsData as DepsRegistry;

const lintStagedFragments = {
   eslint: {
      '*.{ts,js,vue}': ['eslint --fix'],
   },
   prettier: {
      '*.{ts,js,vue}': ['prettier --write'],
      '*.{css,scss,vue}': ['prettier --write'],
   },
   stylelint: {
      '*.{css,scss,vue}': ['stylelint --fix'],
   },
};

export const uniappFmt: FmtPreset = {
   name: 'uniapp',
   description: 'Vue 3 + UniApp WeChat mini program',

   eslint: () => `import withVue from '@vue/eslint-config-typescript'
import prettierConfig from '@vue/eslint-config-prettier/skip-formatting'
import pluginVue from 'eslint-plugin-vue'

export default [
  {
    ignores: ['node_modules/', '<lockfile>', 'dist/', 'unpackage/'],
  },
  ...pluginVue.configs['flat/recommended'],
  ...withVue(),
  prettierConfig,
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
]
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
unpackage/
coverage/
`,

   stylelint: () => `export default {
  plugins: ['stylelint-order', '@stylistic/stylelint-plugin'],
  extends: [
    'stylelint-config-standard-scss',
    'stylelint-config-recess-order',
  ],
  overrides: [
    {
      files: ['**/*.vue'],
      customSyntax: 'postcss-html',
    },
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
unpackage/
`,

   cspell: () =>
      JSON.stringify(
         {
            $schema: 'https://raw.githubusercontent.com/streetsidesoftware/cspell/main/cspell.schema.json',
            version: '0.2',
            language: 'en,en-US',
            allowCompoundWords: true,
            words: ['vite', 'pinia', 'vueuse', 'unplugin', 'uniapp'],
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
      stylelint:
         'stylelint "src/**/*.{css,scss,vue}" --cache --cache-strategy content --cache-location node_modules/.cache/stylelint/',
      'stylelint:fix':
         'stylelint "src/**/*.{css,scss,vue}" --fix --cache --cache-strategy content --cache-location node_modules/.cache/stylelint/',
      cspell: 'cspell --cache --cache-location node_modules/.cache/cspell --gitignore "src/**/*"',
      'type:check': 'vue-tsc --noEmit',
      format: 'prettier --write "src/**/*.{ts,js,json,vue,css,scss}"',
      'lint-staged': 'lint-staged',
   },

   lintStagedFragments,

   husky: ({ lintStaged }) => {
      if (lintStaged) {
         return '<pmx> lint-staged\n';
      }
      return '<pm> lint\n';
   },

   lintStaged: ({ stylelint }) => {
      const composed = composeLintStaged(lintStagedFragments, { stylelint });
      return JSON.stringify(composed, null, 2) + '\n';
   },
};
