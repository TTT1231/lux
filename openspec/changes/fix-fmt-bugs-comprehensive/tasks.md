## 1. Safety Guards (P1 — data loss, corruption, silent failures)

- [x] 1.1 Guard `resetLocalPreset` behind `--dry-run` check in `fmt.ts:131` — wrap the `resetLocalPreset` call with `if (!options.dryRun)`, and add `[dry-run] Would reset local preset` log. Also add a `dryRun` parameter to `resetLocalPreset` in `local-preset.ts:75` for defense-in-depth.
- [x] 1.2 Set `process.exitCode = 1` on all error returns in `fmt.ts`: bad package.json (line 126), `--reset` on custom preset (line 118), bad deps.json in local path (line 249). Add unit tests verifying exitCode is set.
- [x] 1.3 Validate `package.json` scripts type before merge — in both `injectScripts` (`fmt.ts:556`) and `mergeTemplateIntoProject` (`local-preset.ts:376`), check `typeof scripts === 'object' && !Array.isArray(scripts)` before casting. Log warning and use empty object fallback if invalid. Add unit tests with string/array/null scripts.
- [x] 1.4 Fix `logApplyResult` to accept `dryRun` parameter — update signature to `logApplyResult(result, dryRun)`. When `dryRun=true`, use "Would create"/"Would overwrite" instead of "Created"/"Overwritten". Update call site in `executeLocalPath`.

## 2. Husky --force Consistency (P1)

- [x] 2.1 Make `.husky/pre-commit` respect `--force` in `initHusky` (`fmt.ts:643-645`) — check if `preCommitPath` exists before writing. If exists and `!opts.force`, log skip message and skip write. If exists and `opts.force`, overwrite and log. If not exists, create as before. Add unit test.

## 3. Dep Version Pinning (P1)

- [ ] 3.1 Modify `addDepsToManifest` in `deps.ts` to accept an optional version map `Record<string, string>` as second parameter. When provided, use pinned versions for matching packages instead of fetching latest. For packages with `<latest>` version, still fetch from registry.
- [ ] 3.2 Update `executeLocalPath` in `fmt.ts` to pass full `depsToInstall` map (not just keys) to `addDepsToManifest` and `installDevDeps`. Update the `missing` array construction to preserve version info.
- [ ] 3.3 Update `executeBuiltinPath` in `fmt.ts` similarly — pass full version map instead of just `Object.keys(depsToInstall)`.
- [ ] 3.4 Add unit tests verifying pinned versions are preserved and `<latest>` is still resolved.

## 4. Flag Consistency (P2 — UX and logging)

- [ ] 4.1 Add flag capability warnings to builtin path in `executeBuiltinPath` — check if preset provides the corresponding config/deps for each active flag, warn if not (matching the pattern already in `executeLocalPath`).
- [ ] 4.2 Fix dry-run labels in `logGenerationResult` — distinguish "Would create" vs "Would overwrite" using the `result.created` and `result.overwritten` arrays separately.
- [ ] 4.3 Show dry-run script info in `injectScripts` — when `opts.dryRun`, log `[dry-run] Would add script "<key>"` for each new script, and add a summary line.
- [ ] 4.4 Add `--force` suggestion when all files are skipped — in both `executeBuiltinPath` and `executeLocalPath`, when `allFiles.length === 0 && result.skipped.length > 0`, log "Use --force to overwrite existing files".
- [ ] 4.5 Add `--husky` warning when deps unavailable — in `initHusky`, after dependency installation step, warn if husky is not in project devDependencies. In `executeLocalPath`, warn if preset has no husky deps in `deps.json` but `--husky` is active.

## 5. Preset Correctness (P2 — materialization and filtering)

- [ ] 5.1 Fix `materializeFmtPreset` to NOT resolve `<lockfile>` placeholder — store config content as-is without lockfile substitution during materialization. Remove the lockfile resolution block in the materialization function.
- [ ] 5.2 Add `lintStagedFragments` handling to `materializeFmtPreset` — when preset has `lintStagedFragments` but not `lintStaged`, compose using `composeLintStaged(fragments, { stylelint: true })` and write `.lintstagedrc.json`.
- [ ] 5.3 Fix `filterScripts` to use segment matching — split key on `:` and check if any segment exactly equals the tool name (`stylelint`, `cspell`, `lint-staged`, `editorconfig`). Update unit tests for `filterScripts` with false-positive cases (`lint:css`, `lint:staged`, `spellcheck`).
- [ ] 5.4 Fix `detectPresetCapabilities` to check `.lintstagedrc.json` file — add file presence check for lint-staged alongside the existing deps.json check.
- [ ] 5.5 Add per-file error handling in `applyLocalFmtPreset` — wrap the `writeFile` call in try/catch, log errors, and continue with remaining files on failure.

## 6. Unit Tests

- [ ] 6.1 Add unit tests for `resetLocalPreset` dry-run guard
- [ ] 6.2 Add unit tests for exitCode on error conditions
- [ ] 6.3 Add unit tests for scripts type validation (string, array, null)
- [ ] 6.4 Add unit tests for husky pre-commit --force behavior
- [ ] 6.5 Add unit tests for `filterScripts` segment matching
- [ ] 6.6 Add unit tests for dep version pinning in `addDepsToManifest`

## 7. E2E Acceptance Tests

- [ ] 7.1 Create acceptance test helper for temp project setup (package.json, .git init, optional local preset)
- [ ] 7.2 E2E: `--dry-run --reset` does not delete local preset directory
- [ ] 7.3 E2E: Invalid package.json returns exitCode 1
- [ ] 7.4 E2E: Scripts merge with non-object scripts field succeeds safely
- [ ] 7.5 E2E: `--force` controls husky pre-commit overwrite
- [ ] 7.6 E2E: Dep versions from deps.json are preserved in package.json
- [ ] 7.7 E2E: `--force` suggestion shown when all files skipped
- [ ] 7.8 E2E: Builtin dry-run distinguishes create vs overwrite

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | ISSUES_OPEN | 3 issues, 0 critical gaps |
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

UNRESOLVED: 0
VERDICT: ENG REVIEW PASSED — 3 minor issues addressed (task 3.2 clarification, DRY helper extraction, vscode E2E skip). All P1 bugs have test coverage. Ready to implement.
