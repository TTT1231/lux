# fmt-command

## MODIFIED Requirements

### Requirement: Stylelint script filtering enhancement
When `--stylelint` is NOT specified, the system SHALL filter stylelint-related scripts by removing entire script entries whose key contains the string `stylelint` (case-sensitive). Regex-based inline stripping of `&& stylelint "..."` segments SHALL NOT be used.

#### Scenario: Standalone stylelint script filtered
- **WHEN** preset has `"stylelint": "stylelint \"src/**/*.{css,scss,vue}\""` and `--stylelint` is NOT specified
- **THEN** the `stylelint` script SHALL NOT be injected into the project

#### Scenario: Stylelint fix script filtered
- **WHEN** preset has `"stylelint:fix": "stylelint \"src/**/*.{css,scss,vue}\" --fix"` and `--stylelint` is NOT specified
- **THEN** the `stylelint:fix` script SHALL NOT be injected into the project

#### Scenario: Non-stylelint scripts preserved
- **WHEN** preset has `"eslint": "eslint \"src/**/*.{ts,js,vue}\""` and `--stylelint` is NOT specified
- **THEN** the `eslint` script SHALL be injected normally

## ADDED Requirements

### Requirement: Individual tool scripts
Each preset SHALL define individual scripts per tool instead of aggregated `lint`/`lint:fix` scripts. The standard script names SHALL be: `eslint`, `eslint:fix`, `stylelint`, `stylelint:fix`, `cspell`, `type:check`, `format`, `lint-staged`.

#### Scenario: Web-vue preset scripts
- **WHEN** `lux fmt web-vue` is run with all flags active
- **THEN** package.json SHALL receive scripts: `eslint`, `eslint:fix`, `stylelint`, `stylelint:fix`, `cspell`, `type:check`, `format`, `lint-staged`
- **AND** SHALL NOT receive aggregated `lint` or `lint:fix` scripts

#### Scenario: Each preset has its own eslint glob
- **WHEN** `web-vue` preset is applied
- **THEN** `eslint` script SHALL contain glob `*.{ts,js,vue}`
- **WHEN** `web-react` preset is applied
- **THEN** `eslint` script SHALL contain glob `*.{ts,js,jsx,tsx}`

### Requirement: User's existing lint/lint:fix scripts are not touched
The system SHALL NOT modify or remove existing `lint` or `lint:fix` scripts in the user's `package.json`. The injectScripts function SHALL only add new individual tool scripts.

#### Scenario: User has existing lint script
- **WHEN** the user's package.json already has `"lint": "npm run eslint && npm run cspell"` and `--force` is NOT specified
- **THEN** the existing `lint` script SHALL remain unchanged

### Requirement: GenerateOptions uses positive flag semantics
The `GenerateOptions` interface SHALL use positive boolean flags: `stylelint`, `cspell`, `editorconfig`, `husky`, `lintStaged` (default `false`). The `noStylelint`, `noCspell`, etc. fields SHALL be removed.

#### Scenario: Flag defaults to false
- **WHEN** user runs `lux fmt web-vue` without any tool flags
- **THEN** `GenerateOptions.stylelint` SHALL be `false`
- **AND** `GenerateOptions.cspell` SHALL be `false`

#### Scenario: Flag set to true
- **WHEN** user runs `lux fmt web-vue --stylelint`
- **THEN** `GenerateOptions.stylelint` SHALL be `true`

### Requirement: filterScripts uses key-based deletion
The `filterScripts` function SHALL filter scripts by checking if the script key matches a tool name. It SHALL NOT use regex to modify script values.

#### Scenario: filterScripts removes stylelint by key
- **WHEN** scripts contain `{ "eslint": "...", "stylelint": "...", "stylelint:fix": "...", "cspell": "..." }` and `stylelint` flag is `false`
- **THEN** the result SHALL contain `{ "eslint": "...", "cspell": "..." }`
- **AND** no regex modification of script values SHALL occur

#### Scenario: filterScripts removes cspell by key
- **WHEN** `cspell` flag is `false`
- **THEN** any script with key `cspell` SHALL be removed

### Requirement: Dependency filtering reads from deps.json
When determining which dependencies to install, the system SHALL read the tool's entry from `deps.json` when the corresponding flag is active. The `isNotStylelintDep`, `isNotEditorconfigDep`, `isNotCspellDep`, `isNotHuskyDep`, `isNotLintStagedDep` functions and `STYLELINT_DEPS`, `HUSKY_DEPS`, `LINTSTAGED_DEPS` Sets SHALL be removed.

#### Scenario: Active flag reads deps.json
- **WHEN** `--stylelint` is active and `deps.json["stylelint"].devDependencies` is `{"stylelint": "^16.0.0", "postcss-html": "^1.0.0"}`
- **THEN** the system SHALL install `stylelint` and `postcss-html` (if not already present)

#### Scenario: Inactive flag skips deps.json entry
- **WHEN** `--stylelint` is NOT active
- **THEN** the system SHALL NOT read `deps.json["stylelint"]` or install any stylelint deps

### Requirement: injectScripts only adds, never deletes
The `injectScripts` function SHALL only add new scripts. It SHALL NOT delete existing scripts from the user's package.json, even if the corresponding flag is inactive.

#### Scenario: Inactive flag does not remove existing script
- **WHEN** user's package.json has `"stylelint": "stylelint \"src/**\""` but `--stylelint` is NOT specified
- **THEN** the existing `stylelint` script SHALL remain in package.json

#### Scenario: Active flag adds script if not present
- **WHEN** `--stylelint` is active and user's package.json does not have a `stylelint` key
- **THEN** `stylelint` script SHALL be added

#### Scenario: Active flag skips if already present without --force
- **WHEN** `--stylelint` is active and user's package.json already has a `stylelint` key and `--force` is NOT specified
- **THEN** the existing script SHALL be preserved (not overwritten)
