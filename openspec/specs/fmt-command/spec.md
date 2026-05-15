# fmt-command

## ADDED Requirements

### Requirement: --reset flag for fmt command
The `lux fmt` command SHALL accept a `--reset` flag that deletes the local preset directory before execution, forcing re-materialization from the built-in preset.

#### Scenario: Reset with existing local preset
- **WHEN** user runs `lux fmt web-vue --reset` and `.lux/preset/fmt/web-vue/` exists
- **THEN** the system SHALL delete `.lux/preset/fmt/web-vue/` and proceed with built-in generation + materialization

#### Scenario: Reset without local preset
- **WHEN** user runs `lux fmt web-vue --reset` and no local preset exists
- **THEN** the system SHALL proceed normally with built-in generation + materialization (no error)

### Requirement: Local preset detection in fmt command
The `lux fmt` command SHALL check for an existing local preset directory before executing the built-in generation pipeline. If a local preset exists, the command SHALL use the local preset path instead.

#### Scenario: Local preset exists — skip built-in generation
- **WHEN** `.lux/preset/fmt/<preset>/` exists
- **THEN** `generateAllFmt` SHALL NOT be called
- **AND** files SHALL be copied from local preset directory to project root

#### Scenario: No local preset — built-in generation + materialization
- **WHEN** `.lux/preset/fmt/<preset>/` does not exist
- **THEN** the existing `generateAllFmt` pipeline SHALL execute unchanged
- **AND** after completion, generated files SHALL be materialized to `.lux/preset/fmt/<preset>/`

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

### Requirement: Editorconfig script filtering
When `--editorconfig` is NOT specified, the system SHALL remove entire script entries whose key contains the string `editorconfig` (case-sensitive).

#### Scenario: Editorconfig script filtered
- **WHEN** preset has `"editorconfig:check": "editorconfig-checker"` and `--editorconfig` is NOT specified
- **THEN** the `editorconfig:check` script SHALL be completely removed

### Requirement: --cspell flag for fmt command
The `lux fmt` command SHALL accept a `--cspell` flag that includes CSpell configuration generation, dependency installation, and script injection. When `--cspell` is NOT specified, all CSpell-related files, dependencies, and script segments SHALL be excluded.

#### Scenario: --cspell flag includes CSpell
- **WHEN** user runs `lux fmt web-vue --cspell`
- **THEN** cspell.json SHALL be generated
- **AND** cspell dependency SHALL be installed
- **AND** lint script SHALL include the cspell check segment

#### Scenario: No --cspell flag excludes CSpell
- **WHEN** user runs `lux fmt web-vue` without `--cspell`
- **THEN** cspell.json SHALL NOT be generated
- **AND** cspell dependency SHALL NOT be installed
- **AND** lint script SHALL NOT include the cspell check segment

### Requirement: CSpell script filtering enhancement
When `--cspell` is NOT specified, the system SHALL filter cspell-related scripts by both:
1. Stripping inline `&& cspell ...` segments from script values
2. Removing entire script entries whose key contains the string `cspell` (case-sensitive)

#### Scenario: Standalone cspell script filtered
- **WHEN** preset has `"cspell:check": "cspell --gitignore \"src/**/*\""` and `--cspell` is NOT specified
- **THEN** the `cspell:check` script SHALL be completely removed (not injected into project)

#### Scenario: Mixed lint script with inline cspell
- **WHEN** preset has `"lint": "eslint . && cspell --gitignore \"src/**/*\" && vue-tsc --noEmit"` and `--cspell` is NOT specified
- **THEN** the script SHALL be injected as `"lint": "eslint . && vue-tsc --noEmit"` (inline segment stripped, entry preserved)

### Requirement: CSpell dependency filtering
When `--cspell` is NOT specified, the system SHALL NOT install the `cspell` package. Filtering SHALL match by exact package name `cspell` only.

#### Scenario: cspell dependency excluded
- **WHEN** preset devDependencies include `['eslint', 'prettier', 'cspell']` and `--cspell` is NOT specified
- **THEN** only `eslint` and `prettier` SHALL be installed

#### Scenario: cspell dependency included
- **WHEN** preset devDependencies include `['eslint', 'prettier', 'cspell']` and `--cspell` IS specified
- **THEN** all three packages including `cspell` SHALL be installed
