## ADDED Requirements

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
