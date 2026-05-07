import type { VscodePreset } from '../types';

export const electronVueVscode: VscodePreset = {
   name: 'electron-vue',
   description: 'VSCode config for Vue 3 + Electron',

   settings: () => ({
      // ===== Editor Preferences =====
      'editor.tabSize': 2,
      'editor.detectIndentation': false,
      'editor.insertSpaces': true,
      'editor.renderWhitespace': 'selection',
      'editor.guides.indentation': true,
      'editor.defaultFormatter': 'esbenp.prettier-vscode',
      'editor.formatOnSave': true,
      'editor.codeActionsOnSave': {
         'source.fixAll.eslint': 'explicit',
         'source.fixAll.stylelint': 'explicit',
         'source.organizeImports': 'never',
      },
      'editor.cursorBlinking': 'expand',
      'editor.cursorSmoothCaretAnimation': 'on',
      'editor.largeFileOptimizations': true,
      'editor.inlineSuggest.enabled': true,
      'editor.suggestSelection': 'recentlyUsedByPrefix',
      'editor.acceptSuggestionOnEnter': 'smart',
      'editor.bracketPairColorization.enabled': true,
      'editor.autoClosingBrackets': 'beforeWhitespace',
      'editor.autoClosingOvertype': 'always',

      // ===== TypeScript =====
      'js/ts.inlayHints.enumMemberValues.enabled': true,
      'js/ts.preferences.preferTypeOnlyAutoImports': true,
      'js/ts.preferences.includePackageJsonAutoImports': 'on',
      'js/ts.preferences.importModuleSpecifier': 'relative',
      'js/ts.suggest.autoImports': true,
      'js/ts.tsserver.exclude': ['**/node_modules', '**/dist', '**/.turbo'],
      'js/ts.tsdk.path': 'node_modules/typescript/lib',

      // ===== Language-specific Formatting =====
      '[html]': { 'editor.defaultFormatter': 'esbenp.prettier-vscode' },
      '[css]': { 'editor.defaultFormatter': 'esbenp.prettier-vscode' },
      '[scss]': { 'editor.defaultFormatter': 'esbenp.prettier-vscode' },
      '[typescript]': {
         'editor.defaultFormatter': 'esbenp.prettier-vscode',
         'editor.formatOnSave': true,
      },
      '[javascript]': {
         'editor.defaultFormatter': 'esbenp.prettier-vscode',
         'editor.formatOnSave': true,
      },
      '[json]': { 'editor.defaultFormatter': 'esbenp.prettier-vscode' },
      '[vue]': { 'editor.defaultFormatter': 'esbenp.prettier-vscode' },

      // ===== Terminal =====
      'terminal.integrated.cursorBlinking': true,
      'terminal.integrated.tabs.enabled': true,
      'terminal.integrated.scrollback': 10000,

      // ===== File Exclusion =====
      'files.watcherExclude': {
         '**/.git/objects/**': true,
         '**/.git/subtree-cache/**': true,
         '**/.vscode/**': true,
         '**/node_modules/**': true,
         '**/tmp/**': true,
         '**/dist/**': true,
         '**/release/**': true,
         '**/out/**': true,
         '**/pnpm-lock.yaml': true,
         '**/package-lock.json': true,
         '**/bun.lock': true,
         '**/yarn.lock': true,
      },
      'search.exclude': {
         '**/node_modules': true,
         '**/*.log': true,
         '**/*.log*': true,
         '**/dist': true,
         '**/release': true,
         '**/out': true,
         '**/.git': true,
         '**/.vscode': false,
         '**/tmp': true,
         node_modules: true,
         '**/pnpm-lock.yaml': true,
         '**/package-lock.json': true,
         '**/bun.lock': true,
         '**/yarn.lock': true,
      },

      // ===== File Nesting =====
      'explorer.fileNesting.enabled': true,
      'explorer.fileNesting.expand': false,
      'explorer.fileNesting.patterns': {
         'package.json':
            'pnpm-lock.yaml,yarn.lock,bun.lock, .gitignore, .browserslistrc, .npmrc, cspell.json,README.md, LICENSE*,.editorconfig',
         'eslint.config.mjs': '.prettierignore, .prettierrc, .prettierrc.json, .editorconfig',
         'tsconfig.json': 'tsconfig.*.json',
         'tailwind.config.js': 'postcss.config.js',
         'vite.config.{js,ts}': 'vite.*.{js,ts}',
         '.env': '.env.*',
         'vite.renderer.config.ts': 'vite.*.config.ts',
         'forge.config.ts': 'forge.env.d.ts',
      },

      // ===== ESLint =====
      'eslint.validate': [
         'javascript',
         'typescript',
         'javascriptreact',
         'typescriptreact',
         'vue',
         'html',
         'markdown',
         'json',
         'jsonc',
         'json5',
      ],

      // ===== Stylelint =====
      'stylelint.enable': true,
      'stylelint.packageManager': 'pnpm',
      'stylelint.validate': ['css', 'scss', 'vue'],
      'stylelint.customSyntax': 'postcss-html',
      'stylelint.snippet': ['css', 'scss', 'vue'],
      'css.validate': false,
      'less.validate': false,
      'scss.validate': false,

      // ===== CSpell =====
      'cSpell.language': 'en',

      // ===== Package Manager =====
      'npm.packageManager': 'pnpm',
   }),

   extensions: () => [
      'vue.volar',
      'dbaeumer.vscode-eslint',
      'esbenp.prettier-vscode',
      'stylelint.vscode-stylelint',
      'mrmlnc.vscode-scss',
      'streetsidesoftware.code-spell-checker',
      'editorconfig.editorconfig',
   ],
};
