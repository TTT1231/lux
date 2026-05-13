## Context

lux generates formatting configs and VSCode settings from built-in presets. The generation pipeline is a pure function chain: `preset.eslint()` → string content → `writeFile()` to project root. Commands (`fmt.ts`, `vscode.ts`) orchestrate generation, script injection, and dependency installation.

Currently presets are hardcoded in `src/presets/fmt/` and `src/presets/vscode/`. There is no mechanism for users to customize generated output — every run regenerates from the same built-in functions, overwriting manual edits.

The `generateAllFmt` function in `src/generators/fmt.ts` maps a `CONFIG_FILES` table of filename→getter pairs, and for each file: resolves conflicts via `resolveConflict()`, optionally replaces `<lockfile>` placeholders, and writes to `opts.cwd`. It returns `{ created, overwritten, skipped }` arrays.

`generateAllVscode` follows a similar pattern but uses `mergeVscodeSettings()` for deep merge of `.vscode/settings.json` with priority rules (lint/format keys → preset wins, personal preference keys → user wins).

## Goals / Non-Goals

**Goals:**

- Add a "materialization" post-step after existing generation: copy generated files to `.lux/preset/<type>/<preset>/` for future reuse
- On subsequent runs, detect existing local preset and bypass built-in generation — copy files directly from `.lux/preset/`
- Generate a template `package.json` in the local preset directory containing `devDependencies` (with `<latest>` placeholders) and `scripts` (with `<pm>` placeholders)
- Support `--reset` flag to delete local preset and re-materialize from built-in
- All existing flags work identically in both paths

**Non-Goals:**

- Remote/package preset loading (npm, Git, URL)
- Preset inheritance/composition
- Preset versioning or diff
- Team sharing/distribution
- Changing the existing generation pipeline behavior

## Architecture Visualization

```
┌──────────────────────────────────────────────────────────────┐
│                     lux fmt <preset>                          │
│                                                              │
│   ┌─────────────────────────────────────────┐                │
│   │         resolvePreset(FMT_PRESETS)       │                │
│   └──────────────────┬──────────────────────┘                │
│                      │                                       │
│                      ▼                                       │
│   ┌─────────────────────────────────────────┐                │
│   │     --reset? → delete .lux/preset/...   │                │
│   └──────────────────┬──────────────────────┘                │
│                      │                                       │
│                      ▼                                       │
│   ┌─────────────────────────────────────────┐                │
│   │   localPresetExists(cwd, presetName)?   │                │
│   └─────────┬─────────────────┬─────────────┘                │
│        No   │                 │  Yes                         │
│             ▼                 ▼                               │
│   ┌──────────────────┐  ┌──────────────────────┐             │
│   │  EXISTING PATH   │  │   LOCAL PRESET PATH   │             │
│   │  (unchanged)     │  │                      │             │
│   │                  │  │  readLocalPreset()    │             │
│   │  generateAllFmt  │  │    → copy files      │             │
│   │  injectScripts   │  │    → merge pkg json  │             │
│   │  installDevDeps  │  │    → installDevDeps  │             │
│   │       │          │  │                      │             │
│   │       ▼          │  └──────────────────────┘             │
│   │  materialize()   │          new path                     │
│   │  → copy generated│                                       │
│   │    files to      │                                       │
│   │    .lux/preset/  │                                       │
│   │  → write template│                                       │
│   │    package.json  │                                       │
│   └──────────────────┘                                       │
│              │                              │                 │
│              └──────────┬───────────────────┘                │
│                         ▼                                    │
│              ┌─────────────────────┐                         │
│              │    log results      │                         │
│              └─────────────────────┘                         │
└──────────────────────────────────────────────────────────────┘


VSCode follows the same structure but:
  - No package.json in local preset (VscodePreset has no deps/scripts)
  - settings.json uses mergeVscodeSettings() instead of direct copy
  - Only 2 files: settings.json + extensions.json
```

```
┌──────────────────────────────────────────────────────────────┐
│                  LOCAL PRESET FILE LAYOUT                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  .lux/preset/fmt/web-vue/                                   │
│  ├── eslint.config.mjs        copied to project root        │
│  ├── .prettierrc              copied to project root        │
│  ├── .prettierignore          copied to project root        │
│  ├── stylelint.config.mjs     copied to project root        │
│  ├── .stylelintignore         copied to project root        │
│  ├── cspell.json              copied to project root        │
│  ├── .editorconfig            copied to project root        │
│  └── package.json             merged into project pkg json  │
│                                                                │
│  .lux/preset/vscode/web-vue/                                │
│  ├── settings.json            merged into .vscode/          │
│  └── extensions.json          written to .vscode/           │
│                                                                │
├──────────────────────────────────────────────────────────────┤
│  Template package.json shape:                                │
│  {                                                           │
│    "devDependencies": {                                      │
│      "eslint": "<latest>",                                   │
│      "prettier": "<latest>"                                  │
│    },                                                        │
│    "scripts": {                                              │
│      "lint": "eslint . --cache ...",                         │
│      "code:check": "<pm> lint && <pm> format:check"          │
│    }                                                         │
│  }                                                           │
│                                                              │
│  <latest> → install without version specifier (PM picks)     │
│  <pm>     → resolved to bun/npm run/pnpm at merge time      │
│  User can edit to pin versions: "eslint": "^9.15.0"         │
└──────────────────────────────────────────────────────────────┘
```

