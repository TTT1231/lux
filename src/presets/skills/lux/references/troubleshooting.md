# Troubleshooting

## lux init

### "Bundled skills directory not found" error

**Symptom:** Running `lux init` shows `Bundled skills directory not found: <path>`.

**Cause:** The `dist/skills/` directory is missing from the lux installation.

**Fix:** Reinstall lux globally:

```bash
npm install -g @luxkit/cli@latest
# or
bun install -g @luxkit/cli@latest
```

If developing locally, run `bun run build` first.

### "No skill files were copied" warning

**Symptom:** `lux init` completes but warns no files were copied.

**Cause:** The bundled skills directory exists but contains no subdirectories.

**Fix:** This indicates a corrupted installation. Reinstall lux.

## lux fmt

### "Preset not found" error (exit code 1)

**Symptom:** `lux fmt <name>` returns `Preset "<name>" not found` with exit code 1.

**Fix:** Check available presets with `lux fmt list`. If the name is slightly wrong, lux will fuzzy-match and suggest alternatives using Levenshtein distance. For custom presets, ensure the directory exists at `~/.lux/preset/fmt/<name>/`.

### Custom preset not appearing in `lux fmt list`

**Symptom:** Created a preset directory but `lux fmt list` doesn't show it.

**Cause:** The preset directory is missing a `package.json` file.

**Fix:** Every custom fmt preset **must** contain a `package.json` with at least `devDependencies` or `scripts`. Without it, lux cannot detect the preset. Example minimal `package.json`:

```json
{
   "devDependencies": {
      "eslint": "<latest>"
   },
   "scripts": {
      "lint": "<pm> eslint ."
   }
}
```

### "deps.json not found" error

**Symptom:** `lux fmt <custom-name>` fails with `deps.json not found in "<path>". Run with --reset to re-materialize the preset.`

**Cause:** The preset directory is missing a `deps.json` file, which is **required** for dependency collection and flag-based filtering.

**Fix:** Create a `deps.json` in the preset directory. At minimum:

```json
{
   "devDependencies": {},
   "dependencies": {},
   "eslint": {
      "devDependencies": {
         "eslint": "<latest>"
      }
   },
   "prettier": {
      "devDependencies": {
         "prettier": "<latest>"
      }
   }
}
```

For built-in presets: run `lux init --preset` to re-materialize, or `lux fmt <name> --reset`.

### "deps.json is not valid JSON" error

**Symptom:** `lux fmt <name>` fails with `deps.json in "<path>" is not valid JSON.`

**Cause:** The `deps.json` file has a syntax error (e.g., trailing comma, missing bracket).

**Fix:** Validate the JSON syntax. For built-in presets: run `lux fmt <name> --reset` to re-materialize from built-in.

### "--xxx has no effect" warning

**Symptom:** `lux fmt <name> --stylelint` (or `--cspell`, `--editorconfig`, `--lint-staged`) warns that the flag has no effect.

**Cause:** The preset doesn't contain the corresponding config files **and** dependency entries in `deps.json`. lux checks both — if neither exists, the flag is considered ineffective.

**Fix:** Add the required files and deps.json entries to the preset directory:

| Flag             | Required files                             | Required deps.json key    |
| :--------------- | :----------------------------------------- | :------------------------ |
| `--stylelint`    | `stylelint.config.mjs`, `.stylelintignore` | `"stylelint"`             |
| `--cspell`       | `cspell.json`                              | `"cspell"`                |
| `--editorconfig` | `.editorconfig`                            | `"editorconfig"`          |
| `--lint-staged`  | `.lintstagedrc.json`                       | `"lint-staged"`           |

> **Note:** `--husky` does not have a separate "no effect" warning — it is implicitly enabled by `--lint-staged`. When used alone, it only requires the `"husky"` key in `deps.json`.

### "--reset warns and aborts for custom presets"

**Symptom:** `lux fmt <custom-name> --reset` shows `"<name>" is a custom preset, --reset has no builtin to restore` and does nothing.

**Cause:** By design — custom presets have no built-in source to restore from. `--reset` only works for built-in presets.

**Fix:** Manually edit files in `~/.lux/preset/fmt/<custom-name>/`, or delete the directory and recreate it.

### Script key not controlled by flags

**Symptom:** A custom preset script is always copied even when the corresponding flag is not passed.

**Cause:** Script key doesn't contain the required keyword. Matching is **case-sensitive** and uses `key.includes(keyword)`.

**Fix:** Rename the script key to include the keyword:

| Keyword        | Correct key          | Wrong key            |
| :------------- | :------------------- | :------------------- |
| `stylelint`    | `stylelint:check`    | `Stylelint:check`    |
| `cspell`       | `cspell:check`       | `Cspell:check`       |
| `editorconfig` | `editorconfig:check` | `Editorconfig:check` |
| `lint-staged`  | `lint-staged`        | `Lint-staged`        |

> **Note:** `husky` scripts are NOT controlled by keyword matching. The husky init script (`prepare` or `postinstall`) is injected directly by lux with a fixed key name.

