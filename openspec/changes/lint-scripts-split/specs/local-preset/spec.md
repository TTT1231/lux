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
The system SHALL read config files from the local preset directory and copy them to the project root. Scripts SHALL be read from template `package.json`. Dependencies SHALL be handled by the command layer (`executeLocalPath`) via `addDepsToManifest`, NOT by `mergeTemplateIntoProject`.

#### Scenario: Config files copied to project root
- **WHEN** local preset exists with `eslint.config.mjs`, `.prettierrc`, `cspell.json`
- **THEN** all files SHALL be copied to the project root directory

#### Scenario: Dependencies resolved by command layer, not mergeTemplateIntoProject
- **WHEN** local preset has `deps.json` with `{"eslint": {"devDependencies": {"eslint": "<latest>"}}}`
- **THEN** `mergeTemplateIntoProject` SHALL NOT write deps to project package.json
- **AND** `executeLocalPath` SHALL collect deps via `collectDepsFromRegistry` and resolve versions via `addDepsToManifest`

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

### Requirement: Template package.json uses devDependencies
**Reason**: deps.json is now the sole dependency source. Template package.json no longer contains `devDependencies`. Dependencies are resolved by the command layer via `addDepsToManifest`, not by `mergeTemplateIntoProject`.
**Migration**: Dependencies are read from `deps.json` tool groups and top-level keys. The `<latest>` placeholder in deps.json is resolved at install time by `addDepsToManifest`/`fetchPackageVersion`.
