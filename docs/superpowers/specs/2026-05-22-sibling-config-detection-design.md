# Sibling Config File Detection

## Problem

`lux fmt` generates `eslint.config.mjs` by checking only for that exact filename. If a project already has `eslint.config.js` (or other extension variants), lux creates a second config file, leaving two ESLint configs in the target directory.

`resolveConflict()` operates at "exact filename" granularity — it cannot detect files from the same config family.

## Scope

Detect **flat config siblings only**:
- `eslint.config.{js,mjs,cjs,ts}` family
- `stylelint.config.{js,mjs,cjs,ts}` family

Legacy `.eslintrc*` is excluded because lux only generates flat config format; coexistence with legacy configs is not a conflict.

## Decision: Warn + Skip

When a sibling config file exists, lux prints a warning and skips generation:

```
⚠ eslint.config.mjs not generated: eslint.config.js already exists
```

## Architecture

### CONFIG_FAMILY mapping

```typescript
const CONFIG_FAMILY: Record<string, string[]> = {
   'eslint.config.mjs': ['eslint.config.js', 'eslint.config.cjs', 'eslint.config.ts'],
   'stylelint.config.mjs': ['stylelint.config.js', 'stylelint.config.cjs', 'stylelint.config.ts'],
};
```

### findConflictSibling(filename, cwd) helper

Scans the target directory for any existing sibling file. Returns the found sibling filename or `undefined`.

```typescript
export function findConflictSibling(filename: string, cwd: string): string | undefined;
```

### Two integration points

**Built-in path** (`src/generators/fmt.ts` → `resolveConflict()`):
- Add `cwd` parameter to `resolveConflict()`
- After `neverOverwrite` / `forceOverwrite` checks, before the `!exists → create` branch, check for siblings
- When sibling found: return `'skip'`

**Local preset path** (`src/core/local-preset.ts` → `applyLocalFmtPreset()`):
- Call `findConflictSibling()` in the per-file loop before the existing exists-check
- When sibling found and file doesn't exist: warn + skip (same behavior as built-in path)

### resolveConflict priority (updated)

1. `neverOverwrite` → always skip
2. `forceOverwrite` → always overwrite
3. **Sibling exists + file doesn't exist → warn + skip** (new)
4. File doesn't exist → create
5. File exists + `--force` → overwrite
6. File exists (no force) → skip

### Logging

In `generateConfigFile()`, when `resolveConflict()` returns `'skip'` for a file that doesn't exist on disk, the caller checks for siblings via `findConflictSibling()` and prints:

```
⚠ <filename> not generated: <sibling> already exists
```

Same log format in `applyLocalFmtPreset()`.

## Changed files

| File | Change |
|---|---|
| `src/core/conflict-resolver.ts` | Add `CONFIG_FAMILY`, `findConflictSibling()`, extend `resolveConflict()` with `cwd` |
| `src/generators/fmt.ts` | `generateConfigFile()` passes `opts.cwd` to `resolveConflict()`, logs sibling warnings |
| `src/core/local-preset.ts` | `applyLocalFmtPreset()` calls `findConflictSibling()` for sibling-aware skip |
| `tests/unit/core/conflict-resolver.test.ts` | New tests for sibling detection + updated priority order |

## Out of scope

- Prettier sibling detection (`.prettierrc` has no extension variants)
- Legacy `.eslintrc*` detection
- `--force` overriding sibling detection (siblings always prevent generation)
