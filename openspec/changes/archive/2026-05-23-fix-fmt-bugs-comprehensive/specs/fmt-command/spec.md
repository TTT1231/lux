## MODIFIED Requirements

### Requirement: Dependency version pinning from deps.json
When `collectDepsFromRegistry` returns version-pinned dependencies (e.g., `{"eslint": "^9.25.0"}`), callers SHALL preserve those versions when adding to the project manifest. The system SHALL NOT discard pinned versions and re-fetch latest.

#### Scenario: Local preset with pinned versions
- **WHEN** local preset's `deps.json` specifies `"eslint": "^9.25.0"` and `--no-install` is used
- **THEN** `package.json` SHALL be updated with `"eslint": "^9.25.0"`, not re-resolved to latest

#### Scenario: Builtin preset with pinned versions
- **WHEN** builtin preset's `deps.json` specifies `"eslint": "^9.25.0"` and `--no-install` is used
- **THEN** `package.json` SHALL be updated with `"eslint": "^9.25.0"`, not re-resolved to latest

#### Scenario: Version is `<latest>` placeholder
- **WHEN** `deps.json` specifies `"eslint": "<latest>"`
- **THEN** the system SHALL fetch the latest version from the registry as before

### Requirement: Builtin write failures SHALL be reported
When `generateConfigFile` fails to write a config file (returns `null`), the system SHALL log a warning and track the failure. The command SHALL NOT silently skip the file and continue as if it succeeded.

#### Scenario: Write permission denied
- **WHEN** `generateConfigFile` fails to write `eslint.config.mjs` due to permission error
- **THEN** the system SHALL log the error
- **AND** the failed file SHALL NOT appear in `created` or `overwritten` results
- **AND** subsequent operations (scripts, deps, materialize) SHALL still proceed
