import type { VscodePreset } from '../types';

export const nodeVscode: VscodePreset = {
   name: 'node',
   description: 'VSCode config for Node.js',

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
      'js/ts.tsserver.exclude': ['**/node_modules', '**/dist'],

      // ===== Language-specific Formatting =====
      '[typescript]': {
         'editor.defaultFormatter': 'esbenp.prettier-vscode',
         'editor.formatOnSave': true,
      },
      '[javascript]': {
         'editor.defaultFormatter': 'esbenp.prettier-vscode',
         'editor.formatOnSave': true,
      },
      '[json]': { 'editor.defaultFormatter': 'esbenp.prettier-vscode' },

      // ===== Terminal =====
      'terminal.integrated.cursorBlinking': true,
      'terminal.integrated.tabs.enabled': true,
      'terminal.integrated.scrollback': 10000,

      // ===== File Exclusion =====
      'files.watcherExclude': {
         '**/.git/objects/**': true,
         '**/.git/subtree-cache/**': true,
         '**/node_modules/**': true,
         '**/tmp/**': true,
         '**/dist/**': true,
         '**/pnpm-lock.yaml': true,
         '**/package-lock.json': true,
         '**/bun.lock': true,
         '**/yarn.lock': true,
      },
      'search.exclude': {
         '**/node_modules': true,
         '**/*.log': true,
         '**/dist': true,
         '**/.git': true,
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
            'pnpm-lock.yaml,yarn.lock,bun.lock, .gitignore, .npmrc, cspell.json,README.md,LICENSE*,.editorconfig',
         'eslint.config.mjs': '.prettierignore, .prettierrc.json, .editorconfig,.prettierrc',
         'tsconfig.json': 'tsconfig.*.json',
         '.env': '.env.*',
      },

      // ===== ESLint =====
      'eslint.validate': ['javascript', 'typescript', 'json', 'jsonc', 'json5'],

      // ===== CSpell =====
      'cSpell.language': 'en',
   }),

   extensions: () => [
      'dbaeumer.vscode-eslint',
      'esbenp.prettier-vscode',
      'streetsidesoftware.code-spell-checker',
      'editorconfig.editorconfig',
   ],
};
