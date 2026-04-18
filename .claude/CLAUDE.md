# CLAUDE.md

Project context for Claude Code.

## Project Overview

**lux** — A CLI tool for one-click project formatting and VSCode configuration initialization. It generates ESLint, Prettier, Stylelint, CSpell, EditorConfig configs and VSCode settings from predefined presets, with smart merge and conflict resolution.

## Prerequisites

- **Node.js 18+** (ESM-only runtime)
- **bun** (package manager & task runner)

## Commands

### Local Development

```bash
bun link                  # Register `lux` globally for local testing
lux fmt web               # Test CLI against any project
lux fmt web --dry-run     # Preview without writing files
lux fmt web --force       # Overwrite existing configs
lux fmt web --no-install  # Skip dependency installation
bun unlink                # Clean up global link
```

### Build & Quality

```bash
bun build          # Build with tsup (ESM, outputs to dist/)
bun dev            # Watch mode build
bun test           # Run all tests (vitest run)
bun test:watch     # Run tests in watch mode
bun test:coverage  # Run tests with v8 coverage report
bun lint           # ESLint check
bun lint:fix       # ESLint auto-fix
bun format         # Prettier write
bun format:check   # Prettier check
bun cspell         # Spell check
bun type:check     # TypeScript type check (tsc --noEmit)
bun code:check     # lint + format:check
bun code:fix       # lint:fix + format
bun code:check:all # lint + format:check + cspell
bun code:fix:all   # lint:fix + format
```

## Testing

Uses **vitest** with two project tiers (see `vitest.config.ts`):

| Type | Pattern | Location | Mode |
|------|---------|----------|------|
| Unit | `*.test.ts` | `tests/**/*.test.ts` | parallel, fast timeout |
| Acceptance | `*.spec.ts` | `tests/**/*.spec.ts` | serial, fork pool, 30s timeout |
| Helpers | `*.ts` | `tests/helpers/` | — |

> Acceptance tests spawn `dist/index.js` — run `bun build` before `bun test` if the dist is stale.

## Architecture

```
src/
├── index.ts                  # CLI entry (commander)
├── commands/                 # CLI command handlers
│   ├── fmt.ts                # lux fmt <preset> / lux fmt list
│   ├── update.ts             # lux update [--check] — self-update via npm/bun
│   ├── vpn.ts                # lux vpn cmd/pw — copy proxy env-vars to clipboard
│   └── vscode.ts             # lux vscode <preset> / lux vscode list
├── generators/               # File generation logic
│   ├── fmt.ts                # Writes eslint/prettier/stylelint/cspell/editorconfig files
│   └── vscode.ts             # Writes .vscode/settings.json + extensions.json
├── core/
│   ├── conflict-resolver.ts  # create/overwrite/skip decision engine
│   └── merge-settings.ts     # VSCode settings merge with priority keys
├── presets/
│   ├── types.ts              # FmtPreset & VscodePreset interfaces
│   ├── fmt/                  # FmtPreset implementations (web, electron, uniapp, node, nest)
│   └── vscode/               # VscodePreset implementations (web, electron, uniapp, node, nest, go)
└── utils/
    ├── deps.ts               # Package manager detection + devDep install
    ├── errors.ts             # CliError, fuzzy preset matching (Levenshtein)
    ├── execFileNoThrow.ts    # Shell exec wrapper (uses exec for .cmd resolution on Windows)
    ├── fs.ts                 # File read/write/JSON helpers
    ├── logger.ts             # Thin chalk wrappers (log/success/warn/error)
    └── version.ts            # PACKAGE_NAME constant + getCurrentVersion() (cached)
```

### Data Flow

1. **Command** parses CLI args → resolves preset name (with fuzzy matching on error)
2. **Generator** iterates config file definitions → calls `resolveConflict()` per file
3. **Conflict resolver** checks `neverOverwrite`/`forceOverwrite` lists, then `--force` flag
4. For VSCode settings specifically: **merge-settings** performs a deep merge with two priority tiers:
   - `PRESET_PRIORITY_KEYS` (linting/formatting) — preset wins to ensure tooling works
   - `USER_PRIORITY_KEYS` (theme/cursor) — existing user config wins

### Key Design Decisions

- **Runtime**: Node.js 18+ (ESM-only, tsup target `node18`)
- **ESM-only** (`"type": "module"`, tsup outputs ESM, target Node 18+)
- **Lazy preset content**: all config content is generated via functions (`eslint: () => string`) not raw strings, so unused presets don't allocate memory
- **`<pm>` placeholder in scripts**: scripts use `<pm>` which gets replaced at inject time with `bun run`/`pnpm run`/`yarn run`/`npm run` based on detected lockfile
- **No runtime dependencies** beyond `chalk` and `commander` — everything else is devDependencies for the CLI's own linting

### Adding a New Preset

1. Create `src/presets/fmt/<name>.ts` — export a `FmtPreset` object with config generators
2. Create `src/presets/vscode/<name>.ts` — export a `VscodePreset` object
3. Re-export from each `index.ts` and add to the `FMT_PRESETS` / `VSCODE_PRESETS` arrays