### Git repository not found (--husky / --lint-staged)

**Symptom:** `lux fmt <name> --husky` shows `Git repository not found. Husky and lint-staged require a git repo — skipping.`

**Cause:** The project directory does not have a `.git` directory — husky and lint-staged require git to function.

**Fix:** Initialize a git repository first:

```bash
git init
```

Then re-run `lux fmt <name> --husky`. Note that other config files (ESLint, Prettier, etc.) are still generated — only husky/lint-staged setup is skipped.

### Husky setup with --no-install

**Symptom:** You used `lux fmt <name> --no-install --husky` and `husky` is not installed in `node_modules` yet.

**Cause:** `--no-install` writes dependencies to `package.json` but does not install local binaries.

**Fix:** Run your package manager install when ready. `lux` already creates `.husky/_` support files and writes `.husky/pre-commit` directly, so do not run `husky init` manually; that command can recreate the default hook content.

### "package.json not found, skipping script injection"

**Symptom:** `lux fmt` runs but scripts are not added to `package.json`.

**Cause:** No `package.json` exists in the current working directory.

**Fix:** Run `npm init -y` / `bun init` first, then retry `lux fmt`.

### Dependency installation failed

**Symptom:** `lux fmt` warns `Dependency installation failed: <message>`.

**Fix:** Dependencies were already written to `package.json`. Install them manually:

```bash
bun install   # or npm install / pnpm install / yarn
```

### "Failed to fetch versions" warning

**Symptom:** `lux fmt` warns `Failed to fetch versions: <message>. You can add dependencies manually.`

**Cause:** Network issue or npm registry unreachable — lux cannot resolve `<latest>` version placeholders in `deps.json`.

**Fix:** Dependencies with `<latest>` placeholders are written to `package.json` as-is. Manually replace `<latest>` with specific versions and run install:

```bash
# Edit package.json, replace "<latest>" with real versions, then:
bun install
```

Or check network/proxy settings and retry `lux fmt`.

### Existing config files skipped (no --force)

**Symptom:** `lux fmt` shows `Skipped N file(s) (already exists)` but expected files to be updated.

**Cause:** By default, lux skips existing config files to avoid overwriting user customizations.

**Fix:** Use `--force` to overwrite:

```bash
lux fmt <name> --force
```

Note: `--force` overwrites config files and scripts, but **never** overwrites dependencies — deps are always additive (missing only). Some files are protected by preset rules:
- **`neverOverwrite`**: Files that are never overwritten even with `--force` (e.g., nest preset never overwrites `eslint.config.mjs`)
- **`forceOverwrite`**: Files that are always overwritten even without `--force` (e.g., nest preset always overwrites `.prettierrc`)
- **`.husky/pre-commit`**: Always overwritten by `initHusky()` regardless of `--force` — husky's default hook must be replaced with the correct content

### "--reset doesn't work" / "Local preset not found"

**Symptom:** `lux fmt <name> --reset` warns `Local preset not found at ~/.lux/preset/fmt/<name>/`.

**Cause:** The local preset was never materialized. `--reset` only deletes local copies; it cannot create them.

**Fix:** Run `lux init --preset` first to materialize all built-in presets, then use `--reset`.

## lux vscode

### "No files generated" warning

**Symptom:** `lux vscode <name>` completes but generates nothing.

**Cause:** All target files already exist and `--force` was not passed.

**Fix:** Use `lux vscode <name> --force` to overwrite existing `.vscode/settings.json` and `.vscode/extensions.json`.

## lux vpn / set / unset

### "No proxy configured" warning

**Symptom:** `lux vpn cmd` shows no proxy message.

**Fix:** Configure proxy first:

```bash
lux set https_proxy="http://127.0.0.1:7890"
lux set http_proxy="http://127.0.0.1:7890"
```

### "Invalid key" error

**Symptom:** `lux set <key>=<value>` shows `Invalid key`.

**Allowed keys:** `https_proxy`, `http_proxy`, `all_proxy`, `lux_package_manager`.

### "Global config is X but detected Y lockfile" warning

**Symptom:** `lux fmt` warns about package manager mismatch.

**Cause:** `lux_package_manager` is set to a value (e.g., `pnpm`) but the project directory contains a different lockfile (e.g., `bun.lock`).

**Fix:** Either update the global config to match the project:

```bash
lux set lux_package_manager=bun    # match project's lockfile
```

Or revert to auto-detection:

```bash
lux set lux_package_manager=auto
```

## General

### Permission errors on Windows

**Symptom:** File write errors or `EPERM` errors during `lux fmt`.

**Fix:** Ensure no other process (VSCode, terminal) has the target files open. Close editors and retry.

### "package.json exists but is not valid JSON" error

**Symptom:** `lux fmt` (or `lux init --preset`) fails with JSON parse error.

**Cause:** The target project's `package.json` exists but contains invalid JSON.

**Fix:** Fix the JSON syntax in `package.json` first, then re-run the lux command.
