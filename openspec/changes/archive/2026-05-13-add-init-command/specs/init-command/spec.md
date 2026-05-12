## ADDED Requirements

### Requirement: Interactive tool selection
When the user runs `lux init`, the system SHALL present an interactive selection prompt listing supported AI coding tools. The user SHALL select exactly one tool using arrow-key navigation.

#### Scenario: User runs lux init
- **WHEN** user runs `lux init`
- **THEN** the system displays a selection prompt with "Claude Code" and "OpenCode" as options

#### Scenario: User cancels selection
- **WHEN** user presses Escape or Ctrl+C during selection
- **THEN** the system exits with a cancellation message and makes no file changes

### Requirement: Skill file copying to target directory
The system SHALL copy all files and subdirectories from the bundled skills directory to the target project directory corresponding to the selected tool.

#### Scenario: Claude Code selected
- **WHEN** user selects "Claude Code"
- **THEN** the system copies all files from the bundled `skills/` directory to `<project>/.claude/skills/`

#### Scenario: OpenCode selected
- **WHEN** user selects "OpenCode"
- **THEN** the system copies all files from the bundled `skills/` directory to `<project>/.opencode/skills/`

#### Scenario: Target directory already exists
- **WHEN** the target directory already exists with files
- **THEN** the system overwrites existing files and adds new ones without prompting

#### Scenario: Target directory does not exist
- **WHEN** the target directory does not exist
- **THEN** the system creates the directory and copies all files

### Requirement: Build pipeline includes skill assets
The build process SHALL copy `src/presets/skills/` to `dist/skills/` so that skill files are available at runtime in the published npm package.

#### Scenario: Running build
- **WHEN** `bun run build` is executed
- **THEN** `dist/skills/` contains the same file structure as `src/presets/skills/`

### Requirement: Result feedback
The system SHALL log a summary of copied files after completion.

#### Scenario: Files copied successfully
- **WHEN** skill files are copied to the target directory
- **THEN** the system logs each copied file path and a success message
