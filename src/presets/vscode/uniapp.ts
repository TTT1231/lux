import type { VscodePreset } from '../types'

export const uniappVscode: VscodePreset = {
  name: 'uniapp',
  description: 'VSCode config for UniApp',

  settings: () => ({
    // ===== 编辑器爱好设置 =====
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

    // ===== TypeScript 专项优化 =====
    'js/ts.inlayHints.enumMemberValues.enabled': true,
    'js/ts.preferences.preferTypeOnlyAutoImports': true,
    'js/ts.preferences.includePackageJsonAutoImports': 'on',
    'js/ts.preferences.importModuleSpecifier': 'relative',
    'js/ts.suggest.autoImports': true,
    'js/ts.tsserver.exclude': ['**/node_modules', '**/dist', '**/unpackage'],
    'js/ts.tsdk.path': 'node_modules/typescript/lib',

    // ===== 语言特定格式化 =====
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

    // ===== 终端配置 =====
    'terminal.integrated.cursorBlinking': true,
    'terminal.integrated.tabs.enabled': true,
    'terminal.integrated.scrollback': 10000,

    // ===== 文件排除 =====
    'files.watcherExclude': {
      '**/.git/objects/**': true,
      '**/.git/subtree-cache/**': true,
      '**/node_modules/**': true,
      '**/tmp/**': true,
      '**/dist/**': true,
      '**/unpackage/**': true,
    },
    'search.exclude': {
      '**/node_modules': true,
      '**/*.log': true,
      '**/dist': true,
      '**/unpackage': true,
      '**/.git': true,
      '**/tmp': true,
      '**/pnpm-lock.yaml': true,
    },

    // ===== 文件嵌套 =====
    'explorer.fileNesting.enabled': true,
    'explorer.fileNesting.expand': false,
    'explorer.fileNesting.patterns': {
      'package.json': 'pnpm-lock.yaml, .gitignore, manifest.json, pages.json',
      'eslint.config.mjs': '.prettierignore, .prettierrc.json',
      'tsconfig.json': 'tsconfig.*.json',
      '.env': '.env.*',
    },

    // ===== ESLint =====
    'eslint.validate': [
      'javascript', 'typescript',
      'javascriptreact', 'typescriptreact',
      'vue', 'html', 'markdown',
      'json', 'jsonc', 'json5',
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

    // ===== 包管理器 =====
    'npm.packageManager': 'pnpm',
  }),

  extensions: () => [
    'vue.volar',
    'dbaeumer.vscode-eslint',
    'esbenp.prettier-vscode',
    'stylelint.vscode-stylelint',
    'mrmlnc.vscode-scss',
    'streetsidesoftware.code-spell-checker',
    'yoavbls.pretty-ts-errors',
    'editorconfig.editorconfig',
    'aaron-bond.better-comments',
    'usernamehw.errorlens',
    'christian-kohler.path-intellisense',
    'vscode-icons-team.vscode-icons',
  ],
}
