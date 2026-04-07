import type { VscodePreset } from '../types.js'

export const uniappVscode: VscodePreset = {
  name: 'uniapp',
  description: 'VSCode config for UniApp',

  settings: () => ({
    // Editor basics
    'editor.formatOnSave': true,
    'editor.defaultFormatter': 'esbenp.prettier-vscode',
    'editor.tabSize': 2,
    'editor.detectIndentation': false,
    'editor.codeActionsOnSave': {
      'source.fixAll.eslint': 'explicit',
      'source.fixAll.stylelint': 'explicit',
      'source.organizeImports': 'never',
    },

    // ESLint
    'eslint.validate': [
      'javascript',
      'javascriptreact',
      'typescript',
      'typescriptreact',
      'vue',
    ],
    'eslint.options': {
      'flags': 'unstable_ts_config',
    },

    // Stylelint
    'stylelint.enable': true,
    'stylelint.validate': ['css', 'scss', 'vue'],
    'stylelint.customSyntax': 'postcss-scss',
    'css.validate': false,
    'less.validate': false,
    'scss.validate': false,

    // TypeScript
    'js/ts.preferences.importModuleSpecifier': 'relative',

    // CSpell
    'cSpell.language': 'en',

    // Package manager
    'npm.packageManager': 'pnpm',
  }),

  extensions: () => [
    'dbaeumer.vscode-eslint',
    'esbenp.prettier-vscode',
    'stylelint.vscode-stylelint',
    'streetsidesoftware.code-spell-checker',
    'vue.volar',
    'vue.vscode-typescript-vue-plugin',
    'antfu.iconify',
    'christian-kohler.path-intellisense',
  ],
}
