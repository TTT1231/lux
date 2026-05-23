## ADDED Requirements

### Requirement: logApplyResult SHALL distinguish dry-run mode
The `logApplyResult` function SHALL accept a `dryRun` parameter. When `dryRun` is true, log messages SHALL use "Would create" / "Would overwrite" instead of "Created" / "Overwritten".

#### Scenario: logApplyResult in dry-run mode
- **WHEN** `logApplyResult(result, true)` is called with `result.created = ['eslint.config.mjs']`
- **THEN** the log SHALL say "Would create" not "Created"

#### Scenario: logApplyResult in real mode
- **WHEN** `logApplyResult(result, false)` is called with `result.created = ['eslint.config.mjs']`
- **THEN** the log SHALL say "Created"

### Requirement: .husky/pre-commit SHALL respect --force flag
When `.husky/pre-commit` already exists and `--force` is NOT specified, the system SHALL skip overwriting it and log that it was skipped. When `--force` IS specified, the system SHALL overwrite it.

#### Scenario: pre-commit exists without --force
- **WHEN** `.husky/pre-commit` already exists and `--force` is NOT specified
- **THEN** the system SHALL skip writing `.husky/pre-commit`
- **AND** the system SHALL log that pre-commit was skipped (already exists)

#### Scenario: pre-commit exists with --force
- **WHEN** `.husky/pre-commit` already exists and `--force` IS specified
- **THEN** the system SHALL overwrite `.husky/pre-commit` with the new content
- **AND** the system SHALL log that pre-commit was overwritten

#### Scenario: pre-commit does not exist
- **WHEN** `.husky/pre-commit` does not exist
- **THEN** the system SHALL create it regardless of `--force`

### Requirement: Builtin path SHALL warn on ineffective flags
The builtin execution path SHALL warn when a flag (e.g., `--stylelint`, `--cspell`, `--lint-staged`) is specified but the preset does not provide corresponding functionality.

#### Scenario: --stylelint on builtin preset without stylelint
- **WHEN** user runs `lux fmt <builtin>` with `--stylelint` but the preset has no stylelint config
- **THEN** the system SHALL warn that `--stylelint` has no effect for this preset

### Requirement: Dry-run SHALL distinguish create vs overwrite
In dry-run mode, log messages SHALL distinguish between files that would be newly created and files that would be overwritten.

#### Scenario: Dry-run with existing file
- **WHEN** `eslint.config.mjs` already exists and `--force` is specified
- **THEN** dry-run output SHALL say "Would overwrite eslint.config.mjs"

#### Scenario: Dry-run with new file
- **WHEN** `eslint.config.mjs` does not exist
- **THEN** dry-run output SHALL say "Would create eslint.config.mjs"

### Requirement: Script dry-run SHALL show what would be added
In dry-run mode, the system SHALL log which scripts would be added to `package.json`, not silently skip them.

#### Scenario: Dry-run with new scripts
- **WHEN** `--dry-run` is specified and the preset defines scripts not in project's `package.json`
- **THEN** the system SHALL log `[dry-run] Would add script "eslint"` for each new script
- **AND** the system SHALL include a summary line like `[dry-run] Would add N scripts to package.json`

### Requirement: All-files-skipped SHALL suggest --force
When all config files were skipped (none created, none overwritten), the system SHALL suggest using `--force` to overwrite existing files.

#### Scenario: All files skipped
- **WHEN** all config files already exist and `--force` is NOT specified
- **THEN** the system SHALL log a suggestion: "Use --force to overwrite existing files"

#### Scenario: Some files created
- **WHEN** at least one file was created or overwritten
- **THEN** no `--force` suggestion SHALL be shown

### Requirement: --husky SHALL warn when deps unavailable
When `--husky` is active but husky dependencies cannot be installed or are missing from the preset, the system SHALL warn that hooks may fail at runtime.

#### Scenario: --husky with --no-install and missing husky dep
- **WHEN** user runs `lux fmt web-vue --husky --no-install` and husky is not in the project's devDependencies
- **THEN** the system SHALL warn that the husky hook is configured but the dependency is not installed

#### Scenario: --husky with local preset missing husky deps
- **WHEN** user runs `lux fmt <custom> --husky` and the custom preset's `deps.json` has no husky entry
- **THEN** the system SHALL warn that `--husky` has no effect because the preset has no husky dependencies
