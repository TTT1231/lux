# Custom Preset Configuration

Presets are stored at `~/.lux/preset/` (i.e. `os.homedir()/.lux/preset/`). Override with the `LUX_HOME` env var.

```
~/.lux/preset/
├── fmt/                  # fmt presets (web-vue, web-react, electron-vue, uniapp, node, nest)
└── vscode/               # vscode presets (same + go)
```

> ⚠️ **Always use `lux init --preset` to initialize all built-in presets.**

## Built-in Presets File Reference

### fmt preset

| File                   | Description                                                        | web-vue | web-react | electron-vue | uniapp | node | nest |
| :--------------------- | :----------------------------------------------------------------- | :-----: | :-------: | :----------: | :----: | :--: | :--: |
| `eslint.config.mjs`    | ESLint flat config                                                 |   ✅    |    ✅     |      ✅      |   ✅   |  ✅  |  —   |
| `.prettierrc`          | Prettier JSON config                                               |   ✅    |    ✅     |      ✅      |   ✅   |  ✅  |  ✅  |
| `.prettierignore`      | Prettier ignore rules                                              |   ✅    |    ✅     |      ✅      |   ✅   |  ✅  |  ✅  |
| `stylelint.config.mjs` | Stylelint config                                                   |   ✅    |    ✅     |      ✅      |   ✅   |  —   |  —   |
| `.stylelintignore`     | Stylelint ignore rules                                             |   ✅    |    ✅     |      ✅      |   ✅   |  —   |  —   |
| `cspell.json`          | CSpell dictionary config                                           |   ✅    |    ✅     |      ✅      |   ✅   |  ✅  |  ✅  |
| `.editorconfig`        | EditorConfig config                                                |   ✅    |    ✅     |      ✅      |   ✅   |  ✅  |  ✅  |
| `.lintstagedrc.json`   | lint-staged config (enables `--lint-staged`)                       |   ✅    |    ✅     |      ✅      |   ✅   |  ✅  |  ✅  |
| `.husky/pre-commit`    | Husky Git hook (enables `--husky` or `--lint-staged`)              |   ✅    |    ✅     |      ✅      |   ✅   |  ✅  |  ✅  |
| `deps.json`            | Dependency registry (tool-grouped, supports flag-aware collection) |   ✅    |    ✅     |      ✅      |   ✅   |  ✅  |  ✅  |
| `package.json`         | Template with `scripts`                                            |   ✅    |    ✅     |      ✅      |   ✅   |  ✅  |  ✅  |

