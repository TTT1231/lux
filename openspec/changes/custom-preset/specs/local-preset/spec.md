## ADDED Requirements

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

#### Scenario: Invalid — directory does not exist
- **WHEN** checking name `nonexistent`
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

#### Scenario: Inline stylelint stripping still works
- **WHEN** template `package.json` has `"lint": "eslint . && stylelint \"src/**\""` and `noStylelint` is true
- **THEN** the script SHALL be merged as `"lint": "eslint ."` (inline stripped, entry preserved)
