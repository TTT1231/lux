import type { FmtPreset } from '../types';

export const webVueFmt: FmtPreset = {
   name: 'web-vue',
   description: 'Vue 3 Web frontend (Vite + Vue + TypeScript)',

   eslint: () => `import withVue from '@vue/eslint-config-typescript'
import prettierConfig from '@vue/eslint-config-prettier/skip-formatting'
import pluginVue from 'eslint-plugin-vue'

export default [
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
`,

   cspell: () =>
      JSON.stringify(
         {
            $schema:
               'https://raw.githubusercontent.com/streetsidesoftware/cspell/main/cspell.schema.json',
            version: '0.2',
            language: 'en,en-US',
            allowCompoundWords: true,
            words: ['vite', 'pinia', 'vueuse', 'unplugin'],
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

   dependencies: {
      dev: [
         'eslint',
         '@vue/eslint-config-typescript',
         '@vue/eslint-config-prettier',
         'eslint-plugin-vue',
         'prettier',
         'stylelint',
         'stylelint-config-standard-scss',
         'stylelint-order',
         'stylelint-scss',
         '@stylistic/stylelint-plugin',
         'postcss-html',
         'postcss-scss',
         'cspell',
      ],
   },

   scripts: {
      lint: 'eslint . --cache --cache-location node_modules/.cache/eslint && cspell --cache --cache-location node_modules/.cache/cspell --gitignore "src/**/*" && vue-tsc --noEmit && stylelint "src/**/*.{css,scss,vue}" --cache --cache-strategy content --cache-location node_modules/.cache/stylelint/',
      'lint:fix':
         'eslint . --cache --cache-location node_modules/.cache/eslint --fix && stylelint "src/**/*.{css,scss,vue}" --fix --cache --cache-strategy content --cache-location node_modules/.cache/stylelint/',
      format: 'prettier --write "src/**/*.{ts,js,json,vue,css,scss}"',
   },
};
