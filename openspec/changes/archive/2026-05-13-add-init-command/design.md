## Context

lux is a CLI tool (`@luxkit/cli`) that generates formatting configs and VSCode settings from presets. It uses Commander for CLI registration, chalk for terminal styling, and tsup for ESM bundling into a single `dist/index.js`. The `src/presets/skills/` directory contains skill `.md` files meant for AI coding tools, currently holding only an empty `lux/skill.md`.

The project has 2 runtime deps (chalk, commander). The build produces a single bundled JS file. Only the `dist/` directory is published to npm.

## Goals / Non-Goals

**Goals:**
- Add `lux init` command with interactive tool selection
- Copy bundled skill files to the correct project directory
- Support Claude Code and OpenCode as initial targets
- Keep skill files as plain `.md` in `src/presets/skills/` for easy editing

**Non-Goals:**
- `--dry-run` or `--force` flags (simple overwrite-always semantics)
- Direct tool argument (`lux init claude`) — always interactive
- Tool-specific skill content differentiation (same skills for all tools)
- Conflict resolution or backup of existing files

## Architecture Visualization

```
┌──────────────────────────────────────────────────────┐
│                    BUILD PIPELINE                     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  tsup ──────────────▶ dist/index.js                  │
│                           │                          │
│  copy-assets.mjs ────────┼──▶ dist/skills/           │
│  src/presets/skills/ ────┘      └── lux/             │
│      └── lux/                        └── skill.md    │
│          └── skill.md                                │
│                                                      │
├──────────────────────────────────────────────────────┤
│                      RUNTIME                         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  lux init                                            │
│    │                                                 │
│    ▼                                                 │
│  @clack/prompts select()                             │
│    │                                                 │
│    ├── "Claude Code" ──▶ target: .claude/skills/     │
│    └── "OpenCode"   ──▶ target: .opencode/skills/   │
│                  │                                   │
│                  ▼                                   │
│         fs.cpSync(dist/skills/, target)              │
│                  │                                   │
│                  ▼                                   │
│            logger.success()                          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Decisions

### 1. Post-build copy for skill assets (not inline)

**Choice**: Copy `src/presets/skills/` → `dist/skills/` via `scripts/copy-assets.mjs` after tsup.

**Why**: Skill files are content (markdown), not config generators. Keeping them as `.md` files makes them easy to edit and preview. The alternative — inlining as TS string constants — would match the fmt preset pattern but sacrifices readability for content-heavy files.

**Alternative considered**: esbuild text loader for `.md` files. Rejected because it requires importing each file explicitly and doesn't handle directory trees.

### 2. `@clack/prompts` for interactive selection

**Choice**: Add `@clack/prompts` as a runtime dependency.

**Why**: Modern, minimal (~5KB + 2 tiny deps), produces beautiful arrow-key selection UI. The alternative — Node.js `readline` with numbered input — works but feels unpolished for a CLI tool.

### 3. Separate `src/presets/init.ts` for tool mapping

**Choice**: Extract tool configs into their own file rather than hardcoding in the command.

**Why**: Follows the existing pattern (`src/presets/fmt.ts`, `src/presets/vscode.ts`). Makes it trivial to add new tools later.

### 4. Always overwrite (no conflict resolution)

**Choice**: `fs.cpSync` with no skip logic. If target file exists, overwrite it.

**Why**: User explicitly stated "如果skills文件夹存在就直接复制过去即可" — just copy, don't ask. Skills are templates the user shouldn't be modifying in-place.

## Over-Engineering Traps

N/A — Simple file copy command with interactive selection. Minimal risk.

## Risks / Trade-offs

- **[Build step fragility]** → copy-assets.mjs is a plain `fs.cpSync` call with no error handling for missing source. Mitigation: the script runs right after tsup; if `src/presets/skills/` is empty, `dist/skills/` will be empty too — command logs "no files to copy".
- **[Bundle size]** → `@clack/prompts` adds ~5KB. Acceptable for a CLI tool.
- **[ESM compatibility]** → `@clack/prompts` is ESM-first. No issues expected with the project's `"type": "module"` setup.
