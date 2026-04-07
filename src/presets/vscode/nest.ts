import type { VscodePreset } from '../types.js'

export const nestVscode: VscodePreset = {
  name: 'nest',
  description: 'VSCode config for NestJS',

  settings: () => ({
    // Editor basics
    'editor.formatOnSave': true,
    'editor.defaultFormatter': 'esbenp.prettier-vscode',
    'editor.tabSize': 2,
    'editor.detectIndentation': false,
    'editor.codeActionsOnSave': {
      'source.fixAll.eslint': 'explicit',
      'source.organizeImports': 'never',
    },

    // ESLint
    'eslint.validate': [
      'javascript',
      'typescript',
    ],
    'eslint.options': {
      'flags': 'unstable_ts_config',
    },

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
    'streetsidesoftware.code-spell-checker',
    'firsttris.vscode-jest-runner',
    'christian-kohler.path-intellisense',
  ],
}
