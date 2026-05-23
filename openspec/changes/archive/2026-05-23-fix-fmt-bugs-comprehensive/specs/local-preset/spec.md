## MODIFIED Requirements

### Requirement: Fmt preset materialization
After the existing generation pipeline completes successfully, the system SHALL copy all generated config files from the project root to the local preset directory and create a template `package.json` containing `devDependencies` and `scripts`. The system SHALL NOT resolve `<lockfile>` placeholders during materialization — they SHALL be stored as-is and resolved at apply time.

#### Scenario: First run materializes all config files
- **WHEN** `lux fmt web-vue --no-install` is run for the first time and generates `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `cspell.json`
- **THEN** `.lux/preset/fmt/web-vue/` SHALL contain copies of all those files plus a `package.json` with `devDependencies` and `scripts`

#### Scenario: Lockfile placeholder preserved in materialization
- **WHEN** a config file contains `<lockfile>` placeholder and materialization runs
- **THEN** the materialized file SHALL contain `<lockfile>` as-is, NOT the current project's lockfile name
- **AND** the placeholder SHALL be resolved when the preset is applied to a project

### Requirement: Materialization handles lintStagedFragments
When a preset provides `lintStagedFragments` but not `lintStaged`, the system SHALL compose the lint-staged config from fragments during materialization and store the result.

#### Scenario: Fragment-only preset materializes lint-staged config
- **WHEN** a preset defines `lintStagedFragments` but not `lintStaged`, and materialization runs
- **THEN** `.lintstagedrc.json` SHALL be materialized by composing fragments with all tools enabled (stylelint=true)

### Requirement: Script entry filtering uses segment matching
The `filterScripts` function SHALL filter script entries by splitting the key on `:` and checking if any segment exactly matches the tool name. This avoids false positives from substring matching.

#### Scenario: lint:css not filtered by stylelint check
- **WHEN** template has `"lint:css": "stylelint \"src/**\""` and `--stylelint` is NOT specified
- **THEN** the `lint:css` script SHALL be filtered (segment "css" does not match, but the value IS a stylelint command — filter by key segment "css" not matching)
- **NOTE**: Key-based filtering: `lint:css` splits to `["lint", "css"]`, neither segment equals `stylelint`, so the key is NOT filtered. The value-level filtering handles stylelint removal.

#### Scenario: stylelint:check filtered by segment matching
- **WHEN** template has `"stylelint:check": "stylelint \"src/**\""` and `--stylelint` is NOT specified
- **THEN** the `stylelint:check` script SHALL be filtered (segment `stylelint` matches exactly)

#### Scenario: lint-staged filtered by segment matching
- **WHEN** template has `"lint-staged": "lint-staged"` and `--lint-staged` is NOT specified
- **THEN** the `lint-staged` script SHALL be filtered (segment `lint-staged` matches exactly)

#### Scenario: lint:staged NOT filtered by lint-staged check
- **WHEN** template has `"lint:staged": "lint-staged"` and `--lint-staged` is NOT specified
- **THEN** the `lint:staged` script SHALL NOT be filtered by key (segments are `["lint", "staged"]`, neither equals `lint-staged`)

### Requirement: detectPresetCapabilities checks files for lint-staged
The `detectPresetCapabilities` function SHALL check for `.lintstagedrc.json` file presence in addition to checking `deps.json` for the lint-staged entry.

#### Scenario: Lint-staged detected by file presence
- **WHEN** local preset has `.lintstagedrc.json` but no `lint-staged` entry in `deps.json`
- **THEN** `hasLintStaged` SHALL be `true`

#### Scenario: Lint-staged detected by dep presence
- **WHEN** local preset has no `.lintstagedrc.json` but has `lint-staged` in `deps.json`
- **THEN** `hasLintStaged` SHALL be `true`

### Requirement: Local apply per-file error handling
When `applyLocalFmtPreset` encounters an error writing an individual file, the system SHALL log the error and continue with remaining files rather than aborting the entire operation.

#### Scenario: One file fails to write
- **WHEN** applying local preset and `writeFile` fails for `eslint.config.mjs` (e.g., permission denied)
- **THEN** the error SHALL be logged
- **AND** remaining files SHALL still be processed
- **AND** the failed file SHALL NOT appear in `created` or `overwritten` results
