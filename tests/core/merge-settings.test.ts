import { describe, expect, it } from 'vitest'
import { mergeVscodeSettings } from '../../src/core/merge-settings'

describe('mergeVscodeSettings', () => {
  it('adds keys only in preset', () => {
    const result = mergeVscodeSettings({ 'editor.tabSize': 2 }, {})
    expect(result['editor.tabSize']).toBe(2)
  })

  it('keeps keys only in existing', () => {
    const result = mergeVscodeSettings({}, { 'editor.fontSize': 14 })
    expect(result['editor.fontSize']).toBe(14)
  })

  it('preserves user-priority keys (cursor, theme)', () => {
    const result = mergeVscodeSettings(
      { 'editor.cursorBlinking': 'expand', 'editor.tabSize': 2 },
      { 'editor.cursorBlinking': 'smooth', 'workbench.colorTheme': 'dark' },
    )
    expect(result['editor.cursorBlinking']).toBe('smooth') // user wins
    expect(result['workbench.colorTheme']).toBe('dark') // user wins
    expect(result['editor.tabSize']).toBe(2) // preset wins (uncategorized)
  })

  it('overwrites preset-priority keys (formatOnSave, tabSize)', () => {
    const result = mergeVscodeSettings(
      { 'editor.formatOnSave': true, 'editor.tabSize': 2 },
      { 'editor.formatOnSave': false, 'editor.tabSize': 8 },
    )
    expect(result['editor.formatOnSave']).toBe(true) // preset wins
    expect(result['editor.tabSize']).toBe(2) // preset wins
  })

  it('preset wins for uncategorized keys', () => {
    const result = mergeVscodeSettings(
      { 'some.plugin.setting': 'new' },
      { 'some.plugin.setting': 'old' },
    )
    expect(result['some.plugin.setting']).toBe('new')
  })

  it('deep-merges nested plain objects', () => {
    const result = mergeVscodeSettings(
      { 'editor.codeActionsOnSave': { 'source.fixAll.eslint': 'explicit' } },
      { 'editor.codeActionsOnSave': { 'source.organizeImports': 'always' } },
    )
    const actions = result['editor.codeActionsOnSave'] as Record<string, unknown>
    expect(actions['source.fixAll.eslint']).toBe('explicit')
    expect(actions['source.organizeImports']).toBe('always')
  })

  it('replaces arrays with preset values', () => {
    const result = mergeVscodeSettings(
      { 'eslint.validate': ['ts', 'vue'] },
      { 'eslint.validate': ['js'] },
    )
    expect(result['eslint.validate']).toEqual(['ts', 'vue'])
  })
})
