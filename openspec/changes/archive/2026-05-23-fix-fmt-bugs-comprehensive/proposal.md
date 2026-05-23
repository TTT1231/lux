## Why

A comprehensive code review by two independent agents identified 22 bugs across the `fmt` command, spanning P1 (data loss, state corruption, silent failures), P2 (incorrect behavior, misleading UX), and P3 (minor polish). These bugs have accumulated because the fmt command's two execution paths (builtin vs local preset) share no common safety guardrails, and several edge cases around `--dry-run`, `--reset`, and `--force` were never validated. The bugs affect real users: `--dry-run --reset` silently deletes files, scripts can corrupt `package.json`, and multiple failure modes set no exit code so CI/CD pipelines silently pass.

## What Changes

### P1 — Critical fixes
- **Guard `--reset` behind `--dry-run` check**: `resetLocalPreset` currently runs unconditionally, even when `--dry-run` is set. Fix both the builtin path and `resetLocalPreset` itself to respect `--dry-run`.
- **Fix `logApplyResult` for dry-run mode**: Local path reuses `logApplyResult` which says "Created X files" even during dry-run. Add dry-run awareness to distinguish "would create" from "created".
- **Make `.husky/pre-commit` respect `--force`**: Currently always overwrites; align with `initScriptName` behavior (skip if exists unless `--force`).
- **Preserve `deps.json` version pinning**: `collectDepsFromRegistry` returns `{pkg: "^1.0.0"}` but callers pass only package names to `addDepsToManifest`, which re-fetches latest. Pass the full version map so pinned versions are preserved.
- **Set `process.exitCode = 1` on all error returns**: Bad package.json, bad deps.json, --reset on custom preset — all currently `return` without exit code.
- **Guard `package.json` scripts merge against non-object types**: Cast after validation, not before.

### P2 — Medium fixes
- **Unify script logging between local and builtin paths**: Local path logs per-script; builtin path logs summary. Standardize to summary with opt-in detail.
- **Fix `detectPresetCapabilities` to check files + deps**: Current lint-staged check only looks at deps, missing `.lintstagedrc.json` presence.
- **Add flag capability warnings to builtin path**: Currently only the local path warns when a flag has no effect.
- **Propagate builtin write failures**: `generateConfigFile` returning `null` should trigger a warning/error, not silent skip.
- **Fix dry-run labels**: "Would create" is used for both new files and overwrites; scripts are silently skipped in dry-run.
- **Do not persist lockfile name in materialized preset**: Replace `<lockfile>` with a sentinel or leave unresolved; resolve at apply time.
- **Handle `lintStagedFragments` in materialization**: Currently only `preset.lintStaged` is materialized; fragment-only presets lose their lint-staged config.
- **Improve `filterScripts` matching**: Use key-based convention (e.g., prefix or exact tool-name segments) instead of `key.includes('stylelint')` which causes false positives on `lint:css` or `lint:staged`.
- **Warn when `--husky` is active but deps unavailable**: Both `--no-install` failure and local preset missing husky deps should warn.
- **Add `--force` hint when all files are skipped**: Help the user discover `--force` to overwrite.

### P3 — Minor fixes
- **Warn when `--reset` finds no local preset** (instead of silent success)
- **Cover sibling config warning for existing files** (currently only warns for `!exists`)
- **Add per-file error handling in local apply path**

### E2E validation
- Add comprehensive acceptance tests using temporary directories to verify all P1 fixes and key P2 fixes.

## Capabilities

### New Capabilities
- `fmt-safety-guards`: Guards against data loss in `--dry-run`/`--reset` combinations, ensures proper exit codes, and validates `package.json` structure before mutation.
- `fmt-flag-consistency`: Unifies flag behavior (force, dry-run, capability warnings) across builtin and local execution paths.

### Modified Capabilities
- `fmt-command`: Requirement changes for dry-run respecting reset, husky `--force` consistency, exit codes on error, dep version pinning, and dry-run label accuracy.
- `local-preset`: Requirement changes for materialization lockfile handling, lintStagedFragments support, filterScripts accuracy, and per-file error handling.

## Impact

- **Source files**: `src/commands/fmt.ts`, `src/core/local-preset.ts`, `src/core/shared.ts`, `src/generators/fmt.ts`, `src/core/conflict-resolver.ts`
- **Test files**: New acceptance tests in `tests/acceptance/`, updated unit tests in `tests/unit/`
- **No breaking changes**: All fixes are behavioral corrections — no API surface changes
- **Dependencies**: None
