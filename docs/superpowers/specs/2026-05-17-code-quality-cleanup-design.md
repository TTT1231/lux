# Code Quality Cleanup Design

Date: 2026-05-17
Branch: worktree-code-refact
Scope: Code quality only — no functional changes

## Motivation

Multiple constants, type definitions, and utility functions are duplicated across `commands/`, `generators/`, and `core/`. If one copy is fixed and the other is missed, behavior silently diverges. This refactoring consolidates shared code and fixes pattern inconsistencies without changing any external behavior.

## Decisions (Eng Review)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D1 | Design doc | Skip (standard review) | Code quality refactoring, not new feature |
| D2 | New module name | `core/shared.ts` | Contains both constants and functions; "constants" is misleading |
| D3 | local-preset.ts fs usage | Include in scope | Same inconsistency as fmt.ts; fixing only one defeats the purpose |
| D4 | isNotCspellDep/isNotHuskyDep | Move all 5 to shared.ts | Consistent pattern; avoids "why are these two different?" |

## Changes

### 1. New file: `core/shared.ts`

Extract from two locations into one shared module:

```
core/shared.ts exports:
├── STYLELINT_SETTINGS_PREFIXES  (from generators/vscode.ts:6-11, core/local-preset.ts:32-37)
├── STYLELINT_EXTENSION          (from generators/vscode.ts:12, core/local-preset.ts:49)
├── STYLELINT_DEPS               (from core/local-preset.ts:39-47)
├── HUSKY_DEPS                   (from core/local-preset.ts:51)
├── LINTSTAGED_DEPS              (from core/local-preset.ts:52)
├── CONFIG_GETTERS               (from core/local-preset.ts:13-25; replaces generators/fmt.ts CONFIG_FILES)
├── filterStylelintSettings()    (from generators/vscode.ts:109-126, core/local-preset.ts:433-450)
├── isNotStylelintDep()          (from commands/fmt.ts:35-39, core/local-preset.ts:525-529)
├── isNotEditorconfigDep()       (from commands/fmt.ts:42-44, core/local-preset.ts:531-533)
├── isNotCspellDep()             (from commands/fmt.ts:47-49)
├── isNotHuskyDep()              (from commands/fmt.ts:51-53)
└── isNotLintStagedDep()         (from commands/fmt.ts:57-59, core/local-preset.ts:535-537)
```

Also move `STYLELINT_FILES`, `EDITORCONFIG_FILE`, `CSPELL_FILE`, `LINTSTAGED_FILE` constants from `core/local-preset.ts:27-30` to `core/shared.ts` since they're used alongside the filter functions.

### 2. Unify path construction → `path.join()`

`generators/vscode.ts` uses template literals for paths while all other files use `path.join()`.

| Line | Current | Fixed |
|------|---------|-------|
| 22 | `` `${opts.cwd}/.vscode/settings.json` `` | `path.join(opts.cwd, '.vscode', 'settings.json')` |
| 34 | `` `${settingsPath}.bak` `` | `settingsPath + '.bak'` |
| 82 | `` `${opts.cwd}/.vscode/extensions.json` `` | `path.join(opts.cwd, '.vscode', 'extensions.json')` |

### 3. Fix `preset as never` type safety

`commands/fmt.ts:351` — `materializeFmtPreset(presetName, preset as never, opts)` bypasses all type checking. Fix by restructuring the type narrowing so `as never` is unnecessary.

### 4. Extract Options type definitions

`commands/fmt.ts` repeats the same options shape 3 times (lines 77-87, 159-167, 316-324). `commands/vscode.ts` repeats 2 times (lines 27-31, 73, 108). Extract:

```typescript
// commands/fmt.ts
interface FmtCommandOptions {
  force?: boolean;
  install?: boolean;
  dryRun?: boolean;
  stylelint?: boolean;
  editorconfig?: boolean;
  cspell?: boolean;
  husky?: boolean;
  lintStaged?: boolean;
  reset?: boolean;
}

// commands/vscode.ts
interface VscodeCommandOptions {
  force?: boolean;
  dryRun?: boolean;
  stylelint?: boolean;
  reset?: boolean;
}
```

### 5. `console.log` → `logger.log()`

| File | Line | Current | Fixed |
|------|------|---------|-------|
| commands/fmt.ts | 145 | `console.log(...)` | `logger.log(...)` |
| commands/fmt.ts | 150 | `console.log(...)` | `logger.log(...)` |
| commands/vscode.ts | 65 | `console.log(...)` | `logger.log(...)` |

### 6. `fs.readFileSync + JSON.parse` → `readJson`

| File | Line | Current | Fixed |
|------|------|---------|-------|
| commands/fmt.ts | 103 | `JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))` | `readJson(pkgPath)` with null check |
| core/local-preset.ts | 210 | `JSON.parse(fs.readFileSync(projectPkgPath, 'utf-8'))` | `readJson(projectPkgPath)` with null check |

Also replace `fs.existsSync` → `fileExists` and `fs.readFileSync` (non-JSON) → `readFile` in `core/local-preset.ts` where possible (lines 72, 76, 80, 93, 101, 148, 154, 202, 243, 492).

### 7. `Array.fill` type assertion

`utils/errors.ts:42` — `Array(n + 1).fill(0) as number[]` → `Array.from<number>({ length: n + 1 }, () => 0)`.

### 8. `resolvePreset` from `utils/errors.ts`

`resolvePreset` (errors.ts:61-64) is a trivial `Array.find` wrapper in the wrong module. Only caller is `commands/vscode.ts:33`. Inline at the call site — `resolvePreset(VSCODE_PRESETS, presetName)` becomes `VSCODE_PRESETS.find(p => p.name === presetName)`. Not worth a separate module for one trivial call.

## Files Touched

| File | Action | Changes |
|------|--------|---------|
| `core/shared.ts` | NEW | All shared constants and functions |
| `core/local-preset.ts` | MODIFY | Remove extracted code, add imports from shared, replace fs.* with utils |
| `generators/vscode.ts` | MODIFY | Remove extracted code, add imports from shared, fix path construction |
| `generators/fmt.ts` | MODIFY | Replace CONFIG_FILES with import from shared |
| `commands/fmt.ts` | MODIFY | Remove extracted functions, add imports from shared, fix Options type, fix console.log, fix readJson, fix as never |
| `commands/vscode.ts` | MODIFY | Fix Options type, fix console.log, update resolvePreset import |
| `utils/errors.ts` | MODIFY | Remove resolvePreset, fix Array.fill |

## NOT in scope

- `executeLocalPath/executeBuiltinPath` ~150 lines duplication (high risk, deferred)
- Cross-platform support (`chmod` / `clip` Windows-only)
- tsconfig/tsup declaration alignment
- Test coverage additions
- Error handling strategy unification (exitCode / throw / return)
- `filterDeps` / `mergeTemplateIntoProject` unification (different approaches, low priority)

## Risk Assessment

All changes are mechanical: move code, update imports, replace function calls with equivalents. No behavioral changes. Existing tests validate correctness post-refactor.

Highest risk item: `preset as never` fix (item 3) — requires understanding the type mismatch to choose the right fix. May need runtime verification.
