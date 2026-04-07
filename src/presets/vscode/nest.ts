import type { VscodePreset } from '../types'

export const nestVscode: VscodePreset = {
  name: 'nest',
  description: 'VSCode config for NestJS',

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
      'source.organizeImports': 'never',
    },
    'editor.cursorBlinking': 'expand',
    'editor.cursorSmoothCaretAnimation': 'on',
    'editor.largeFileOptimizations': true,
    'editor.bracketPairColorization.enabled': true,
    'editor.autoClosingBrackets': 'beforeWhitespace',
    'editor.autoClosingOvertype': 'always',

    // ===== TypeScript 专项优化 =====
    'typescript.inlayHints.enumMemberValues.enabled': true,
    'typescript.preferences.preferTypeOnlyAutoImports': true,
    'typescript.preferences.includePackageJsonAutoImports': 'on',
    'typescript.preferences.importModuleSpecifier': 'relative',
    'typescript.suggest.autoImports': true,
    'typescript.tsserver.exclude': ['**/node_modules', '**/dist', '**/.turbo'],
    'typescript.tsdk': 'node_modules/typescript/lib',

    // ===== 语言特定格式化 =====
    '[typescript]': {
      'editor.defaultFormatter': 'esbenp.prettier-vscode',
      'editor.formatOnSave': true,
    },
    '[javascript]': {
      'editor.defaultFormatter': 'esbenp.prettier-vscode',
      'editor.formatOnSave': true,
    },
    '[json]': { 'editor.defaultFormatter': 'esbenp.prettier-vscode' },

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
    },
    'search.exclude': {
      '**/node_modules': true,
      '**/*.log': true,
      '**/dist': true,
      '**/.git': true,
      '**/tmp': true,
      '**/pnpm-lock.yaml': true,
    },

    // ===== 文件嵌套 =====
    'explorer.fileNesting.enabled': true,
    'explorer.fileNesting.expand': false,
    'explorer.fileNesting.patterns': {
      'package.json': 'pnpm-lock.yaml, .gitignore, .npmrc, nest-cli.json',
      'eslint.config.mjs': '.prettierignore, .prettierrc.json, .editorconfig',
      'tsconfig.json': 'tsconfig.*.json',
      '.env': '.env.*',
      '*.controller.ts': '$(capture).controller.spec.ts',
      '*.service.ts': '$(capture).service.spec.ts',
      '*.module.ts': '$(capture).module.spec.ts',
    },

    // ===== ESLint =====
    'eslint.validate': [
      'javascript', 'typescript',
      'javascriptreact', 'typescriptreact',
      'html', 'markdown',
      'json', 'jsonc', 'json5',
    ],

    // ===== CSpell =====
    'cSpell.language': 'en',

    // ===== 包管理器 =====
    'npm.packageManager': 'pnpm',
  }),

  extensions: () => [
    'dbaeumer.vscode-eslint',
    'esbenp.prettier-vscode',
    'streetsidesoftware.code-spell-checker',
    'yoavbls.pretty-ts-errors',
    'editorconfig.editorconfig',
    'firsttris.vscode-jest-runner',
    'aaron-bond.better-comments',
    'usernamehw.errorlens',
    'christian-kohler.path-intellisense',
    'vscode-icons-team.vscode-icons',
  ],
}
