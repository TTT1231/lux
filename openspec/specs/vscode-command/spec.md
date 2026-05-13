# vscode-command

## ADDED Requirements

### Requirement: --reset flag for vscode command
The `lux vscode` command SHALL accept a `--reset` flag that deletes the local preset directory before execution, forcing re-materialization from the built-in preset.

#### Scenario: Reset with existing local preset
- **WHEN** user runs `lux vscode web-vue --reset` and `.lux/preset/vscode/web-vue/` exists
- **THEN** the system SHALL delete `.lux/preset/vscode/web-vue/` and proceed with built-in generation + materialization

#### Scenario: Reset without local preset
- **WHEN** user runs `lux vscode web-vue --reset` and no local preset exists
- **THEN** the system SHALL proceed normally with built-in generation + materialization (no error)

### Requirement: Local preset detection in vscode command
The `lux vscode` command SHALL check for an existing local preset directory before executing the built-in generation pipeline. If a local preset exists, the command SHALL use the local preset path instead.

#### Scenario: Local preset exists — skip built-in generation
- **WHEN** `.lux/preset/vscode/<preset>/` exists
- **THEN** `generateAllVscode` SHALL NOT be called
- **AND** files SHALL be read from local preset directory and applied with merge logic

#### Scenario: No local preset — built-in generation + materialization
- **WHEN** `.lux/preset/vscode/<preset>/` does not exist
- **THEN** the existing `generateAllVscode` pipeline SHALL execute unchanged
- **AND** after completion, generated files SHALL be materialized to `.lux/preset/vscode/<preset>/`
