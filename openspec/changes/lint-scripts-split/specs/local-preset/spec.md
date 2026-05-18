# local-preset

## MODIFIED Requirements

### Requirement: Fmt preset materialization
After the existing generation pipeline completes successfully, the system SHALL copy all generated config files from the project root to the local preset directory, copy `deps.json` from the builtin preset, and create a template `package.json` containing only `scripts` (no `devDependencies`).

#### Scenario: First run materializes all config files and deps.json
- **WHEN** `lux fmt web-vue --no-install` is run for the first time and generates `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `cspell.json`
- **THEN** `.lux/preset/fmt/web-vue/` SHALL contain copies of all those files plus `deps.json` and a `package.json` with `scripts` only
- **AND** `.lintstagedrc.json` SHALL NOT be materialized (lint-staged is dynamically composed from fragments at runtime)

#### Scenario: Template package.json has no devDependencies
- **WHEN** the template `package.json` is created during materialization
- **THEN** it SHALL NOT contain a `devDependencies` section
- **AND** `scripts` values SHALL preserve `<pm>` placeholders

#### Scenario: deps.json copied from builtin preset
- **WHEN** materialization occurs for builtin preset `web-vue`
- **THEN** `deps.json` from `src/presets/fmt/web-vue/deps.json` SHALL be copied to `~/.lux/preset/fmt/web-vue/deps.json`

#### Scenario: Materialization stores full template regardless of flags
- **WHEN** first run uses `lux fmt web-vue` without `--cspell`
- **THEN** cspell.json SHALL still be copied to `.lux/preset/fmt/web-vue/`
- **AND** deps.json SHALL contain ALL tool entries (including cspell)
- **AND** cspell-related scripts SHALL appear in template `package.json`

### Requirement: Apply local fmt preset
The system SHALL read config files from the local preset directory and copy them to the project root. Dependencies SHALL be read from `deps.json` (not template `package.json`). Scripts SHALL be read from template `package.json`.

#### Scenario: Config files copied to project root
- **WHEN** local preset exists with `eslint.config.mjs`, `.prettierrc`, `cspell.json`
- **THEN** all files SHALL be copied to the project root directory

#### Scenario: Dependencies read from deps.json
- **WHEN** local preset has `deps.json` with `{"eslint": {"devDependencies": {"eslint": "^9.0.0"}}}`
- **AND** `--stylelint` is active and `deps.json` has `{"stylelint": {"devDependencies": {"stylelint": "^16.0.0"}}}`
- **THEN** eslint deps SHALL always be installed
- **AND** stylelint deps SHALL be installed based on flag

#### Scenario: Scripts merged from template package.json
- **WHEN** local preset `package.json` has `scripts` section
- **THEN** scripts SHALL be merged into project's `package.json` with key-based filtering
- **AND** existing scripts with same names SHALL be skipped (project version preserved)

#### Scenario: `<pm>` placeholder resolved at merge time
- **WHEN** a script value contains `<pm>` in local preset `package.json`
- **THEN** `<pm>` SHALL be replaced with the detected package manager run prefix before merging

#### Scenario: Missing deps.json causes error
- **WHEN** local preset directory exists but has no `deps.json`
- **THEN** the system SHALL stop with an error suggesting `--reset`

#### Scenario: Existing project file not overwritten without --force
- **WHEN** a config file already exists in the project root and `--force` is NOT specified
- **THEN** the file SHALL be skipped

#### Scenario: Existing project file overwritten with --force
- **WHEN** a config file already exists in the project root and `--force` IS specified
- **THEN** the file SHALL be overwritten with the local preset version

### Requirement: Stylelint and editorconfig filtering on apply
When applying from local preset, `--stylelint`, `--editorconfig`, and `--cspell` flags SHALL filter files, dependencies, and scripts using positive boolean semantics and deps.json tool keys.

#### Scenario: --stylelint flag filters stylelint from local preset
- **WHEN** local preset contains stylelint files but `stylelint` flag is `false`
- **THEN** `stylelint.config.mjs`, `.stylelintignore`, stylelint-related deps and scripts SHALL be skipped

#### Scenario: --editorconfig flag filters editorconfig from local preset
- **WHEN** local preset contains `.editorconfig` but `editorconfig` flag is `false`
- **THEN** `.editorconfig` SHALL be skipped

#### Scenario: --cspell flag filters cspell from local preset
- **WHEN** local preset contains cspell files but `cspell` flag is `false`
- **THEN** `cspell.json`, cspell-related deps and scripts SHALL be skipped

### Requirement: Script entry filtering in mergeTemplateIntoProject
The `mergeTemplateIntoProject` function SHALL filter entire script entries by key matching: when `stylelint` flag is `false`, entries with keys containing `stylelint` SHALL be skipped. Same convention for `editorconfig`, `cspell`, `lintStaged` flags.

#### Scenario: Stylelint script entry skipped in local path
- **WHEN** template `package.json` has `"stylelint": "stylelint \"src/**\""` and `stylelint` flag is `false`
- **THEN** the `stylelint` script SHALL NOT be merged into the project's `package.json`

#### Scenario: Editorconfig script entry skipped in local path
- **WHEN** template `package.json` has `"editorconfig:check": "editorconfig-checker"` and `editorconfig` flag is `false`
- **THEN** the `editorconfig:check` script SHALL NOT be merged into the project's `package.json`

#### Scenario: CSpell script entry skipped in local path
- **WHEN** template `package.json` has `"cspell": "cspell --gitignore \"src/**/*\""` and `cspell` flag is `false`
- **THEN** the `cspell` script SHALL NOT be merged into the project's `package.json`

## REMOVED Requirements

### Requirement: Template package.json uses placeholders
**Reason**: deps.json is now the sole dependency source. Template package.json no longer contains devDependencies, so `<latest>` placeholders are unnecessary.
**Migration**: Dependencies are read directly from `deps.json` tool groups instead of parsing `<latest>` placeholders in template package.json.

### Requirement: `<latest>` placeholder resolved at install time
**Reason**: `resolveLocalDeps` now reads from `deps.json` directly. The `<latest>` placeholder system is eliminated.
**Migration**: deps.json entries contain actual version ranges (e.g. `"^9.0.0"`). The system reads and installs these directly.
