# Custom Preset Configuration

Presets are stored at `~/.lux/preset/` (i.e. `os.homedir()/.lux/preset/`). Override with `LUX_HOME` env var.

```
~/.lux/preset/
├── fmt/                  # fmt presets (web-vue, web-react, electron-vue, uniapp, node, nest)
└── vscode/               # vscode presets (same + go)
```

> ⚠️ **Always use `lux init --preset` to initialize all built-in presets.**

## Built-in presets File Reference

### fmt preset

| File                   | Description                                   |
| :--------------------- | :-------------------------------------------- |
| `eslint.config.mjs`    | ESLint flat config                            |
| `.prettierrc`          | Prettier JSON config                          |
| `.prettierignore`      | Prettier ignore rules                         |
| `stylelint.config.mjs` | Stylelint config                              |
| `.stylelintignore`     | Stylelint ignore rules                        |
| `cspell.json`          | CSpell dictionary config                      |
| `.editorconfig`        | EditorConfig config                           |
| `.lintstagedrc.json`   | lint-staged config (enables `--lint-staged`)  |
| `package.json`         | Template with `devDependencies` and `scripts` |

### vscode preset

| File              | Description                      |
| :---------------- | :------------------------------- |
| `settings.json`   | VSCode workspace settings        |
| `extensions.json` | VSCode extension recommendations |

## Customize built-in presets

```bash
lux init --preset                # init all built-in presets
```

After init, edit files under `~/.lux/preset/<type>/<preset-name>/` to customize — e.g. `package.json`, `eslint.config.mjs`, etc. You can also add your own lint files like `your-file-lint-config`. Changes take effect on the next `lux fmt` / `lux vscode` run.

To reset a customized built-in preset, re-run `lux init --preset` to overwrite, or use `lux fmt <name> --reset` / `lux vscode <name> --reset` (deletes local preset dir only; re-generated from built-in on next run).

## Customize your own presets

### fmt

Create a directory under `~/.lux/preset/fmt/<your-fmt-preset-name>/` with config files and a `package.json`:

