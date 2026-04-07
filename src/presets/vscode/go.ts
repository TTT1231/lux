import type { VscodePreset } from '../types.js'

export const goVscode: VscodePreset = {
  name: 'go',
  description: 'VSCode config for Go',

  settings: () => ({
    // Editor basics — Go uses tabs, tabSize 4
    'editor.formatOnSave': true,
    'editor.defaultFormatter': 'golang.go',
    'editor.tabSize': 4,
    'editor.insertSpaces': false,
    'editor.detectIndentation': false,
    'editor.codeActionsOnSave': {
      'source.organizeImports': 'explicit',
    },

    // Go-specific
    'go.useLanguageServer': true,
    'go.lintTool': 'staticcheck',
    'go.lintOnSave': 'package',
    'go.formatTool': 'gopls',
    'go.vetOnSave': 'package',
    'go.buildOnSave': 'off',
    'go.coverMode': 'atomic',
    'go.testFlags': ['-v', '-count=1'],
    'go.playground': {
      'openbrowser': false,
      'share': false,
    },

    // CSpell
    'cSpell.language': 'en',
  }),

  extensions: () => [
    'golang.go',
    'streetsidesoftware.code-spell-checker',
  ],
}