## Decisions

### 1. Post-generation materialization (not inline generation to preset dir)

**Choice**: First run uses existing `generateAllFmt` pipeline unchanged, then copies generated files to `.lux/preset/` as a separate post-step.

**Why**: Zero changes to the proven generation pipeline. Adding materialization as a post-step means the existing code path is untouched — same conflict resolution, same `<lockfile>` replacement, same file writes. Only adds a "save a copy" step after everything succeeds.

**Alternative considered**: Generate to `.lux/preset/` first, then copy to project root. Rejected because it requires restructuring the existing flow and risks introducing bugs in the well-tested generation path.

### 2. New module `src/core/local-preset.ts`

**Choice**: All local preset logic (detect, read, copy, merge package.json, materialize, reset) in a single new module.

**Why**: Follows existing pattern where `src/core/` houses decision logic (`conflict-resolver.ts`, `merge-settings.ts`). Keeps command files (`fmt.ts`, `vscode.ts`) as orchestrators that call into core for decisions.

### 3. Read-back materialization (not capture-during-generation)

**Choice**: After `generateAllFmt` writes files to project root, materialization reads those files back from disk and copies to `.lux/preset/`.

**Why**: Avoids modifying `generateAllFmt`'s return type or internals. The function currently returns only `{ created, overwritten, skipped }` filenames — it doesn't return content. Reading back from disk is simple and guaranteed to match what was actually written.

**Alternative considered**: Modify `generateAllFmt` to return content map. Rejected because it changes the generator's contract for all callers.

### 4. `<latest>` placeholder for devDependencies

**Choice**: Template `package.json` uses `<latest>` as version placeholder (e.g. `"eslint": "<latest>"`). At install time, `<latest>` is stripped and package name is passed to PM without version specifier.

**Why**: Consistent with existing `<pm>` / `<lockfile>` placeholder convention. More readable than `*`. Users can replace with pinned versions. When reading local preset for install, code checks: if value is `<latest>` → install bare package name, otherwise → install with version specifier.

### 5. No forceOverwrite/neverOverwrite in local preset path

**Choice**: When reading from local preset, files are copied directly to project root without consulting `forceOverwrite`/`neverOverwrite` from the built-in preset definition.

**Why**: These fields are NestJS-specific (protecting nest-cli generated files). In the local preset path, the user explicitly chose to use their own files — they have full control. If they don't want a file to be written, they delete it from the local preset directory.

### 6. VSCode local preset uses merge for settings.json

**Choice**: When reading from local vscode preset, `settings.json` is merged with existing `.vscode/settings.json` using the same `mergeVscodeSettings()` function and priority rules.

**Why**: VSCode settings contain both tooling config and personal preferences. Direct overwrite would destroy user customizations. The existing merge logic already handles this correctly.

### 7. File completeness check for local preset

**Choice**: When local preset directory exists but files are incomplete (user deleted some), copy available files as-is. No auto-completion from built-in preset.

**Why**: User deliberately deleted files from local preset. Respecting that choice is simpler and more predictable than trying to guess which deletions were intentional. The missing files simply won't be written to the project root.

**Alternative considered**: Auto-fill missing files from built-in preset. Rejected because it contradicts user intent and adds complexity (need to know which files should exist for each preset + flags combination).

## Over-Engineering Traps

- **Don't add a schema or validation for local preset directory** — if files are there, use them; if not, skip them. No manifest, no checksums.
- **Don't add a "diff" or "sync" command** — user edits files directly, no tool-managed synchronization.
- **Don't persist flag state** — `--stylelint` affects what gets generated/materialized on first run, but the local preset just contains whatever files were generated. On subsequent runs, `--stylelint` still filters appropriately.
- **Don't add a local preset for init preset** — init command copies skill files, not config generation. No materialization applies.

## Risks / Trade-offs

- **[Stale presets]** → Local presets don't auto-update when lux is upgraded. Mitigated by `--reset` flag and clear documentation that version updates require manual reset.
- **[Flag mismatch on subsequent runs]** → First run with `--stylelint` materializes stylelint files. Second run without `--stylelint` still copies them from local preset. This is correct behavior — the local preset is the user's source of truth, and `--stylelint` filters at copy time. Wait — actually `--stylelint` should still filter stylelint files even from local preset. This needs careful handling: the flag filters which files to copy, regardless of source.
- **[Read-back performance]** → Reading files back from disk for materialization adds minimal I/O (7 small text files). Under the 100ms NFR threshold easily.
