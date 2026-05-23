## ADDED Requirements

### Requirement: --dry-run SHALL prevent local preset deletion
When `--dry-run` is combined with `--reset`, the system SHALL NOT delete the local preset directory. Instead it SHALL log what would be deleted.

#### Scenario: --dry-run --reset with existing local preset
- **WHEN** user runs `lux fmt web-vue --dry-run --reset` and `~/.lux/preset/fmt/web-vue/` exists
- **THEN** the system SHALL log `[dry-run] Would reset local preset: <path>`
- **AND** the local preset directory SHALL remain intact
- **AND** the command SHALL proceed with builtin generation in dry-run mode

#### Scenario: --dry-run --reset without local preset
- **WHEN** user runs `lux fmt web-vue --dry-run --reset` and no local preset exists
- **THEN** the system SHALL proceed normally (no deletion needed)

### Requirement: resetLocalPreset SHALL guard against dry-run
The `resetLocalPreset` function SHALL accept a `dryRun` option. When `dryRun` is true, the function SHALL NOT delete any files and SHALL log what would be deleted.

#### Scenario: resetLocalPreset with dryRun=true
- **WHEN** `resetLocalPreset('fmt', 'web-vue', { dryRun: true })` is called and the directory exists
- **THEN** no files SHALL be deleted
- **AND** a dry-run log message SHALL be emitted

### Requirement: Error conditions SHALL set process.exitCode to 1
All error returns in the fmt command SHALL set `process.exitCode = 1` before returning, so that CI/CD pipelines can detect failure.

#### Scenario: Invalid package.json sets exitCode
- **WHEN** `lux fmt web-vue` is run and `package.json` exists but contains invalid JSON
- **THEN** the system SHALL log an error message
- **AND** `process.exitCode` SHALL be `1`

#### Scenario: Invalid deps.json sets exitCode
- **WHEN** `lux fmt <custom>` is run and the local preset's `deps.json` contains invalid JSON
- **THEN** the system SHALL log an error message
- **AND** `process.exitCode` SHALL be `1`

#### Scenario: --reset on custom preset sets exitCode
- **WHEN** user runs `lux fmt my-custom --reset` and `my-custom` is not a builtin preset
- **THEN** the system SHALL warn that the preset is custom
- **AND** `process.exitCode` SHALL be `1`

### Requirement: package.json scripts merge SHALL validate type
When merging scripts from template into project, the system SHALL validate that `scripts` is a plain object. If `scripts` is not an object (e.g., string, array, null), the system SHALL treat it as empty and log a warning.

#### Scenario: Project scripts is a string
- **WHEN** project `package.json` has `"scripts": "echo hello"` (string, not object)
- **THEN** the system SHALL log a warning about unexpected scripts type
- **AND** new scripts SHALL be added to a fresh empty object
- **AND** the merge SHALL succeed without corrupting `package.json`

#### Scenario: Project scripts is an array
- **WHEN** project `package.json` has `"scripts": ["echo hello"]` (array)
- **THEN** the system SHALL log a warning about unexpected scripts type
- **AND** new scripts SHALL be added to a fresh empty object

#### Scenario: Project scripts is null
- **WHEN** project `package.json` has `"scripts": null`
- **THEN** the system SHALL treat scripts as empty and proceed normally
