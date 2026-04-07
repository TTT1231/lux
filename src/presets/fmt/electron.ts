import type { FmtPreset } from '../types'

export const electronFmt: FmtPreset = {
  name: 'electron',
  description: 'Vue 3 + Electron desktop app',

  eslint: () => `import withVue from '@vue/eslint-config-typescript'
import withPrettier from '@vue/eslint-config-prettier/skip-formatting'
import pluginVue from 'eslint-plugin-vue'

export default [
  ...pluginVue.configs['flat/recommended'],
  ...withVue(),
  ...withPrettier(),
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
]
`,

  prettier: () => JSON.stringify({
    semi: false,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'all',
    printWidth: 100,
    endOfLine: 'lf',
  }, null, 2) + '\n',

  prettierIgnore: () => `# Dependencies
node_modules/
pnpm-lock.yaml
package-lock.json

# Build outputs
dist/
release/
out/
*.tsbuildinfo

# Logs
*.log
logs/

# Environment files
.env
.env.local
.env.*.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Coverage
coverage/

# Static assets
*.svg
*.png
*.jpg
*.jpeg
*.gif
*.ico
*.woff
*.woff2
*.ttf
*.eot
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

  stylelintIgnore: () => `# Dependencies
node_modules/
pnpm-lock.yaml

# Build outputs
dist/
release/
out/
*.tsbuildinfo

# Logs
*.log

# Environment files
.env
.env.local

# Coverage
coverage/

# Static assets
*.svg
*.png
*.jpg
*.jpeg
*.gif
*.ico
`,

  cspell: () => JSON.stringify({
    $schema: 'https://raw.githubusercontent.com/streetsidesoftware/cspell/main/cspell.schema.json',
    version: '0.2',
    language: 'en,en-US',
    allowCompoundWords: true,
    words: [
      'vite',
      'pinia',
      'vueuse',
      'unplugin',
      'trw',
      'electron',
      'electron-builder',
    ],
    ignorePaths: [
      '/node_modules/',
      '/dist/',
      '/release/',
      'pnpm-lock.yaml',
      '*.log',
      '*.test.ts',
      '*.spec.ts',
      '/coverage/',
      '*.svg',
      '*.png',
    ],
  }, null, 2) + '\n',

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
    'lint': 'eslint .',
    'lint:fix': 'eslint "src/**/*.{js,ts,vue}" --fix',
    'format': 'prettier --write "src/**/*.{ts,js,json,vue,css,scss}"',
    'format:check': 'prettier --check "src/**/*.{ts,js,json,vue,css,scss}"',
    'stylelint': 'stylelint "src/**/*.{css,scss,vue}"',
    'stylelint:fix': 'stylelint "src/**/*.{css,scss,vue}" --fix',
    'cspell': 'cspell "src/**/*.{ts,js,vue}"',
    'type:check': 'vue-tsc --noEmit',
    'code:check': '<pm> lint && <pm> format:check',
    'code:fix': '<pm> lint:fix && <pm> format',
    'code:check:all': '<pm> lint && <pm> format:check && <pm> stylelint && <pm> cspell',
    'code:fix:all': '<pm> lint:fix && <pm> format && <pm> stylelint:fix',
  },
}
