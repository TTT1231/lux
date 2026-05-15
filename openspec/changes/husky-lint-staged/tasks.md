## 1. Type & Interface Changes

- [ ] 1.1 Add `lintStaged?: () => string` to `FmtPreset` in `src/presets/types.ts`
- [ ] 1.2 Add `noHusky: boolean` and `noLintStaged: boolean` to `GenerateOptions` in `src/presets/types.ts`

## 2. Preset Data

- [ ] 2.1 Add `lintStaged` field to `src/presets/fmt/web-vue.ts` with Vue-specific glob/command config
- [ ] 2.2 Add `lintStaged` field to `src/presets/fmt/web-react.ts` with React-specific glob/command config
- [ ] 2.3 Add `lintStaged` field to remaining presets (`nest`, `node`, `electron-vue`, `uniapp`)
- [ ] 2.4 Add `husky` and `lint-staged` to `dependencies.dev` array in all presets

## 3. Generator — Config File Generation

- [ ] 3.1 Add `.lintstagedrc.json` entry to `CONFIG_FILES` in `src/generators/fmt.ts`
- [ ] 3.2 Add `noLintStaged` filtering for `.lintstagedrc.json` in `generateAllFmt`

## 4. Core — Local Preset Extension

- [ ] 4.1 Add `.lintstagedrc.json` entry to `CONFIG_GETTERS` in `src/core/local-preset.ts`
- [ ] 4.2 Add `LINTSTAGED_FILE` constant and `HUSKY_DEPS` / `LINTSTAGED_DEPS` sets
- [ ] 4.3 Extend `filterScripts` with `noLintStaged` parameter to filter `lint-staged` script entries
- [ ] 4.4 Extend `mergeTemplateIntoProject` to filter `husky` and `lint-staged` deps based on flags
- [ ] 4.5 Extend `applyLocalFmtPreset` to skip `.lintstagedrc.json` when `noLintStaged` is true
- [ ] 4.6 Extend `detectPresetCapabilities` to return `hasLintStaged`

## 5. Command — Flag Registration & Husky Init

- [ ] 5.1 Register `--husky` and `--lint-staged` options in `registerFmtCommand` (`src/commands/fmt.ts`)
- [ ] 5.2 Implement `--lint-staged` implicitly enabling `--husky` logic
- [ ] 5.3 Add `isNotHuskyDep` and `isNotLintStagedDep` filter functions
- [ ] 5.4 Implement husky initialization logic: `ensureDir('.husky/')` + write `pre-commit` + inject init script + execute once
- [ ] 5.5 Add yarn-specific handling: inject `postinstall` instead of `prepare`
- [ ] 5.6 Wire husky init into `executeBuiltinPath` and `executeLocalPath`
- [ ] 5.7 Extend `summarizeFiles` to categorize husky/lint-staged files
- [ ] 5.8 Add capability warnings for `--husky`/`--lint-staged` on presets without relevant config

## 6. Tests

- [ ] 6.1 Add unit tests for `filterScripts` with `noLintStaged` in `tests/core/local-preset.test.ts`
- [ ] 6.2 Add unit tests for `.lintstagedrc.json` generation in `tests/generators/fmt.test.ts`
- [ ] 6.3 Add unit tests for husky init logic (ensureDir, writeFile, script injection)
- [ ] 6.4 Add acceptance test for `lux fmt <preset> --husky` end-to-end
- [ ] 6.5 Add acceptance test for `lux fmt <preset> --lint-staged` end-to-end
- [ ] 6.6 Add acceptance test for `lux fmt <preset> --husky --lint-staged` with local preset path

## 7. E2E Verification (Real Scenario)

- [ ] 7.1 Create temp project with git init + package.json, run `lux fmt web-vue --husky --lint-staged`, verify: `.husky/pre-commit` exists with correct content, `.lintstagedrc.json` generated, `husky` + `lint-staged` in devDependencies, `prepare`/`postinstall` script present, `core.hooksPath` set
- [ ] 7.2 Stage a file with lint errors, run `git commit`, verify lint-staged blocks the commit and auto-fixes
- [ ] 7.3 Run `lux fmt web-vue --husky` (without --lint-staged), verify `.husky/pre-commit` contains `<pm> run lint` (not lint-staged), no `.lintstagedrc.json`, no lint-staged dep
- [ ] 7.4 Run `lux fmt web-vue` (without flags), verify no `.husky/`, no lint-staged artifacts at all
- [ ] 7.5 Test yarn scenario: init project with `yarn.lock`, run `lux fmt web-vue --husky --lint-staged`, verify `postinstall` script instead of `prepare`, hook still works on commit
- [ ] 7.6 Test local preset path: run twice, verify second run uses local preset, `.lintstagedrc.json` applied from `~/.lux/preset/fmt/`, husky pre-commit dynamically generated correctly
