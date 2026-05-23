# husky-lint-staged

## MODIFIED Requirements

### Requirement: --lint-staged opt-in flag
The `lux fmt` command SHALL accept a `--lint-staged` flag that sets up lint-staged for the project. When specified, the system SHALL install `lint-staged` as a devDependency, generate `.lintstagedrc.json` by composing per-tool fragments based on active flags, and inject a `"lint-staged"` script. The `--lint-staged` flag SHALL implicitly enable `--husky`.

#### Scenario: --lint-staged implicitly enables --husky
- **WHEN** user runs `lux fmt web-vue --lint-staged` without `--husky`
- **THEN** husky SHALL be set up automatically (same as if `--husky` was specified)
- **AND** `.husky/pre-commit` content SHALL be `<pm> run lint-staged` instead of `<pm> run lint`

#### Scenario: --lint-staged generates config file via composition
- **WHEN** user runs `lux fmt web-vue --lint-staged` and the preset defines `lintStagedFragments`
- **THEN** `.lintstagedrc.json` SHALL be generated in the project root with dynamically composed content from active tool fragments

#### Scenario: --lint-staged injects script
- **WHEN** user runs `lux fmt web-vue --lint-staged`
- **THEN** `"lint-staged": "lint-staged"` SHALL be injected into package.json scripts

### Requirement: Lint-staged never materialized
The `.lintstagedrc.json` SHALL NOT be materialized to the local preset directory. It SHALL always be dynamically composed at runtime from `lintStagedFragments` when `--lint-staged` is active.

#### Scenario: .lintstagedrc.json not in local preset
- **WHEN** materialization occurs for any preset
- **THEN** `.lintstagedrc.json` SHALL NOT be copied to `~/.lux/preset/fmt/<preset>/`

#### Scenario: Local preset path ignores lint-staged config file
- **WHEN** user runs `lux fmt <preset> --lint-staged` on a local/custom preset
- **THEN** `.lintstagedrc.json` SHALL NOT be generated (no preset code available to compose from)

### Requirement: Lint-staged filtering
When `--lint-staged` is NOT specified, the system SHALL filter lint-staged related files, dependencies, and scripts.

#### Scenario: --lint-staged not specified strips config file
- **WHEN** `--lint-staged` is NOT specified
- **THEN** `.lintstagedrc.json` SHALL NOT be generated

#### Scenario: --lint-staged not specified strips dependency
- **WHEN** `--lint-staged` is NOT specified
- **THEN** `lint-staged` SHALL NOT be included in devDependencies

#### Scenario: --lint-staged not specified strips script
- **WHEN** `--lint-staged` is NOT specified
- **THEN** the `"lint-staged"` script SHALL NOT be injected into package.json

### Requirement: FmtPreset lintStaged field replaced by lintStagedFragments
The `FmtPreset` interface SHALL replace the `lintStaged` function with `lintStagedFragments` field for per-tool fragment definitions. The old `lintStaged` function SHALL be removed.

#### Scenario: Preset with lintStagedFragments
- **WHEN** a preset defines `lintStagedFragments: { eslint: { "*.{ts,js}": ["eslint --fix"] } }`
- **AND** `--lint-staged` is specified
- **THEN** the composed output from fragments SHALL be written to `.lintstagedrc.json`
