# fmt-command

## MODIFIED Requirements

### Requirement: --husky and --lint-staged flag registration
The `lux fmt` command SHALL accept `--husky` and `--lint-staged` opt-in flags. These flags follow the same opt-in pattern as `--stylelint` and `--editorconfig`.

#### Scenario: --husky flag parsed
- **WHEN** user runs `lux fmt web-vue --husky`
- **THEN** `options.husky` SHALL be `true`
- **AND** `GenerateOptions.noHusky` SHALL be `false`

#### Scenario: --lint-staged flag parsed
- **WHEN** user runs `lux fmt web-vue --lint-staged`
- **THEN** `options.lintStaged` SHALL be `true`
- **AND** `GenerateOptions.noLintStaged` SHALL be `false`

#### Scenario: --lint-staged implicitly enables husky
- **WHEN** user runs `lux fmt web-vue --lint-staged` without `--husky`
- **THEN** `GenerateOptions.noHusky` SHALL be `false` (husky auto-enabled)

#### Scenario: Neither flag specified
- **WHEN** user runs `lux fmt web-vue` without `--husky` or `--lint-staged`
- **THEN** `GenerateOptions.noHusky` SHALL be `true`
- **AND** `GenerateOptions.noLintStaged` SHALL be `true`

### Requirement: GenerateOptions extended for husky and lint-staged
The `GenerateOptions` interface SHALL include `noHusky: boolean` and `noLintStaged: boolean` fields. These follow the same negative-logic pattern as `noStylelint` and `noEditorconfig`.

#### Scenario: GenerateOptions populated from flags
- **WHEN** `--husky` is specified and `--lint-staged` is not
- **THEN** `opts.noHusky` SHALL be `false`
- **AND** `opts.noLintStaged` SHALL be `true`

### Requirement: Husky initialization in builtin path
After the builtin generation pipeline completes and before/after dependency installation, the system SHALL perform husky initialization when `--husky` is active.

#### Scenario: Husky setup after generation
- **WHEN** builtin path executes with `--husky`
- **THEN** the system SHALL create `.husky/` directory, write `pre-commit` hook, inject init script, and execute it

#### Scenario: Husky skipped when flag not active
- **WHEN** builtin path executes without `--husky` or `--lint-staged`
- **THEN** no husky-related operations SHALL occur

### Requirement: Husky initialization in local preset path
When applying from local preset with `--husky` active, the system SHALL perform husky initialization using the same logic as the builtin path.

#### Scenario: Local preset with --husky
- **WHEN** local preset path executes with `--husky`
- **THEN** husky SHALL be initialized identically to the builtin path

#### Scenario: Local preset without --husky
- **WHEN** local preset path executes without `--husky` or `--lint-staged`
- **THEN** no husky-related operations SHALL occur
