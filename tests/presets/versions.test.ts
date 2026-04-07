import { describe, expect, it } from 'vitest'
import { resolveVersions, DEPS_VERSIONS } from '../../src/presets/versions'

describe('resolveVersions', () => {
  it('maps known packages to versioned strings', () => {
    const result = resolveVersions(['eslint', 'prettier'])
    expect(result[0]).toBe(`eslint@${DEPS_VERSIONS['eslint']}`)
    expect(result[1]).toBe(`prettier@${DEPS_VERSIONS['prettier']}`)
  })

  it('passes unknown packages through unchanged', () => {
    expect(resolveVersions(['my-custom-pkg'])).toEqual(['my-custom-pkg'])
  })

  it('handles mixed known and unknown packages', () => {
    const result = resolveVersions(['eslint', 'custom-pkg', 'prettier'])
    expect(result[0]).toContain('@')
    expect(result[1]).toBe('custom-pkg')
    expect(result[2]).toContain('@')
  })

  it('returns empty array for empty input', () => {
    expect(resolveVersions([])).toEqual([])
  })
})
