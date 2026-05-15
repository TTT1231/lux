## 1. Type & Interface Changes

- [x] 1.1 Add `noCspell: boolean` field to `GenerateOptions` in `src/presets/types.ts`
- [x] 1.2 Add `noCspell` parameter to `filterScripts` function signature in `src/core/local-preset.ts`
- [x] 1.3 Add `CSPELL_FILE` constant (`cspell.json`) in `src/core/local-preset.ts` (alongside existing `STYLELINT_FILES`, `EDITORCONFIG_FILE`)

## 2. CLI Flag Registration

- [x] 2.1 Add `--cspell` option to Commander command definition in `src/commands/fmt.ts`
- [x] 2.2 Map `options.cspell` to `opts.noCspell` in `GenerateOptions` construction (same pattern as `noStylelint`)

## 3. Generator Filtering

- [x] 3.1 Add cspell file skip logic in `src/generators/fmt.ts` — when `opts.noCspell && filename.includes('cspell')` skip generation (same as stylelint pattern)

## 4. Dependency Filtering

- [x] 4.1 Add `isNotCspellDep` helper in `src/commands/fmt.ts` — filter by exact package name `cspell`
- [x] 4.2 Apply `isNotCspellDep` filter to devDeps chain in `src/commands/fmt.ts` (after existing stylelint/editorconfig filters)

## 5. Script Filtering

- [x] 5.1 Add cspell key filtering in `filterScripts` — skip entries whose key contains `cspell` when `noCspell` is true
- [x] 5.2 Add cspell inline strip in `filterScripts` — strip `&& cspell ...` segment from script values when `noCspell` is true
- [x] 5.3 Pass `noCspell` to `filterScripts` calls in `src/commands/fmt.ts` and `src/core/local-preset.ts`

## 6. Local Preset Path

- [x] 6.1 Skip cspell.json during apply when `noCspell` is true in `applyLocalFmtPreset`
- [x] 6.2 Filter cspell dependency during `mergeTemplateIntoProject`
- [x] 6.3 Update `detectPresetCapabilities` to detect cspell capability (alongside stylelint/editorconfig)

## 7. Unit Tests

- [x] 7.1 Update existing unit tests to expect cspell excluded by default (adapt any tests that assert cspell.json generation)
- [x] 7.2 Add unit test for `filterScripts` with `noCspell: true` — verifies inline strip + key filtering
- [x] 7.3 Add unit test for dependency filtering with `noCspell: true`
- [x] 7.4 Add unit test for generator file filtering with `noCspell: true`
- [x] 7.5 Add unit test for `mergeTemplateIntoProject` with `noCspell: true` — verifies cspell dep filtered, cspell script filtered
- [x] 7.6 Add unit test for `detectPresetCapabilities` detecting cspell capability

## 8. E2E Verification

- [x] 8.1 E2E: create temp dir, run `node dist/index.js fmt web-vue --no-install`, verify cspell.json absent, lint script has no cspell segment, no cspell dep
- [x] 8.2 E2E: create temp dir, run `node dist/index.js fmt web-vue --no-install --cspell`, verify cspell.json present, lint script contains cspell segment, devDeps includes cspell
- [x] 8.3 E2E: create temp dir, run `node dist/index.js fmt web-vue --no-install --cspell --stylelint`, verify both cspell and stylelint included
- [x] 8.4 E2E (local preset path): create temp dir, run `node dist/index.js fmt web-vue --no-install` (builds local preset), then run again without --cspell, verify cspell.json not copied to project. Then run with `--cspell`, verify cspell.json IS copied from local preset
- [x] 8.5 Run only scope-relevant acceptance tests (not full suite) to save time
