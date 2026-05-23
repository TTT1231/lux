# deps-registry

## ADDED Requirements

### Requirement: deps.json file format
The system SHALL use a JSON file named `deps.json` organized by tool name as the sole source of dependency information. Each tool entry SHALL contain `dependencies` and/or `devDependencies` objects with package names as keys and version ranges as values.

#### Scenario: deps.json with multiple tools
- **WHEN** a preset's deps.json contains `{"eslint": {"devDependencies": {"eslint": "^9.0.0", "typescript-eslint": "^8.0.0"}}, "stylelint": {"devDependencies": {"stylelint": "^16.0.0"}}}`
- **THEN** the system SHALL be able to retrieve eslint deps via `deps["eslint"].devDependencies` and stylelint deps via `deps["stylelint"].devDependencies`

#### Scenario: deps.json with dependencies field
- **WHEN** a tool entry contains a `dependencies` field (as opposed to `devDependencies`)
- **THEN** the system SHALL treat those as runtime dependencies for installation purposes

### Requirement: deps.json location for builtin presets
Each builtin preset SHALL include a `deps.json` file at `src/presets/fmt/<preset-name>/deps.json`.

#### Scenario: Builtin preset deps.json path
- **WHEN** the builtin `web-vue` preset is loaded
- **THEN** the system SHALL read dependencies from `src/presets/fmt/web-vue/deps.json`

### Requirement: deps.json location for materialized presets
When a preset is materialized, the `deps.json` file SHALL be copied to the materialized preset directory at `~/.lux/preset/fmt/<preset-name>/deps.json`.

#### Scenario: deps.json copied during materialization
- **WHEN** `lux fmt web-vue` is run for the first time and materialization occurs
- **THEN** `deps.json` SHALL be present in `~/.lux/preset/fmt/web-vue/deps.json`

### Requirement: deps.json is the sole dependency source
The system SHALL NOT read dependency information from preset TypeScript code (`dependencies.dev` array) or template `package.json` (`devDependencies`). The `deps.json` file SHALL be the only source used for dependency installation decisions.

#### Scenario: No dependencies field in preset code
- **WHEN** a preset TypeScript file is loaded
- **THEN** the system SHALL NOT reference any `dependencies` field on the preset object for dep installation

#### Scenario: Template package.json has no devDependencies
- **WHEN** a materialized preset's template `package.json` is created
- **THEN** it SHALL NOT contain a `devDependencies` section

### Requirement: deps.json tool key matches flag names
The tool keys in `deps.json` SHALL correspond to the flag names: `eslint`, `stylelint`, `cspell`, `prettier`, `husky`, `lint-staged`. The system SHALL read deps for a tool by looking up its flag name as a key.

#### Scenario: Flag name maps to deps.json key
- **WHEN** `--stylelint` flag is active and the system needs to install stylelint deps
- **THEN** the system SHALL read `deps.json["stylelint"].devDependencies` to get the package list

### Requirement: deps.json dependency installation
When a flag is active, the system SHALL install all packages listed under the corresponding tool's `devDependencies` (and `dependencies`) that are not already present in the project's `package.json`.

#### Scenario: Flag active installs tool deps
- **WHEN** `--stylelint` is active and `deps.json["stylelint"].devDependencies` contains `{"stylelint": "^16.0.0", "postcss-html": "^1.0.0"}`
- **THEN** `stylelint` and `postcss-html` SHALL be installed if not already in the project's devDependencies

#### Scenario: Flag inactive skips tool deps
- **WHEN** `--stylelint` is NOT active
- **THEN** no stylelint-related packages SHALL be installed
- **AND** if the user already has `stylelint` in their project, it SHALL NOT be removed

### Requirement: deps.json never-delete policy
The system SHALL NEVER delete dependencies from the user's project `package.json`, regardless of which flags are active or inactive.

#### Scenario: User has deps for inactive tool
- **WHEN** `--cspell` is NOT active but the user's project already has `cspell` in devDependencies
- **THEN** `cspell` SHALL remain in the project's devDependencies untouched

### Requirement: deps.json corruption handling
If `deps.json` cannot be parsed as valid JSON, the system SHALL abort the operation and display an error message suggesting the user fix the file or re-materialize the preset.

#### Scenario: Malformed deps.json
- **WHEN** a materialized preset's `deps.json` contains invalid JSON
- **THEN** the system SHALL stop execution with an error message
- **AND** the error SHALL suggest running `lux fmt <preset> --reset` to re-materialize

#### Scenario: Missing deps.json in materialized preset
- **WHEN** a materialized preset directory exists but has no `deps.json`
- **THEN** the system SHALL stop execution with an error message suggesting `--reset`

### Requirement: deps.json loading interface
The system SHALL provide a unified loading interface that returns the same data shape regardless of whether the source is a builtin preset or a materialized preset. The consuming code SHALL NOT need to know the source.

#### Scenario: Builtin preset deps loading
- **WHEN** the system loads deps for builtin preset `web-vue`
- **THEN** the result SHALL be the same data shape as loading from a materialized preset

#### Scenario: Materialized preset deps loading
- **WHEN** the system loads deps from `~/.lux/preset/fmt/my-custom/deps.json`
- **THEN** the result SHALL be the same data shape as loading from a builtin preset

### Requirement: deps.json always-included tools
Tools that are always present (eslint, prettier) SHALL have their deps installed regardless of flags. The system SHALL always read `deps.json["eslint"]` and `deps.json["prettier"]` entries.

#### Scenario: Eslint deps always installed
- **WHEN** any preset is applied and `deps.json["eslint"]` exists
- **THEN** eslint-related packages SHALL be installed (filtered against project's existing deps)

#### Scenario: Prettier deps always installed
- **WHEN** any preset is applied and `deps.json["prettier"]` exists
- **THEN** prettier-related packages SHALL be installed (filtered against project's existing deps)

### Requirement: deps.json top-level custom dependencies
deps.json SHALL support top-level `devDependencies` and `dependencies` keys for user-defined custom deps. These keys are reserved and SHALL NOT be treated as tool group names. Their contents SHALL always be collected regardless of flags, and SHALL support `<latest>` placeholders.

#### Scenario: Top-level devDependencies always collected
- **WHEN** deps.json contains `{"devDependencies": {"my-lib": "^1.0.0"}, "eslint": {"devDependencies": {"eslint": "<latest>"}}}`
- **THEN** `my-lib` SHALL be collected and installed alongside eslint deps, regardless of any flags

#### Scenario: Top-level dependencies always collected
- **WHEN** deps.json contains `{"dependencies": {"lodash-es": "^4.17.0"}}`
- **THEN** `lodash-es` SHALL be collected regardless of any flags

#### Scenario: <latest> in custom deps
- **WHEN** deps.json contains `{"devDependencies": {"dayjs": "<latest>"}}`
- **THEN** `<latest>` SHALL be resolved to the actual latest version at install time, same as tool-grouped deps

#### Scenario: Top-level keys take precedence in output
- **WHEN** deps.json has both top-level `"devDependencies": {"pkg": "^1.0.0"}` and a tool group that also includes `"pkg": "^2.0.0"`
- **THEN** the last occurrence SHALL win (standard `Object.assign` semantics)

### Requirement: deps.json includes empty custom dep placeholders
Builtin preset deps.json files SHALL include empty `devDependencies: {}` and `dependencies: {}` at the top level. This makes the self-editing surface visible to users who edit materialized presets.

#### Scenario: User sees custom dep slots
- **WHEN** a user opens a materialized preset's deps.json
- **THEN** top-level `devDependencies` and `dependencies` keys SHALL be present (may be empty `{}`)
