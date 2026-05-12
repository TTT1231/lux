## 1. Setup

- [x] 1.1 Add `@clack/prompts` dependency: `bun add @clack/prompts`
- [x] 1.2 Create `scripts/copy-assets.mjs` — copy `src/presets/skills/` to `dist/skills/`
- [x] 1.3 Update `package.json` build script: `"tsup && node scripts/copy-assets.mjs"`

## 2. Core Implementation

- [x] 2.1 Create `src/presets/init.ts` — export `INIT_TOOLS` array with tool configs (claude, opencode)
- [x] 2.2 Create `src/generators/init.ts` — resolve bundled skills dir, `fs.cpSync` to target, log results
- [x] 2.3 Create `src/commands/init.ts` — register `init` command, interactive `select()` via `@clack/prompts`, call generator
- [x] 2.4 Update `src/index.ts` — import and call `registerInitCommand(program)`

## 3. Verify

- [x] 3.1 Run `bun run build` — confirm `dist/skills/` exists with correct content
- [x] 3.2 Run `node dist/index.js init` — test interactive selection and file copy
- [x] 3.3 Run `bun run test` — existing tests pass
- [x] 3.4 Run `bun run code:check:all` — lint, format, spell pass
