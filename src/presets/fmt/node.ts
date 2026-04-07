import type { FmtPreset } from '../types'


export const nodeFmt: FmtPreset = {
  name: 'node',
  description: 'Node.js CLI / scripts',

  eslint: () => `// @ts-check
import eslint from '@eslint/js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
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

  prettier: () => JSON.stringify({
    semi: true,
    trailingComma: 'all',
    singleQuote: true,
    printWidth: 100,
    tabWidth: 3,
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
  }, null, 2) + '\n',

  prettierIgnore: () => `# Dependencies
node_modules/
pnpm-lock.yaml
package-lock.json

# Build outputs
dist/
build/
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

  // No stylelint for node projects
  stylelint: undefined,
  stylelintIgnore: undefined,

  cspell: () => JSON.stringify({
    $schema: 'https://raw.githubusercontent.com/streetsidesoftware/cspell/main/cspell.schema.json',
    version: '0.2',
    language: 'en,en-US',
    allowCompoundWords: true,
    words: [],
    ignorePaths: [
      '/node_modules/',
      '/dist/',
      'pnpm-lock.yaml',
      '*.log',
      '*.test.ts',
      '*.spec.ts',
      '/__tests__/',
      '*.svg',
      '*.png',
    ],
  }, null, 2) + '\n',

  editorconfig: () => `root = true

[*]
charset = utf-8
indent_style = space
indent_size = 3
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
    'lint': 'eslint .',
    'lint:fix': 'eslint "src/**/*.{js,ts}" --fix',
    'format': 'prettier --write "src/**/*.{ts,js,json}"',
    'format:check': 'prettier --check "src/**/*.{ts,js,json}"',
    'cspell': 'cspell "src/**/*.{ts,js}"',
    'type:check': 'tsc --noEmit',
    'code:check': '<pm> lint && <pm> format:check',
    'code:fix': '<pm> lint:fix && <pm> format',
    'code:check:all': '<pm> lint && <pm> format:check && <pm> cspell',
    'code:fix:all': '<pm> lint:fix && <pm> format',
  },
}