```bash
# 1. Create the preset directory
mkdir -p ~/.lux/preset/fmt/[your-custom-fmt-preset-name]

# 2. Add config files
#    Required: package.json (with devDependencies/dependencies and/or scripts)
#    Recommended: include ALL tool configs so --stylelint / --cspell / --editorconfig flags can take effect
#    Config files: eslint.config.mjs, .prettierrc, .prettierignore,
#                  stylelint.config.mjs, .stylelintignore,
#    Config files: eslint.config.mjs, .prettierrc, .prettierignore,
#                  stylelint.config.mjs, .stylelintignore,
#                  cspell.json, .editorconfig, .lintstagedrc.json, etc.
#
#    ⚠️ Only configs present in the preset can be controlled by flags. See "Flag-based filtering" below.
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

Then run `lux fmt list` to verify — check if `<your-fmt-preset-name>` appears in the list.

```bash
lux fmt <your-fmt-preset-name>                            # applies your custom preset
lux fmt <your-fmt-preset-name>  --force                   # overwrite existing config files
lux fmt <your-fmt-preset-name> --dry-run                  # preview without writing
lux fmt <your-fmt-preset-name> --stylelint                # applies your custom preset (includes stylelint config)
```

Notes:

- `lux fmt list` shows custom presets after built-in ones, marked with `(custom)`
- `lux fmt <name> --reset` warns and aborts for custom presets — there is no built-in source to restore
- Unknown preset names fuzzy-match against all available presets (builtin + custom combined)
- `lux fmt` returns exit code **1** when a preset is not found (safe for CI/CD)
- `lux fmt <name> --stylelint/--editorconfig/--cspell/--husky/--lint-staged` warns when the flag has no effect (preset has no matching config or dependencies)

> For general flag behavior (`--force`, `--dry-run`, `--no-install`, `--reset`), see `skill.md`. The sections below only cover behaviors specific to custom preset interaction.

### vscode

Custom vscode presets are not yet supported. To customize VSCode settings, use the built-in preset customization flow:

```bash
lux init --preset                                     # materialize built-in presets
# Edit files under ~/.lux/preset/vscode/<preset-name>/
#   - settings.json   (VSCode workspace settings)
#   - extensions.json (extension recommendations)
lux vscode web-vue                                    # applies your customized preset
```

## Fmt presets · package.json rules

Use `<latest>` placeholder for `devDependencies` and `dependencies` to get the latest version, or pin a specific version. Use `<pm>` placeholder in `scripts` to let lux auto-detect the package manager.

```jsonc
{
   "devDependencies": {
      // latest version
      "prettier": "<latest>",
      // pinned version
      "cspell": "10.0.0",
   },
   "scripts": {
      "lint": "<pm> eslint .",
      "lint:fix": "<pm> eslint . --fix --cache --cache-location node_modules/.cache/.eslintcache",
      "cspell": "<pm> cspell \"**\"",
   },
}
```

## Flag-based filtering (`--stylelint`, `--cspell`, `--editorconfig`, `--husky`, `--lint-staged`)

The `--stylelint`/`--cspell`/`--editorconfig`/`--husky`/`--lint-staged` flags control **strip/inject** behavior. For these flags to work with your custom preset, you must include **all** relevant config files and dependencies in the preset directory — lux can only strip what already exists; it cannot inject what is missing.

### Three-layer filtering

When a flag is **not** passed (default), lux skips the corresponding files, deps, and scripts. When a flag **is** passed, those items are preserved.

| Layer         | Matching rule                                                                                                                  | Examples                                                     |
| :------------ | :----------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------- |
| **Files**     | Exact filename match                                                                                                           | `stylelint.config.mjs`, `.stylelintignore`, `cspell.json`, `.editorconfig`, `.lintstagedrc.json` |
| **Deps**      | stylelint: predefined set match; editorconfig: `includes('editorconfig')`; cspell: `dep === 'cspell'`; husky: `dep === 'husky'`; lint-staged: `dep === 'lint-staged'` | `stylelint`, `postcss-html`, `cspell`, `editorconfig-checker`, `husky`, `lint-staged` |
| **Script keys** | **Case-sensitive** `key.includes(keyword)` match + inline command segment stripping                                           | See detailed rules below                                     |

### Script naming convention (important)

lux checks whether a script **key** contains a specific keyword to decide if it should be filtered:

| Script key example              | Filtered by `--stylelint`? | Reason                                        |
| :------------------------------ | :------------------------- | :-------------------------------------------- |
| `stylelint:check`               | ✅ Yes                      | key contains `stylelint` (all lowercase)      |
| `stylelint`                     | ✅ Yes                      | key contains `stylelint`                       |
| `Stylelint:check`               | ❌ No                       | uppercase `S`, case-sensitive mismatch         |
| `style:check`                   | ❌ No                       | key does not contain the full word `stylelint` |
| `lintX:check`                   | ❌ No                       | key does not contain any known keyword         |

The same rules apply to `cspell` and `editorconfig`:

| Keyword         | Matching key examples         | Non-matching key examples       |
| :-------------- | :---------------------------- | :------------------------------ |
| `stylelint`     | `stylelint:check`, `stylelint` | `Stylelint:*`, `style:*`        |
| `cspell`        | `cspell`, `cspell:check`      | `Cspell:*`, `spell:*`           |
| `editorconfig`  | `editorconfig:check`          | `Editorconfig:*`, `editor:*`    |
| `lint-staged`   | `lint-staged`, `lint-staged:check` | `Lint-staged:*` (case-sensitive) |

**Non-matching script keys are copied as-is** to the target project — lux does not process them.

### Inline command segment stripping

lux also strips inline tool invocation segments from **composite scripts**:

```jsonc
{
   "scripts": {
      // Original: composite script with stylelint and cspell
      "lint": "<pm> eslint . && stylelint \"src/**/*.{css,scss,vue}\" && cspell --gitignore \"src/**/*\"",

      // When --stylelint and --cspell are NOT passed, both segments are stripped
      // Result: "lint": "<pm> eslint ."
   }
}
```

Inline stripping matches `&& stylelint "..."` and `&& cspell ...` patterns in command text.

### Full custom preset example (all flags supported)

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
└── package.json               # with all devDependencies and scripts
```

The `package.json` should include corresponding deps and scripts:

```jsonc
{
   "devDependencies": {
      "eslint": "<latest>",
      "prettier": "<latest>",
      // ← enables --stylelint
      "stylelint": "<latest>",
      "stylelint-config-standard-scss": "<latest>",
      "stylelint-order": "<latest>",
      "postcss-html": "<latest>",
      // ← enables --cspell
      "cspell": "<latest>",
      // ← enables --husky
      "husky": "<latest>",
      // ← enables --lint-staged
      "lint-staged": "<latest>"
   },
   "scripts": {
      "lint": "<pm> eslint .",
      "lint:fix": "<pm> eslint . --fix --cache --cache-location node_modules/.cache/.eslintcache",
      // ← key contains "stylelint", controllable by --stylelint
      "stylelint:check": "<pm> stylelint \"src/**/*.{css,scss,vue}\"",
      // ← key contains "cspell", controllable by --cspell
      "cspell": "<pm> cspell \"**\"",
      // ← key contains "lint-staged", controllable by --lint-staged
      "lint-staged": "lint-staged"
   }
}
```

Usage:

```bash
lux fmt my-full-preset                          # ESLint + Prettier only
lux fmt my-full-preset --stylelint              # + Stylelint
lux fmt my-full-preset --stylelint --cspell     # + Stylelint + CSpell
lux fmt my-full-preset --stylelint --cspell --editorconfig  # + Stylelint + CSpell + EditorConfig
lux fmt my-full-preset --lint-staged                        # + lint-staged + husky
lux fmt my-full-preset --stylelint --cspell --lint-staged   # all tools
```
