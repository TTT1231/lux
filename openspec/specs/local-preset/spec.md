# local-preset

## ADDED Requirements

### Requirement: Local preset directory path convention
The system SHALL use `.lux/preset/<type>/<preset-name>/` as the local preset directory path, where `<type>` is `fmt` or `vscode`, and `<preset-name>` matches the built-in preset name (e.g. `web-vue`).

#### Scenario: Fmt preset directory path
- **WHEN** a fmt preset named `web-vue` is materialized
- **THEN** the local preset directory SHALL be `.lux/preset/fmt/web-vue/`

#### Scenario: VSCode preset directory path
- **WHEN** a vscode preset named `web-vue` is materialized
- **THEN** the local preset directory SHALL be `.lux/preset/vscode/web-vue/`

### Requirement: Local preset existence detection
The system SHALL detect whether a local preset directory exists for a given preset name before executing generation logic.

#### Scenario: Local preset directory exists
- **WHEN** `.lux/preset/fmt/web-vue/` directory exists
- **THEN** the system SHALL use the local preset path instead of built-in generation

#### Scenario: Local preset directory does not exist
- **WHEN** `.lux/preset/fmt/web-vue/` directory does not exist
- **THEN** the system SHALL use the built-in generation pipeline

### Requirement: Fmt preset materialization
After the existing generation pipeline completes successfully, the system SHALL copy all generated config files from the project root to the local preset directory and create a template `package.json` containing `devDependencies` and `scripts`.

