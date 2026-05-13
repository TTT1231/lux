## 1. Core Module: `src/core/local-preset.ts`

- [ ] 1.1 Implement `getLocalPresetDir(cwd, type, presetName)` — returns path like `.lux/preset/fmt/web-vue/`
- [ ] 1.2 Implement `localPresetExists(cwd, type, presetName)` — checks if local preset directory exists
- [ ] 1.3 Implement `materializeFmtPreset(cwd, presetName, generatedFiles, preset, opts)` — copies generated config files from project root to `.lux/preset/fmt/<preset>/`, writes template `package.json` with deps (using `<latest>`) and scripts (using `<pm>`), respecting `--stylelint`/`--editorconfig` flags
- [ ] 1.4 Implement `materializeVscodePreset(cwd, presetName)` — copies `.vscode/settings.json` and `.vscode/extensions.json` to `.lux/preset/vscode/<preset>/`
- [ ] 1.5 Implement `applyLocalFmtPreset(cwd, presetName, opts)` — reads files from local preset dir, copies config files to project root (respecting `--stylelint`/`--editorconfig`/`--force`/`--dry-run`), merges template `package.json` into project's (deps dedupe, scripts skip on conflict + log)
- [ ] 1.6 Implement `applyLocalVscodePreset(cwd, presetName, opts)` — reads local preset, merges settings.json via `mergeVscodeSettings()`, writes extensions.json, respecting `--stylelint`/`--force`/`--dry-run`
- [ ] 1.7 Implement `resetLocalPreset(cwd, type, presetName)` — deletes local preset directory

## 2. Command Integration

- [ ] 2.1 Update `src/commands/fmt.ts` — add `--reset` flag, add local preset detection before existing pipeline: if local preset exists → call `applyLocalFmtPreset()` + install deps; else → existing pipeline + `materializeFmtPreset()` post-step. Update result logging to distinguish paths
- [ ] 2.2 Update `src/commands/vscode.ts` — add `--reset` flag, add local preset detection: if local preset exists → call `applyLocalVscodePreset()`; else → existing pipeline + `materializeVscodePreset()` post-step. Update result logging

## 3. Unit Tests

- [ ] 3.1 Create `tests/core/local-preset.test.ts` — test `getLocalPresetDir`, `localPresetExists`, `materializeFmtPreset`, `materializeVscodePreset`, `applyLocalFmtPreset`, `applyLocalVscodePreset`, `resetLocalPreset` with temp directories
- [ ] 3.2 Test `<latest>` placeholder handling — devDependencies with `<latest>` resolve to bare package name, custom versions pass through
- [ ] 3.3 Test package.json merge — deps dedupe, scripts skip on conflict, `<pm>` resolution
- [ ] 3.4 Test flag filtering — `--stylelint` skips stylelint files/deps/scripts, `--editorconfig` skips editorconfig

## 4. Acceptance Tests

- [ ] 4.1 Add to `tests/acceptance.spec.ts`: Scenario — first run materializes preset to `.lux/preset/`, verify directory and template `package.json` content
- [ ] 4.2 Add: Scenario — second run uses local preset, verify files come from `.lux/preset/` not built-in, verify "using local preset" message in output
- [ ] 4.3 Add: Scenario — user edits local preset files, second run reflects changes
- [ ] 4.4 Add: Scenario — `--reset` deletes local preset, next run re-materializes from built-in
- [ ] 4.5 Add: Scenario — `--dry-run` with local preset, no files written, preview shown
- [ ] 4.6 Add: Scenario — `--stylelint` flag filters stylelint files from local preset copy
- [ ] 4.7 Add: Scenario — VSCode local preset merge behavior preserved

## 5. Verify

- [ ] 5.1 Run `bun run build` — clean build
- [ ] 5.2 Run `bun run test` — all tests pass
- [ ] 5.3 Run `bun run code:check:all` — lint, format, spell pass
