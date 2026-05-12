## Why

lux skill for AI vibe coding.An `init` command that add skills for claude code or opencode.

## What Changes

- New `lux init` command with interactive tool selection via `@clack/prompts`
- Copies all files from bundled `presets/skills/` to the target project directory
- Supports two tools: Claude Code (`.claude/skills/`) and OpenCode (`.opencode/skills/`)
- Adds `@clack/prompts` as a runtime dependency
- Adds post-build step to copy skill assets into `dist/` for npm packaging

## Capabilities

### New Capabilities

- `init-command`: Interactive CLI command that copies bundled skill files to the AI coding tool's project directory based on user selection

### Modified Capabilities

_(none)_

## Impact

- **New dependency**: `@clack/prompts` (runtime)
- **Build pipeline**: `scripts/copy-assets.mjs` added, build script updated
- **New files**: `src/commands/init.ts`, `src/generators/init.ts`, `src/presets/init.ts`
- **Modified files**: `src/index.ts` (register command), `package.json` (deps + build script)
