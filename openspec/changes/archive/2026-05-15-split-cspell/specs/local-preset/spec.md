## ADDED Requirements

### Requirement: Materialization stores full template
Materialization SHALL store the FULL preset template regardless of flags. CSpell files, dependencies, and scripts SHALL always be included in the materialized local preset, even when `--cspell` is NOT specified. This preserves the local preset as a reusable template — the user can add `--cspell` on subsequent runs without `--reset`.

#### Scenario: Materialization always includes cspell
- **WHEN** first run uses `lux fmt web-vue` without `--cspell`
- **THEN** cspell.json SHALL be copied to `.lux/preset/fmt/web-vue/`
- **AND** cspell dependency SHALL appear in template `package.json`
- **AND** cspell-related scripts SHALL appear in template `package.json`

### Requirement: Apply local preset respects cspell flag
When applying from local preset, `--cspell` flag SHALL filter cspell files, dependencies, and scripts just as it does in the built-in path.

#### Scenario: --cspell flag NOT specified filters cspell from local preset
- **WHEN** local preset contains cspell.json and cspell dependency but `--cspell` is NOT specified
- **THEN** cspell.json SHALL NOT be copied to project root
- **AND** cspell dependency SHALL NOT be merged into project's `package.json`
- **AND** cspell-related scripts SHALL be filtered per CSpell script filtering rules

#### Scenario: --cspell flag specified includes cspell from local preset
- **WHEN** local preset contains cspell.json and `--cspell` IS specified
- **THEN** cspell.json SHALL be copied to project root
- **AND** cspell dependency SHALL be merged into project's `package.json`

## MODIFIED Requirements

### Requirement: Script entry filtering in mergeTemplateIntoProject
The `mergeTemplateIntoProject` function SHALL filter entire script entries by convention: when `noStylelint` is true, entries with keys containing `stylelint` (case-sensitive) SHALL be skipped. When `noEditorconfig` is true, entries with keys containing `editorconfig` (case-sensitive) SHALL be skipped. When `noCspell` is true, entries with keys containing `cspell` (case-sensitive) SHALL be skipped.

#### Scenario: Stylelint script entry skipped in local path
- **WHEN** template `package.json` has `"stylelint:check": "stylelint \"src/**\""` and `noStylelint` is true
- **THEN** the `stylelint:check` script SHALL NOT be merged into the project's `package.json`

#### Scenario: Editorconfig script entry skipped in local path
- **WHEN** template `package.json` has `"editorconfig:check": "editorconfig-checker"` and `noEditorconfig` is true
- **THEN** the `editorconfig:check` script SHALL NOT be merged into the project's `package.json`

#### Scenario: CSpell script entry skipped in local path
- **WHEN** template `package.json` has `"cspell:check": "cspell --gitignore \"src/**/*\""` and `noCspell` is true
- **THEN** the `cspell:check` script SHALL NOT be merged into the project's `package.json`

### Requirement: Stylelint and editorconfig filtering on apply
When applying from local preset, `--stylelint`, `--editorconfig`, and `--cspell` flags SHALL filter files, dependencies, and scripts just as they do in the built-in path.

#### Scenario: --stylelint flag filters stylelint from local preset
- **WHEN** local preset contains stylelint files but `--stylelint` is NOT specified
- **THEN** `stylelint.config.mjs`, `.stylelintignore`, stylelint-related deps and scripts SHALL be skipped

#### Scenario: --editorconfig flag filters editorconfig from local preset
- **WHEN** local preset contains `.editorconfig` but `--editorconfig` is NOT specified
- **THEN** `.editorconfig` SHALL be skipped

#### Scenario: --cspell flag filters cspell from local preset
- **WHEN** local preset contains cspell files but `--cspell` is NOT specified
- **THEN** `cspell.json`, cspell-related deps and scripts SHALL be skipped
