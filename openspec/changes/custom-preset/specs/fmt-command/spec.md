## ADDED Requirements

### Requirement: Custom preset execution
The `lux fmt` command SHALL accept any preset name that matches a valid directory under `~/.lux/preset/fmt/<name>/` containing a `package.json` file, even if the name is not in the built-in `FMT_PRESETS` array.

#### Scenario: Custom preset applied via local path
- **WHEN** user runs `lux fmt my-custom` and `~/.lux/preset/fmt/my-custom/` exists with a `package.json`
- **AND** `my-custom` is NOT in `FMT_PRESETS`
- **THEN** the system SHALL execute the local preset path (`applyLocalFmtPreset`)
- **AND** output SHALL indicate "Using local custom preset"

#### Scenario: Custom preset not found
- **WHEN** user runs `lux fmt unknown-preset` and neither `FMT_PRESETS` nor `~/.lux/preset/fmt/unknown-preset/` exists
- **THEN** the system SHALL display an error with fuzzy matching against ALL available preset names (builtin + custom combined)

#### Scenario: Custom preset directory exists without package.json
- **WHEN** user runs `lux fmt my-custom` and `~/.lux/preset/fmt/my-custom/` exists but has no `package.json`
- **THEN** the system SHALL treat it as not found and display error with fuzzy matching

### Requirement: fmt list shows custom presets
`lux fmt list` SHALL display both built-in and custom presets. Built-in presets SHALL be listed first, followed by custom presets. Custom presets SHALL be marked with `(custom)` in a distinct color.

#### Scenario: List with custom presets
- **WHEN** `~/.lux/preset/fmt/` contains directories `web-vue` (builtin name), `my-custom`, and `team-libs`
- **AND** `my-custom` and `team-libs` each contain a `package.json`
- **THEN** output SHALL list all built-in presets first, then `my-custom` and `team-libs` with `(custom)` marker
- **AND** the `(custom)` marker SHALL be rendered in a distinct chalk color

#### Scenario: List without custom presets
- **WHEN** `~/.lux/preset/fmt/` contains only builtin preset names or does not exist
- **THEN** output SHALL list only built-in presets (unchanged behavior)

#### Scenario: Custom preset directory without package.json
- **WHEN** `~/.lux/preset/fmt/` contains a directory `incomplete` without a `package.json`
- **THEN** `incomplete` SHALL NOT appear in the list

### Requirement: --reset aborts for custom presets
When `--reset` is used with a preset name that is NOT in `FMT_PRESETS`, the system SHALL warn and abort the entire command without applying the preset.

#### Scenario: --reset with custom preset
- **WHEN** user runs `lux fmt my-custom --reset` and `my-custom` is NOT in `FMT_PRESETS`
- **THEN** the system SHALL output a warning message indicating the preset is custom and has no builtin to restore
- **AND** the system SHALL NOT apply the preset or perform any file operations

## MODIFIED Requirements

### Requirement: Stylelint script filtering enhancement
When `--stylelint` is NOT specified, the system SHALL filter stylelint-related scripts by both:
1. Stripping inline `&& stylelint "..."` segments from script values (existing behavior)
2. Removing entire script entries whose key contains the string `stylelint` (case-sensitive)

#### Scenario: Standalone stylelint script filtered
- **WHEN** preset has `"stylelint:check": "stylelint \"src/**\""` and `--stylelint` is NOT specified
- **THEN** the `stylelint:check` script SHALL be completely removed (not injected into project)

#### Scenario: Mixed lint script with inline stylelint
- **WHEN** preset has `"lint": "eslint . && stylelint \"src/**\""` and `--stylelint` is NOT specified
- **THEN** the script SHALL be injected as `"lint": "eslint ."` (inline segment stripped, entry preserved)

#### Scenario: Stylelint script preserved with --stylelint flag
- **WHEN** preset has `"stylelint:check": "stylelint \"src/**\""` and `--stylelint` IS specified
- **THEN** the `stylelint:check` script SHALL be injected normally

### Requirement: Editorconfig script filtering
When `--editorconfig` is NOT specified, the system SHALL remove entire script entries whose key contains the string `editorconfig` (case-sensitive).

#### Scenario: Editorconfig script filtered
- **WHEN** preset has `"editorconfig:check": "editorconfig-checker"` and `--editorconfig` is NOT specified
- **THEN** the `editorconfig:check` script SHALL be completely removed

#### Scenario: Editorconfig script preserved with --editorconfig flag
- **WHEN** preset has `"editorconfig:check": "editorconfig-checker"` and `--editorconfig` IS specified
- **THEN** the script SHALL be injected normally
