## 1. Core Module: `src/core/local-preset.ts`

- [x] 1.1 Implement `getLocalPresetDir(cwd, type, presetName)` — returns path like `.lux/preset/fmt/web-vue/`
- [x] 1.2 Implement `localPresetExists(cwd, type, presetName)` — checks if local preset directory exists
- [x] 1.3 Implement `materializeFmtPreset(cwd, presetName, generatedFiles, preset, opts)` — copies generated config files from project root to `.lux/preset/fmt/<preset>/`, writes template `package.json` with deps (using `<latest>`) and scripts (using `<pm>`), respecting `--stylelint`/`--editorconfig` flags
- [x] 1.4 Implement `materializeVscodePreset(cwd, presetName)` — copies `.vscode/settings.json` and `.vscode/extensions.json` to `.lux/preset/vscode/<preset>/`
- [x] 1.5 Implement `applyLocalFmtPreset(cwd, presetName, opts)` — reads files from local preset dir, copies config files to project root (respecting `--stylelint`/`--editorconfig`/`--force`/`--dry-run`), merges template `package.json` into project's (deps dedupe, scripts skip on conflict + log)
- [x] 1.6 Implement `applyLocalVscodePreset(cwd, presetName, opts)` — reads local preset, merges settings.json via `mergeVscodeSettings()`, writes extensions.json, respecting `--stylelint`/`--force`/`--dry-run`
- [x] 1.7 Implement `resetLocalPreset(cwd, type, presetName)` — deletes local preset directory

## 2. Command Integration

- [x] 2.1 Update `src/commands/fmt.ts` — add `--reset` flag, add local preset detection before existing pipeline: if local preset exists → call `applyLocalFmtPreset()` + install deps; else → existing pipeline + `materializeFmtPreset()` post-step. Update result logging to distinguish paths
- [x] 2.2 Update `src/commands/vscode.ts` — add `--reset` flag, add local preset detection: if local preset exists → call `applyLocalVscodePreset()`; else → existing pipeline + `materializeVscodePreset()` post-step. Update result logging

## 3. Unit Tests

- [x] 3.1 Create `tests/core/local-preset.test.ts` — test `getLocalPresetDir`, `localPresetExists`, `materializeFmtPreset`, `materializeVscodePreset`, `applyLocalFmtPreset`, `applyLocalVscodePreset`, `resetLocalPreset` with temp directories
- [x] 3.2 Test `<latest>` placeholder handling — devDependencies with `<latest>` resolve to bare package name, custom versions pass through
- [x] 3.3 Test package.json merge — deps dedupe, scripts skip on conflict, `<pm>` resolution
- [x] 3.4 Test flag filtering — `--stylelint` skips stylelint files/deps/scripts, `--editorconfig` skips editorconfig

## 4. Acceptance Tests

- [x] 4.1 Add to `tests/acceptance.spec.ts`: Scenario — first run materializes preset to `.lux/preset/`, verify directory and template `package.json` content
- [x] 4.2 Add: Scenario — second run uses local preset, verify files come from `.lux/preset/` not built-in, verify "using local preset" message in output
- [x] 4.3 Add: Scenario — user edits local preset files, second run reflects changes
- [x] 4.4 Add: Scenario — `--reset` deletes local preset, next run re-materializes from built-in
- [x] 4.5 Add: Scenario — `--dry-run` with local preset, no files written, preview shown
- [x] 4.6 Add: Scenario — `--stylelint` flag filters stylelint files from local preset copy
- [x] 4.7 Add: Scenario — VSCode local preset merge behavior preserved

## 5. Verify

- [x] 5.1 Build → create temp dir with `package.json`, run `lux fmt web-vue --no-install` → verify `.lux/preset/fmt/web-vue/` exists with all config files + template `package.json` containing `<latest>` and `<pm>` placeholders
- [x] 5.2 Run again → verify output shows "using local custom preset" and files come from `.lux/preset/` (not regenerated), config files unchanged
- [x] 5.3 Edit a file in `.lux/preset/fmt/web-vue/` (e.g. pin eslint version to `^9.0.0` in template `package.json`) → run again → verify project gets the edited version
- [x] 5.4 Delete a file from `.lux/preset/fmt/web-vue/` (e.g. `cspell.json`) → run again → verify `cspell.json` is NOT written to project root, no error
- [x] 5.5 Run `lux fmt web-vue --reset` → verify `.lux/preset/fmt/web-vue/` deleted → run again → verify re-materialized from built-in
- [x] 5.6 Create temp dir with `package.json`, run `lux vscode web-vue` → verify `.lux/preset/vscode/web-vue/` exists with `settings.json` + `extensions.json` → run again → verify "using local custom preset" and settings merged correctly
- [x] 5.7 Run `bun run build` → clean build, `bun run test` → all pass, `bun run code:check:all` → lint/format/spell clean