> **Note:** `node` and `nest` presets exclude stylelint (backend projects don't need CSS lint). `nest` preset excludes eslint (Nest CLI manages its own; preset sets `neverOverwrite: ['eslint.config.mjs']`), but force-overwrites `.prettierrc` (`forceOverwrite: ['.prettierrc']`).

### vscode preset

| File              | Description                      |
| :---------------- | :------------------------------- |
| `settings.json`   | VSCode workspace settings        |
| `extensions.json` | VSCode extension recommendations |

## Customize Built-in Presets

```bash
lux init --preset                # Initialize all built-in presets
```

After init, edit files under `~/.lux/preset/<type>/<preset-name>/` to customize — e.g. `package.json`, `eslint.config.mjs`, `deps.json`, etc. You can also add your own lint config files. Changes take effect on the next `lux fmt` / `lux vscode` run.

> **Note:** During materialization, `deps.json` is statically exported from preset code with full dependency groupings. You can edit it to pin versions or add custom dependencies.

To reset a customized built-in preset, re-run `lux init --preset` to overwrite, or use `lux fmt <name> --reset` / `lux vscode <name> --reset` (deletes the local preset dir only; re-generated from built-in on next run).

## Create Custom Presets

### fmt

Create a directory under `~/.lux/preset/fmt/<your-fmt-preset-name>/` with config files and a `package.json`:

```bash
# 1. Create the preset directory
mkdir -p ~/.lux/preset/fmt/[your-custom-fmt-preset-name]

# 2. Add config files
#    Required: package.json (with devDependencies/dependencies and/or scripts)
#    Required: deps.json (dependency registry — lux errors without it)
#    Recommended: include ALL tool configs so --stylelint / --cspell / --editorconfig flags can take effect
#    Config files: eslint.config.mjs, .prettierrc, .prettierignore,
#                  stylelint.config.mjs, .stylelintignore,
#                  cspell.json, .editorconfig, .lintstagedrc.json, etc.
#
#    ⚠️ Only configs present in the preset can be controlled by flags. See "Flag-based Filtering" below.
```

Minimum `package.json` example:

```json
{
   "devDependencies": {
      "eslint": "<latest>",
      "prettier": "<latest>"
   },
   "scripts": {
      "lint": "<pm> eslint .",
      "lint:fix": "<pm> eslint . --fix --cache --cache-location node_modules/.cache/.eslintcache",
      "cspell": "<pm> cspell \"**\""
   }
}
```

Then run `lux fmt list` to verify — check that `<your-fmt-preset-name>` appears in the list.

```bash
lux fmt <your-fmt-preset-name>                            # Apply your custom preset
lux fmt <your-fmt-preset-name>  --force                   # Overwrite existing config files
lux fmt <your-fmt-preset-name> --dry-run                  # Preview without writing
lux fmt <your-fmt-preset-name> --stylelint                # Apply custom preset (includes stylelint config)
```

Important notes:

- Custom presets appear after built-in ones in `lux fmt list`, marked as `(custom)`
- Custom presets **must** contain `package.json` to be detected by `lux fmt list`
- `lux fmt <name> --reset` warns and aborts for custom presets — there is no built-in source to restore
- Unknown preset names are fuzzy-matched against all available presets (built-in + custom) using Levenshtein distance to suggest the closest match
- `lux fmt` returns exit code **1** when a preset is not found (safe for CI/CD)
- `lux fmt <name> --stylelint/--editorconfig/--cspell/--lint-staged` warns when the flag has no effect (preset has no matching config or dependencies)

> For general flag behavior (`--force`, `--dry-run`, `--no-install`, `--reset`), see `skill.md`. The sections below only cover behaviors specific to custom preset interaction.

### vscode

Custom vscode presets are not yet supported. To customize VSCode settings, use the built-in preset customization flow:

```bash
lux init --preset                                     # Materialize built-in presets
# Edit files under ~/.lux/preset/vscode/<preset-name>/
#   - settings.json   (VSCode workspace settings)
#   - extensions.json (extension recommendations)
lux vscode web-vue                                    # Apply your customized preset
```

## Customize Scripts in package.json

If you're unhappy with the `scripts` in `package.json`, you can edit them directly. This works for both custom presets and customized built-in presets.

## Fmt Presets · package.json Rules

Use `<latest>` placeholder in `devDependencies` and `dependencies` to get the latest version, or pin a specific version. Use `<pm>` placeholder in `scripts` to let lux auto-detect the package manager.

```jsonc
{
   "devDependencies": {
      // Latest version
      "prettier": "<latest>",
      // Pinned version
      "cspell": "10.0.0",
   },
   "scripts": {
      "lint": "<pm> eslint .",
      "lint:fix": "<pm> eslint . --fix --cache --cache-location node_modules/.cache/.eslintcache",
      "cspell": "<pm> cspell \"**\"",
   },
}
```

## Flag-based Filtering (`--stylelint`, `--cspell`, `--editorconfig`, `--husky`, `--lint-staged`)

The `--stylelint`/`--cspell`/`--editorconfig`/`--husky`/`--lint-staged` flags control **strip/retain** behavior. For these flags to work with your custom preset, you must include **all** relevant config files and dependencies in the preset directory — lux can only strip what already exists; it cannot inject what is missing.

> **`--lint-staged` implies `--husky`**: Passing `--lint-staged` automatically enables husky (`husky = options.husky || options.lintStaged`) — you don't need to pass both.

### Three-layer Filtering

When a flag is **not** passed (default), lux skips the corresponding files, deps, and scripts. When a flag **is** passed, those items are preserved.

| Layer           | Matching rule                                                                                                                               | Examples                                                                                          |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------ |
| **Files**       | Exact filename match                                                                                                                        | `stylelint.config.mjs`, `.stylelintignore`, `cspell.json`, `.editorconfig`, `.lintstagedrc.json`  |
| **Deps**        | Tool-key lookup in deps.json: if `stylelint`/`cspell`/`editorconfig`/`husky`/`lint-staged` key exists and flag is on, collects all sub-deps | e.g. if `deps.json` has `"stylelint": {...}`, all sub-deps are collected when `--stylelint` is on |
| **Script keys** | **Case-sensitive exact segment match** after splitting the key by `:`                                                                       | See detailed rules below                                                                          |

> **`eslint` and `prettier` are always enabled** — their files, deps, and scripts are never controlled by any flag; they are always included.

### Script Naming Convention (Important)

lux splits a script **key** by `:` and checks whether any segment exactly equals the controlled keyword:

| Script key example      | Filtered by `--stylelint`? | Reason                                    |
| :---------------------- | :------------------------- | :---------------------------------------- |
| `stylelint:check`       | ✅ Yes                     | one segment is exactly `stylelint`        |
| `stylelint`             | ✅ Yes                     | the whole key is exactly `stylelint`      |
| `Stylelint:check`       | ❌ No                      | uppercase `S`, case-sensitive mismatch    |
| `stylelint-check`       | ❌ No                      | no `:` segment exactly equals `stylelint` |
| `stylelint-extra:check` | ❌ No                      | substring matches do not count            |

The same rules apply to `cspell`, `editorconfig`, and `lint-staged`:

| Keyword        | Matching key examples              | Non-matching key examples                     |
| :------------- | :--------------------------------- | :-------------------------------------------- |
| `stylelint`    | `stylelint:check`, `stylelint`     | `Stylelint:*`, `style:*`, `stylelint-extra:*` |
| `cspell`       | `cspell`, `cspell:check`           | `Cspell:*`, `spell:*`, `spellcheck`           |
| `editorconfig` | `editorconfig:check`               | `Editorconfig:*`, `editor:*`                  |
| `lint-staged`  | `lint-staged`, `lint-staged:check` | `Lint-staged:*`, `pre:lint-staged2`           |

> **Note:** `husky` has no script key filtering — the husky init script (`prepare`/`postinstall`) has a fixed name, injected directly by lux, not matched by keyword.

**Non-matching script keys are copied as-is** to the target project — lux does not inspect or strip command text inside script values. Put optional tools in separate scripts with exact segment keys such as `stylelint:check` or `cspell:check` instead of hiding them inside a composite `lint` command.

### Husky Hook Content Stripping

When using a custom preset with a materialized `.husky/pre-commit`, lux adjusts the hook content based on the passed flags:

- **`--lint-staged` passed**: retains `<pmx> lint-staged` (lint-staged runs on pre-commit)
- **`--husky` only (no `--lint-staged`)**: replaces `<pmx> lint-staged` with `<pm> type:check` (fallback to type checking)
- **Neither flag passed**: skips husky initialization entirely

### Full Custom Preset Example (All Flags Supported)

To make `--stylelint`, `--cspell`, `--editorconfig`, `--husky`, and `--lint-staged` all functional, your custom preset should include configs for **every tool**:

```
~/.lux/preset/fmt/my-full-preset/
├── eslint.config.mjs         # ESLint config
├── .prettierrc                # Prettier config
├── .prettierignore            # Prettier ignore rules
├── stylelint.config.mjs      # ← enables --stylelint
├── .stylelintignore           # ← enables --stylelint
├── cspell.json                # ← enables --cspell
├── .editorconfig              # ← enables --editorconfig
├── .lintstagedrc.json         # ← enables --lint-staged
├── .husky/
│   └── pre-commit             # ← enables --husky / --lint-staged
├── deps.json                  # ← REQUIRED! dependency registry
└── package.json               # with scripts (optional)
```

`deps.json` should include corresponding dependency groupings:

```jsonc
{
   "devDependencies": {
      "typescript": "<latest>",
   },
   "dependencies": {},
   "eslint": {
      "devDependencies": {
         "eslint": "<latest>",
      },
   },
   "prettier": {
      "devDependencies": {
         "prettier": "<latest>",
      },
   },
   // ← enables --stylelint
   "stylelint": {
      "devDependencies": {
         "stylelint": "<latest>",
         "stylelint-config-standard-scss": "<latest>",
         "stylelint-order": "<latest>",
         "postcss-html": "<latest>",
      },
   },
   // ← enables --cspell
   "cspell": {
      "devDependencies": {
         "cspell": "<latest>",
      },
   },
   // ← enables --husky
   "husky": {
      "devDependencies": {
         "husky": "<latest>",
      },
   },
   // ← enables --lint-staged
   "lint-staged": {
      "devDependencies": {
         "lint-staged": "<latest>",
      },
   },
}
```

`package.json` should include corresponding scripts:

```jsonc
{
   "scripts": {
      "lint": "<pm> eslint .",
      "lint:fix": "<pm> eslint . --fix --cache --cache-location node_modules/.cache/.eslintcache",
      // ← key has an exact "stylelint" segment, controllable by --stylelint
      "stylelint:check": "<pm> stylelint \"src/**/*.{css,scss,vue}\"",
      // ← key is exactly "cspell", controllable by --cspell
      "cspell": "<pm> cspell \"**\"",
      // ← key is exactly "lint-staged", controllable by --lint-staged
      "lint-staged": "lint-staged",
   },
}
```

Usage:

```bash
lux fmt my-full-preset                          # ESLint + Prettier only
lux fmt my-full-preset --stylelint              # + Stylelint
lux fmt my-full-preset --stylelint --cspell     # + Stylelint + CSpell
lux fmt my-full-preset --stylelint --cspell --editorconfig  # + Stylelint + CSpell + EditorConfig
lux fmt my-full-preset --lint-staged                        # + lint-staged + husky
lux fmt my-full-preset --husky                              # husky only (no lint-staged, runs type:check)
lux fmt my-full-preset --stylelint --cspell --lint-staged   # all tools
```

## Implementation Notes

In custom presets and customized built-in presets, the following filenames participate in flag filtering logic (hardcoded matching):

- Stylelint config files: `stylelint.config.mjs`, `.stylelintignore` (controlled by `--stylelint`)
- CSpell config file: `cspell.json` (controlled by `--cspell`)
- lint-staged config file: `.lintstagedrc.json` (controlled by `--lint-staged`)
- Editor config file: `.editorconfig` (controlled by `--editorconfig`)

The following filenames have no filtering logic but use standard naming conventions:

- ESLint config: `eslint.config.mjs`
- Prettier config: `.prettierrc`, `.prettierignore`

Special files:

- Husky hook: `.husky/pre-commit` (note: under `.husky/` subdirectory, not a root-level `pre-commit`). It is **not** in the file scan scope of `applyLocalFmtPreset` (which only scans plain files in the preset root directory), so it is **not copied** to the target project during the apply phase. Husky hooks are handled separately by `initHusky()` — reading the template from the materialized preset, replacing `<pm>`/`<pmx>` tags, then writing to the target project.
- `deps.json`: Dependency registry, **required**. If missing, lux errors and aborts, skipping dependency installation and husky initialization. For built-in presets, `deps.json` is generated from statically exported code during materialization; for custom presets, it must be created manually.
- `package.json`: Optional. If it contains `scripts`, they are merged into the target project's `package.json`; without it, script injection is skipped. Dependency information lives in `deps.json`, not in `package.json`'s `devDependencies`.

Other files: lux copies them to the target project with `<lockfile>` tag resolution — they are **not** copied as-is.

`<pm>` / `<pmx>` / `<lockfile>` tag resolution is affected by the `lux_package_manager` global config — set via `lux set lux_package_manager=pnpm` to make lux prioritize that config over lockfile detection for determining the package manager, which in turn affects tag replacement values (a warning is printed if the lockfile doesn't match).

`lux_package_manager` defaults to `auto` — auto-detected from the target's lockfile; if no lockfile is found, it defaults to `npm`.

### deps.json

`deps.json` records dependency mappings, grouped by tool. Its core purpose is to implement **conditional dependency collection** based on flags (`--stylelint`, `--cspell`, etc.) — `deps.json` records the complete dependencies for all tools, and lux selectively collects the dependencies for the corresponding tools based on the flags the user passes.

**For custom presets, `deps.json` is a required file**. If missing, lux throws an error and aborts execution. Ensure all dependencies needed by lint tools (eslint, stylelint, etc.) are declared in `deps.json` — if a dependency is omitted from `deps.json`, it won't be written to the target project's `package.json`, causing "missing dependency" errors at runtime.

#### File Format

```jsonc
{
   // Top-level: always collected (not gated by flags)
   "devDependencies": {
      "typescript": "<latest>",
      "vue-tsc": "<latest>",
   },
   "dependencies": {},

   // Tool groups: collected only when the corresponding flag is on
   "eslint": {
      "devDependencies": {
         "eslint": "<latest>",
         "@vue/eslint-config-typescript": "<latest>",
         "@vue/eslint-config-prettier": "<latest>",
      },
   },
   "prettier": {
      "devDependencies": {
         "prettier": "<latest>",
      },
   },
   "stylelint": {
      "devDependencies": {
         "stylelint": "<latest>",
         "stylelint-config-standard-scss": "<latest>",
         "postcss-html": "<latest>",
      },
   },
   "cspell": {
      "devDependencies": {
         "cspell": "<latest>",
      },
   },
   "husky": {
      "devDependencies": {
         "husky": "<latest>",
      },
   },
   "lint-staged": {
      "devDependencies": {
         "lint-staged": "<latest>",
      },
   },
}
```

- Top-level `devDependencies` / `dependencies`: always collected, unaffected by any flag
- Tool group keys must match exactly: `eslint`, `prettier`, `stylelint`, `cspell`, `editorconfig`, `husky`, `lint-staged`
- `<latest>` placeholders are resolved to the latest version from the npm registry at command execution time

#### Dependency Collection Logic

How `collectDepsFromRegistry()` works:

1. **Always collect** top-level `devDependencies` and `dependencies`
2. **Always collect** `eslint` and `prettier` group dependencies (core tools)
3. **Conditional collection**: adds `stylelint`/`cspell`/`editorconfig`/`husky`/`lint-staged` to the active tool set based on flags
4. Iterates over active tools; if the corresponding key exists in `deps.json`, collects all of its `devDependencies` and `dependencies`

### `<lockfile>` Resolution

The `<lockfile>` tag is resolved to the corresponding lockfile name (e.g. `bun.lock`, `package-lock.json`, etc.). **All config files** support `<lockfile>` tag resolution, including:

- `eslint.config.mjs` `ignores` section
- `.prettierrc`
- `.prettierignore`
- `stylelint.config.mjs`
- `.stylelintignore`
- `cspell.json`
- `.editorconfig`
- and any other config files in custom presets

When no package manager is detected (no lockfile), `<lockfile>` lines are removed from the config content (including handling of commas, quotes, and other boundary cases).

### `<pm>` Resolution

The `<pm>` tag is replaced with the package manager's **run prefix**:

| Package Manager | `<pm>` Replacement |
| :-------------- | :----------------- |
| npm             | `npm run`          |
| yarn            | `yarn run`         |
| pnpm            | `pnpm run`         |
| bun             | `bun run`          |

`<pm>` tag resolution scope:

- `package.json` `scripts` values
- `.husky/pre-commit` hook content

### `<pmx>` Resolution

The `<pmx>` tag is replaced with the package manager's **exec prefix** (for running one-off commands):

| Package Manager | `<pmx>` Replacement |
| :-------------- | :------------------ |
| npm             | `npx`               |
| yarn            | `yarn dlx`          |
| pnpm            | `pnpx`              |
| bun             | `bunx`              |

`<pmx>` tag resolution scope:

- `.husky/pre-commit` hook content

### No Git Warning

`husky` and `lint-staged` require a `git` repository to function. `initHusky()` checks for a `.git` directory in the project root before proceeding — if the project has not been initialized as a git repository, it outputs the warning `Git repository not found. Husky and lint-staged require a git repo — skipping.` and skips husky initialization, but other configs (eslint, prettier, etc.) still execute normally.

### Conflict Sibling Detection

lux avoids creating duplicate flat config files in the same config family. When generating `eslint.config.mjs`, it checks for existing `eslint.config.js`, `eslint.config.cjs`, and `eslint.config.ts`. When generating `stylelint.config.mjs`, it checks for existing `stylelint.config.js`, `stylelint.config.cjs`, and `stylelint.config.ts`.

If a sibling exists and `--force` is not passed, lux skips the generated `.mjs` file and warns which sibling caused the conflict. Passing `--force` overrides sibling detection.

### Package Manager Conflict Warning

When the `lux_package_manager` global config doesn't match the project's actual lockfile, lux outputs a warning but still uses the configured value. For example:

```bash
lux set lux_package_manager=pnpm
cd my-bun-project/  # contains bun.lock
lux fmt web-vue     # warns: global config is pnpm but bun.lock was detected, still using pnpm
```
