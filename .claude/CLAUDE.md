# CLAUDE.md

Project context for Claude Code.

## Project Overview

**trw-cli** (binary name: `trw1`) — A CLI tool for one-click project formatting and VSCode configuration initialization. It generates ESLint, Prettier, Stylelint, CSpell, EditorConfig configs and VSCode settings from predefined presets, with smart merge and conflict resolution.

## Commands

```bash
pnpm build          # Build with tsup (ESM, outputs to dist/)
pnpm dev            # Watch mode build
pnpm test           # Run all tests (vitest, builds first via pretest)
pnpm test:watch     # Run tests in watch mode
pnpm lint           # ESLint check
pnpm lint:fix       # ESLint auto-fix
pnpm format         # Prettier write
pnpm format:check   # Prettier check
pnpm cspell         # Spell check
pnpm type:check     # TypeScript type check (tsc --noEmit)
pnpm code:check     # lint + format:check
pnpm code:fix       # lint:fix + format
pnpm code:check:all # lint + format:check + cspell
pnpm code:fix:all   # lint:fix + format
pnpm bump:deps      # Sync dependency versions across presets
```

## Testing

Uses **vitest** with two project tiers (see `vitest.config.ts`):
- **Unit**: `tests/**/*.test.ts` — parallel, fast timeout
- **Acceptance**: `tests/**/*.spec.ts` — serial, fork pool, 30s timeout (real filesystem + process)

| Type | Pattern | Location |
|------|---------|----------|
| Unit tests | `*.test.ts` | `tests/**/*.test.ts` |
| Acceptance tests | `*.spec.ts` | `tests/**/*.spec.ts` |
| Test helpers | `*.ts` (no suffix) | `tests/helpers/` |

## Architecture

```
src/
├── index.ts                  # CLI entry (commander)
├── commands/                 # CLI command handlers
│   ├── fmt.ts                # trw1 fmt init <preset> / trw1 fmt list
│   └── vscode.ts             # trw1 vscode init <preset> / trw1 vscode list
├── generators/               # File generation logic
│   ├── fmt.ts                # Writes eslint/prettier/stylelint/cspell/editorconfig files
│   └── vscode.ts             # Writes .vscode/settings.json + extensions.json
├── core/
│   ├── conflict-resolver.ts  # create/overwrite/skip decision engine
│   └── merge-settings.ts     # VSCode settings merge with priority keys
├── presets/
│   ├── types.ts              # FmtPreset & VscodePreset interfaces
│   ├── versions.ts           # Centralized dep version pinning
│   ├── fmt/                  # FmtPreset implementations (web, electron, uniapp, node, nest)
│   └── vscode/               # VscodePreset implementations (web, electron, uniapp, node, nest, go)
└── utils/
    ├── deps.ts               # Package manager detection + devDep install
    ├── errors.ts             # CliError, fuzzy preset matching (Levenshtein)
    ├── execFileNoThrow.ts    # Shell exec wrapper (uses exec for .cmd resolution on Windows)
    ├── fs.ts                 # File read/write/JSON helpers
    └── logger.ts             # Chalk-based structured logger
```

### Data Flow

1. **Command** parses CLI args → resolves preset name (with fuzzy matching on error)
2. **Generator** iterates config file definitions → calls `resolveConflict()` per file
3. **Conflict resolver** checks `neverOverwrite`/`forceOverwrite` lists, then `--force` flag
4. For VSCode settings specifically: **merge-settings** performs a deep merge with two priority tiers:
   - `PRESET_PRIORITY_KEYS` (linting/formatting) — preset wins to ensure tooling works
   - `USER_PRIORITY_KEYS` (theme/cursor) — existing user config wins

### Key Design Decisions

- **ESM-only** (`"type": "module"`, tsup outputs ESM, target Node 18+)
- **Lazy preset content**: all config content is generated via functions (`eslint: () => string`) not raw strings, so unused presets don't allocate memory
- **`<pm>` placeholder in scripts**: scripts use `<pm>` which gets replaced at inject time with `pnpm run`/`yarn run`/`npm run` based on detected lockfile
- **Version pinning**: all dependency versions are centralized in `presets/versions.ts`, not scattered across presets
- **No runtime dependencies** beyond `chalk` and `commander` — everything else is devDependencies for the CLI's own linting

### Adding a New Preset

1. Create `src/presets/fmt/<name>.ts` — export a `FmtPreset` object with config generators
2. Create `src/presets/vscode/<name>.ts` — export a `VscodePreset` object
3. Re-export from each `index.ts` and add to the `FMT_PRESETS` / `VSCODE_PRESETS` arrays
4. Pin any new dependency versions in `src/presets/versions.ts`
