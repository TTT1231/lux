# husky-lint-staged

## ADDED Requirements

### Requirement: --husky opt-in flag
The `lux fmt` command SHALL accept a `--husky` flag that initializes husky for the project. When specified, the system SHALL install `husky` as a devDependency, create `.husky/` directory with a `pre-commit` hook, inject the appropriate init script (`prepare` or `postinstall`), and execute the init script once.

#### Scenario: --husky with npm/pnpm/bun
- **WHEN** user runs `lux fmt web-vue --husky` and the detected PM is npm, pnpm, or bun
- **THEN** `husky` SHALL be added to devDependencies and installed
- **AND** `.husky/pre-commit` SHALL be created with `<pm> run lint` as content
- **AND** `"prepare": "husky"` SHALL be injected into package.json scripts
- **AND** the `prepare` script SHALL be executed once to initialize git hooks

#### Scenario: --husky with yarn
- **WHEN** user runs `lux fmt web-vue --husky` and the detected PM is yarn
- **THEN** `husky` SHALL be added to devDependencies and installed
- **AND** `.husky/pre-commit` SHALL be created with `yarn run lint` as content
- **AND** `"postinstall": "husky"` SHALL be injected into package.json scripts
- **AND** the `postinstall` script SHALL be executed once to initialize git hooks

#### Scenario: --husky without package.json
- **WHEN** user runs `lux fmt web-vue --husky` and no `package.json` exists in the project
- **THEN** the system SHALL warn that husky setup requires package.json and skip husky initialization

### Requirement: --lint-staged opt-in flag
The `lux fmt` command SHALL accept a `--lint-staged` flag that sets up lint-staged for the project. When specified, the system SHALL install `lint-staged` as a devDependency, generate `.lintstagedrc.json` from the preset, and inject a `"lint-staged"` script. The `--lint-staged` flag SHALL implicitly enable `--husky`.

#### Scenario: --lint-staged implicitly enables --husky
- **WHEN** user runs `lux fmt web-vue --lint-staged` without `--husky`
- **THEN** husky SHALL be set up automatically (same as if `--husky` was specified)
- **AND** `.husky/pre-commit` content SHALL be `<pm> run lint-staged` instead of `<pm> run lint`

#### Scenario: --lint-staged generates config file
- **WHEN** user runs `lux fmt web-vue --lint-staged` and the preset defines `lintStaged`
- **THEN** `.lintstagedrc.json` SHALL be generated in the project root with the preset's lint-staged configuration

#### Scenario: --lint-staged injects script
- **WHEN** user runs `lux fmt web-vue --lint-staged`
- **THEN** `"lint-staged": "lint-staged"` SHALL be injected into package.json scripts

### Requirement: Lint-staged config solidification
The `.lintstagedrc.json` config file SHALL follow the same solidification flow as other CONFIG_FILES (e.g., `cspell.json`). It SHALL be materialized to `~/.lux/preset/fmt/<preset>/` on first run and copied from there on subsequent runs.

#### Scenario: .lintstagedrc.json materialized to local preset
- **WHEN** built-in generation produces `.lintstagedrc.json`
- **THEN** the file SHALL be copied to `~/.lux/preset/fmt/<preset>/.lintstagedrc.json`

#### Scenario: .lintstagedrc.json applied from local preset
- **WHEN** local preset contains `.lintstagedrc.json`
- **AND** user runs `lux fmt <preset> --lint-staged`
- **THEN** `.lintstagedrc.json` SHALL be copied to project root

### Requirement: Husky pre-commit content is dynamic
The `.husky/pre-commit` file SHALL NOT be solidified. Its content SHALL be generated dynamically at apply time based on flags and detected package manager.

#### Scenario: --husky alone generates lint command
- **WHEN** `--husky` is specified without `--lint-staged`
- **THEN** `.husky/pre-commit` SHALL contain `<pm> run lint` (resolved to PM-specific prefix)

#### Scenario: --husky --lint-staged generates lint-staged command
- **WHEN** both `--husky` and `--lint-staged` are specified
- **THEN** `.husky/pre-commit` SHALL contain `<pm> run lint-staged` (resolved to PM-specific prefix)

### Requirement: Husky initialization script execution
After injecting the init script (`prepare` or `postinstall`) and creating `.husky/pre-commit`, the system SHALL execute the init script once to set `core.hooksPath` in the git config.

#### Scenario: Successful initialization
- **WHEN** all files are written and scripts injected
- **THEN** the system SHALL run `<pm> run prepare` (or `<pm> run postinstall` for yarn)
- **AND** `.husky/` SHALL be registered as the git hooks directory

#### Scenario: Dry-run skips execution
- **WHEN** `--dry-run` is specified with `--husky`
- **THEN** the system SHALL NOT execute the init script
- **AND** output SHALL indicate "[dry-run] Would run <pm> run prepare"

### Requirement: Lint-staged filtering
When `--lint-staged` is NOT specified, the system SHALL filter lint-staged related files, dependencies, and scripts, following the same pattern as `--stylelint` filtering.

#### Scenario: --lint-staged not specified strips config file
- **WHEN** `--lint-staged` is NOT specified
- **THEN** `.lintstagedrc.json` SHALL NOT be generated

#### Scenario: --lint-staged not specified strips dependency
- **WHEN** `--lint-staged` is NOT specified
- **THEN** `lint-staged` SHALL NOT be included in devDependencies

#### Scenario: --lint-staged not specified strips script
- **WHEN** `--lint-staged` is NOT specified
- **THEN** the `"lint-staged"` script SHALL NOT be injected into package.json

### Requirement: Husky filtering
When `--husky` is NOT specified (and `--lint-staged` is also NOT specified), the system SHALL filter husky-related files, dependencies, and scripts.

#### Scenario: --husky not specified skips all husky setup
- **WHEN** neither `--husky` nor `--lint-staged` is specified
- **THEN** no `.husky/` directory SHALL be created
- **AND** `husky` SHALL NOT be included in devDependencies
- **AND** no `prepare` or `postinstall` script SHALL be injected

### Requirement: FmtPreset lintStaged field
The `FmtPreset` interface SHALL support an optional `lintStaged` function that returns a JSON string for `.lintstagedrc.json` content.

#### Scenario: Preset with lintStaged field
- **WHEN** a preset defines `lintStaged: () => JSON.stringify({"*.{ts,js}": ["eslint --fix"]})`
- **AND** `--lint-staged` is specified
- **THEN** the returned string SHALL be written to `.lintstagedrc.json`
