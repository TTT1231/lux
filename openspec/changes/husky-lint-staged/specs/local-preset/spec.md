# local-preset

## MODIFIED Requirements

### Requirement: CONFIG_GETTERS includes .lintstagedrc.json
The `CONFIG_GETTERS` array SHALL include an entry for `.lintstagedrc.json` that reads content from `FmtPreset.lintStaged`.

#### Scenario: lintstagedrc.json in materialization
- **WHEN** a preset defines `lintStaged` and `--lint-staged` is specified
- **THEN** `.lintstagedrc.json` SHALL be written to the local preset directory during materialization

#### Scenario: lintstagedrc.json skipped when flag not active
- **WHEN** `--lint-staged` is NOT specified
- **THEN** `.lintstagedrc.json` SHALL NOT be written to the local preset directory

### Requirement: Lint-staged dependency filtering in materialization
When `--lint-staged` is NOT specified, the system SHALL filter `lint-staged` from devDependencies during both materialization and apply, following the same pattern as stylelint dependency filtering.

#### Scenario: lint-staged dep excluded from template package.json
- **WHEN** preset has `lint-staged` in devDependencies and `--lint-staged` is NOT specified
- **THEN** `lint-staged` SHALL NOT be included in the materialized `package.json`

#### Scenario: lint-staged dep excluded on apply
- **WHEN** local preset has `lint-staged` in devDependencies and `--lint-staged` is NOT specified
- **THEN** `lint-staged` SHALL NOT be merged into project's devDependencies

### Requirement: Husky dependency filtering in materialization
When `--husky` is NOT specified (and `--lint-staged` is also NOT specified), the system SHALL filter `husky` from devDependencies.

#### Scenario: husky dep excluded when flag not active
- **WHEN** preset has `husky` in devDependencies and neither `--husky` nor `--lint-staged` is specified
- **THEN** `husky` SHALL NOT be included in devDependencies

### Requirement: lint-staged script filtering
The `filterScripts` function SHALL filter script entries containing `lint-staged` in their key when `noLintStaged` is true, following the same convention as stylelint filtering.

#### Scenario: lint-staged script filtered
- **WHEN** template has `"lint-staged": "lint-staged"` and `noLintStaged` is true
- **THEN** the `lint-staged` script SHALL NOT be merged into project's package.json

### Requirement: lintstagedrc.json file filtering on apply
When applying from local preset with `--lint-staged` NOT specified, the system SHALL skip `.lintstagedrc.json`.

#### Scenario: lintstagedrc.json skipped on apply
- **WHEN** local preset contains `.lintstagedrc.json` and `--lint-staged` is NOT specified
- **THEN** `.lintstagedrc.json` SHALL NOT be copied to project root

### Requirement: detectPresetCapabilities extended for lint-staged
The `detectPresetCapabilities` function SHALL report `hasLintStaged` by checking for `.lintstagedrc.json` file or `lint-staged` in devDependencies.

#### Scenario: Lint-staged capability detected
- **WHEN** local preset has `.lintstagedrc.json` or `lint-staged` in devDependencies
- **THEN** `hasLintStaged` SHALL be `true`

#### Scenario: --lint-staged flag warns when preset has no lint-staged config
- **WHEN** user runs `lux fmt <custom> --lint-staged` and `hasLintStaged` is `false`
- **THEN** the system SHALL warn that `--lint-staged` has no effect for this preset