#### Scenario: First run materializes all config files
- **WHEN** `lux fmt web-vue --no-install` is run for the first time and generates `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `cspell.json`
- **THEN** `.lux/preset/fmt/web-vue/` SHALL contain copies of all those files plus a `package.json` with `devDependencies` and `scripts`

#### Scenario: Template package.json uses placeholders
- **WHEN** the template `package.json` is created
- **THEN** `devDependencies` versions SHALL use `<latest>` placeholder (e.g. `"eslint": "<latest>"`)
- **AND** `scripts` values SHALL preserve `<pm>` placeholders (e.g. `"code:check": "<pm> lint && <pm> format:check"`)

#### Scenario: Materialization respects stylelint flag
- **WHEN** first run uses `--stylelint` flag
- **THEN** stylelint config files and stylelint-related deps SHALL be included in materialization
- **AND** when `--stylelint` is NOT used, stylelint files and deps SHALL NOT be materialized

#### Scenario: Materialization respects editorconfig flag
- **WHEN** first run uses `--editorconfig` flag
- **THEN** `.editorconfig` SHALL be included in materialization
- **AND** when `--editorconfig` is NOT used, `.editorconfig` SHALL NOT be materialized

### Requirement: VSCode preset materialization
After the existing VSCode generation pipeline completes, the system SHALL copy `.vscode/settings.json` and `.vscode/extensions.json` to the local preset directory. No `package.json` is created for VSCode presets.

#### Scenario: VSCode preset materialized
- **WHEN** `lux vscode web-vue` is run for the first time
- **THEN** `.lux/preset/vscode/web-vue/` SHALL contain `settings.json` and `extensions.json`

### Requirement: Apply local fmt preset
The system SHALL read config files from the local preset directory and copy them to the project root. The template `package.json` SHALL be merged into the project's `package.json`.

#### Scenario: Config files copied to project root
- **WHEN** local preset exists with `eslint.config.mjs`, `.prettierrc`, `cspell.json`
- **THEN** all files SHALL be copied to the project root directory

#### Scenario: Template package.json merged into project
- **WHEN** local preset `package.json` has `devDependencies` and `scripts`
- **THEN** `devDependencies` SHALL be merged into project's `package.json` with deduplication
- **AND** `scripts` with names that already exist in the project SHALL be skipped (project version preserved)
- **AND** the system SHALL log which scripts were skipped due to conflict

#### Scenario: `<latest>` placeholder resolved at install time
- **WHEN** a dependency version is `<latest>` in local preset `package.json`
- **THEN** the system SHALL install the package without a version specifier (PM picks latest)
- **AND** when the version is a specific string (e.g. `"^9.0.0"`), the system SHALL install with that version

#### Scenario: `<pm>` placeholder resolved at merge time
- **WHEN** a script value contains `<pm>` in local preset `package.json`
- **THEN** `<pm>` SHALL be replaced with the detected package manager run prefix before merging

#### Scenario: Existing project file not overwritten without --force
- **WHEN** a config file already exists in the project root and `--force` is NOT specified
- **THEN** the file SHALL be skipped

#### Scenario: Existing project file overwritten with --force
- **WHEN** a config file already exists in the project root and `--force` IS specified
- **THEN** the file SHALL be overwritten with the local preset version

### Requirement: Apply local vscode preset
The system SHALL read `settings.json` and `extensions.json` from the local preset directory. Settings SHALL be merged using the existing `mergeVscodeSettings()` function. Extensions SHALL be written directly.

#### Scenario: VSCode settings merged
- **WHEN** local preset has `settings.json` and project has existing `.vscode/settings.json`
- **THEN** settings SHALL be deep-merged with existing priority rules (lint/format → preset wins, personal → user wins)

#### Scenario: VSCode extensions written
- **WHEN** local preset has `extensions.json`
- **THEN** `.vscode/extensions.json` SHALL be written with the preset's recommendations

### Requirement: Stylelint and editorconfig filtering on apply
When applying from local preset, `--stylelint` and `--editorconfig` flags SHALL filter files, dependencies, and scripts just as they do in the built-in path.

#### Scenario: --stylelint flag filters stylelint from local preset
- **WHEN** local preset contains stylelint files but `--stylelint` is NOT specified
- **THEN** `stylelint.config.mjs`, `.stylelintignore`, stylelint-related deps and scripts SHALL be skipped

#### Scenario: --editorconfig flag filters editorconfig from local preset
- **WHEN** local preset contains `.editorconfig` but `--editorconfig` is NOT specified
- **THEN** `.editorconfig` SHALL be skipped

### Requirement: Incomplete local preset handling
When the local preset directory exists but some files are missing (user deleted them), the system SHALL copy only the available files. No auto-completion from built-in presets.

#### Scenario: User deleted a file from local preset
- **WHEN** local preset has `eslint.config.mjs` and `.prettierrc` but `cspell.json` was deleted by user
- **THEN** only `eslint.config.mjs` and `.prettierrc` SHALL be copied; no error or warning about missing `cspell.json`

### Requirement: Local preset reset
The system SHALL support a `--reset` flag that deletes the local preset directory, allowing the next execution to re-materialize from the built-in preset.

#### Scenario: Reset deletes local preset
- **WHEN** `lux fmt web-vue --reset` is executed
- **THEN** `.lux/preset/fmt/web-vue/` directory SHALL be deleted
- **AND** the command SHALL proceed with the built-in generation + materialization flow

#### Scenario: Reset without local preset
- **WHEN** `lux fmt web-vue --reset` is executed but no local preset exists
- **THEN** the command SHALL proceed normally (no error for missing directory)

### Requirement: Dry-run support for local preset path
The system SHALL support `--dry-run` when using local preset. No files SHALL be written; a preview of what would be copied/merged/skipped SHALL be shown.

#### Scenario: Dry-run with local preset
- **WHEN** `lux fmt web-vue --dry-run` is executed with an existing local preset
- **THEN** no files SHALL be written to project root or merged into `package.json`
- **AND** output SHALL show which files would be created, overwritten, or skipped

### Requirement: Result feedback distinguishes paths
The system SHALL clearly indicate in its output whether it used the built-in generation path or the local preset path.

#### Scenario: First run feedback
- **WHEN** built-in generation + materialization is used
- **THEN** output SHALL indicate "first use, local preset created at .lux/preset/fmt/<preset>/"

#### Scenario: Subsequent run feedback
- **WHEN** local preset path is used
- **THEN** output SHALL indicate "using local custom preset"

### Requirement: Custom preset discovery
The system SHALL scan `~/.lux/preset/fmt/` to discover custom preset directories. A directory SHALL be considered a valid custom preset if it contains a `package.json` file and its name passes `isValidPresetName` validation.

#### Scenario: Discover custom presets
- **WHEN** `~/.lux/preset/fmt/` contains directories `my-custom` (with `package.json`), `team-libs` (with `package.json`), and `temp` (without `package.json`)
- **THEN** the system SHALL return `my-custom` and `team-libs` as valid custom presets
- **AND** `temp` SHALL be excluded

#### Scenario: No custom presets directory
- **WHEN** `~/.lux/preset/fmt/` does not exist
- **THEN** the system SHALL return an empty list without error

#### Scenario: Custom preset name validation
- **WHEN** `~/.lux/preset/fmt/` contains a directory named `../escape` or `path\traversal`
- **THEN** the directory SHALL be excluded from custom preset discovery

### Requirement: Custom preset validity check
The system SHALL provide a function to check whether a given name corresponds to a valid custom preset (directory exists + package.json present + name valid).

#### Scenario: Valid custom preset
- **WHEN** checking name `my-custom` and `~/.lux/preset/fmt/my-custom/package.json` exists
- **THEN** the function SHALL return true

#### Scenario: Invalid — no package.json
- **WHEN** checking name `my-custom` and `~/.lux/preset/fmt/my-custom/` exists but has no `package.json`
- **THEN** the function SHALL return false

## MODIFIED Requirements

### Requirement: Script entry filtering in mergeTemplateIntoProject
The `mergeTemplateIntoProject` function SHALL filter entire script entries by convention: when `noStylelint` is true, entries with keys containing `stylelint` (case-sensitive) SHALL be skipped. When `noEditorconfig` is true, entries with keys containing `editorconfig` (case-sensitive) SHALL be skipped.

#### Scenario: Stylelint script entry skipped in local path
- **WHEN** template `package.json` has `"stylelint:check": "stylelint \"src/**\""` and `noStylelint` is true
- **THEN** the `stylelint:check` script SHALL NOT be merged into the project's `package.json`

#### Scenario: Editorconfig script entry skipped in local path
- **WHEN** template `package.json` has `"editorconfig:check": "editorconfig-checker"` and `noEditorconfig` is true
- **THEN** the `editorconfig:check` script SHALL NOT be merged into the project's `package.json`
