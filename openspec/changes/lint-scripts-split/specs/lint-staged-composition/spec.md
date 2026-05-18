# lint-staged-composition

## ADDED Requirements

### Requirement: Per-tool lint-staged fragment definition
The `FmtPreset` interface SHALL support a `lintStagedFragments` field that defines lint-staged entries per tool. Each fragment SHALL be a mapping of glob patterns to command arrays, keyed by tool name.

#### Scenario: Preset with lint-staged fragments
- **WHEN** a preset defines `lintStagedFragments: { eslint: { "*.{ts,js,vue}": ["eslint --fix"] }, stylelint: { "*.{css,scss,vue}": ["stylelint --fix"] }, prettier: { "*.{ts,js,vue}": ["prettier --write"], "*.{css,scss,vue}": ["prettier --write"] } }`
- **THEN** each tool's fragment SHALL be independently includable or excludable

### Requirement: Dynamic lint-staged composition from fragments
The system SHALL compose `.lintstagedrc.json` by merging the fragments of all active tools. A tool's fragment SHALL be included only when the corresponding flag is active.

#### Scenario: All flags active
- **WHEN** `--stylelint` and `--cspell` are both active and eslint/prettier are always active
- **THEN** `.lintstagedrc.json` SHALL contain merged entries from eslint, stylelint, prettier, and cspell fragments

#### Scenario: Stylelint flag inactive
- **WHEN** `--stylelint` is NOT active
- **THEN** `.lintstagedrc.json` SHALL NOT contain any stylelint fragment entries
- **AND** eslint and prettier entries SHALL still be present

### Requirement: Glob pattern merging across fragments
When multiple tools define commands for the same glob pattern, the system SHALL merge their command arrays into a single entry.

#### Scenario: Same glob in multiple fragments
- **WHEN** eslint fragment has `{ "*.{ts,js,vue}": ["eslint --fix"] }` and prettier fragment has `{ "*.{ts,js,vue}": ["prettier --write"] }`
- **THEN** the composed output SHALL contain `{ "*.{ts,js,vue}": ["eslint --fix", "prettier --write"] }`

### Requirement: Empty glob key cleanup
After merging fragments, if any glob pattern maps to an empty array `[]`, the system SHALL remove that glob key entirely from the output.

#### Scenario: Glob becomes empty after fragment exclusion
- **WHEN** only stylelint defines `{ "*.vue": ["stylelint --fix"] }` and `--stylelint` is NOT active
- **AND** no other tool defines commands for `*.vue`
- **THEN** the `*.vue` key SHALL NOT appear in the composed output

### Requirement: Lint-staged fragment stays in preset code
The `lintStagedFragments` field SHALL be defined in preset TypeScript code, not in a separate file. This follows the same pattern as the `scripts` field.

#### Scenario: Fragment definition location
- **WHEN** a preset author wants to customize lint-staged behavior
- **THEN** they SHALL edit the preset's TypeScript code to modify `lintStagedFragments`

### Requirement: Lint-staged composition replaces static lintStaged function
The existing `lintStaged()` function that returns a static JSON string SHALL be replaced by the `lintStagedFragments` field. The system SHALL NOT use the old `lintStaged` function.

#### Scenario: Old lintStaged function ignored
- **WHEN** a preset has both `lintStaged()` and `lintStagedFragments`
- **THEN** the system SHALL use `lintStagedFragments` only
