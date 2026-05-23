# Changelog

## 1.1.52

- `lux fmt` now detects existing flat config siblings (e.g. `eslint.config.js` when generating `eslint.config.mjs`) and skips generation with a warning instead of creating duplicate config files
- Same sibling detection applies to `stylelint.config.*` when using `--stylelint`
- Use `--force` to override sibling detection and generate the config file anyway
- `--dry-run --reset` no longer deletes the local preset directory — dry-run is now a true preview only
- Invalid `package.json` now returns exit code 1 (previously exited 0), fixing CI/CD pipelines that rely on exit codes
- Non-object `scripts` field (string, array, null) no longer crashes — warns and treats as empty
- `--force` now controls `.husky/pre-commit` overwrite: without it, existing hooks are skipped; with it, they are overwritten
- Dep versions pinned in `deps.json` (e.g. `typescript: "^5.5.0"`) are now preserved when writing to `package.json` instead of being refetched from registry
- `--force` suggestion shown when all files are skipped on repeat runs
- Dry-run output now distinguishes "Would create" vs "Would overwrite" instead of a single "Would create" for both
- `--husky` warns when preset has no husky dependencies; `--stylelint`/`--cspell`/`--editorconfig`/`--lint-staged` warn in builtin path when preset lacks the corresponding config
- Presets with `lintStagedFragments` (but not `lintStaged`) now correctly materialize `.lintstagedrc.json`
- `filterScripts` no longer false-positives on keys like `lint:css` or `spellcheck` — uses exact segment matching
- `detectPresetCapabilities` now checks `.lintstagedrc.json` file presence and reports `hasHusky`
- Per-file write errors in local preset apply no longer abort the entire operation — logs error and continues

## 1.1.51

- Added fallback TypeScript configs for `lux fmt`: web presets create `tsconfig.json`, `tsconfig.app.json`, and `tsconfig.node.json` only when the target project has no `tsconfig*.json`; existing user tsconfig files are preserved even with `--force`
- Husky setup no longer executes `prepare`/`postinstall` or depends on `node_modules/.bin/husky`; lux now creates `.husky/_` support files directly and writes the final `.husky/pre-commit` hook
- Improved missing `package.json` warnings for local and built-in fmt paths so skipped script injection, dependency manifest updates, and husky setup are visible
- Updated lux skill and README guidance to describe the direct husky bootstrap flow and avoid running `husky init` manually

## 1.1.50

- Husky and lint-staged are now preset-driven — defined per preset, materialized to local preset directory, and applied from preset definitions; `--husky` and `--lint-staged` flags enable them
- Lint scripts restructured: the consolidated `lint` script is replaced with separate `eslint`, `cspell`, and `type:check` scripts; legacy combined scripts (`code:check`, `code:check:all`, `code:fix`, `code:fix:all`, `format:check`) are removed
- Custom presets support `__LOCKFILE__` placeholder in config files — automatically replaced with the project's lockfile name at generation time
- `lux init --preset` no longer overwrites existing custom presets
- `lux vpn` clipboard operations now work on macOS and Linux
- ESLint flat config ignores patterns now correctly handle lockfile paths
- Husky setup is skipped when not in a git repository
- Pre-commit hook now includes shebang for Windows compatibility
- TypeScript dependencies are now included in all format presets
- Self-update version resolution is faster (uses HTTP fetch instead of npm view)

## 1.1.46

- Fixed `lux init` listing all files in target directory instead of only copied skills
- Simplified init output to a concise success message
- Added troubleshooting reference to lux skill for common error diagnosis

## 1.1.45

- Added global package manager override: `lux set lux_package_manager=pnpm` forces a specific package manager across all projects
- Supports `auto`, `bun`, `pnpm`, `yarn`, `npm` values — `auto` (default) uses lockfile detection as before
- Warns when global config conflicts with a project's existing lockfile

## 1.1.44

- Merged English and Chinese README into a single file with in-page anchor switching
- Removed standalone `README_ZH.md` — no longer need to maintain two separate documents

## 1.1.43

- Fixed language switcher links in README pointing to npm 404 — now uses GitHub absolute URLs

## 1.1.42

- Added `CHANGELOG.md` to published npm package

## 1.1.41

- Fixed Chinese README filename casing (`README_Zh.md` → `README_ZH.md`) in published npm package
- Improved pre-commit hook reliability and project documentation

## 1.1.4

- `lux fmt` now supports `--cspell` opt-in flag for CSpell config generation — consistent with existing `--stylelint` and `--editorconfig` opt-in pattern
- `lux fmt` now supports `--husky` and `--lint-staged` opt-in flags for Git hooks automation — `--lint-staged` implicitly enables `--husky`, supports all package managers with yarn-specific postinstall handling
- Added husky + lint-staged pre-commit hook to the project itself
- Fixed pre-commit hook missing force guard and Unix execute permission
- Fixed `.lintstagedrc` not recognized by CSpell dictionary

## 1.1.3

- `lux fmt` now supports custom presets — create a directory under `~/.lux/preset/fmt/<name>/` with config files and a `package.json`, then run `lux fmt <name>` to apply it
- `lux fmt list` now shows custom presets after built-in ones, marked with `(custom)` in yellow
- `--stylelint` and `--editorconfig` flags now filter entire script entries by key name (e.g. `stylelint:check`, `editorconfig:check`) in addition to stripping inline segments
- `lux fmt <name> --reset` now warns and aborts for custom presets (no builtin to restore)
- `lux fmt <custom-preset> --stylelint/--editorconfig` now warns when the flag has no effect (preset has no matching config or dependencies)
- Unknown preset names now fuzzy match against all available presets (builtin + custom combined)
- Fixed `lux fmt` and `lux vscode` returning exit code 0 on preset not found — now correctly returns 1 for CI/CD pipelines
- Fixed CSpell ignorePaths glob pattern in generated configs
- Fixed Chinese README link returning 404 on npm — `README_Zh.md` now included in published package
- update readme docs

## 1.1.2

- All preset scripts consolidated: `lint` now runs eslint + cspell + typecheck (+ stylelint) in one command — removed `code:check`, `code:fix`, `code:check:all`, `code:fix:all`, `format:check`, `cspell`, `type:check`, `stylelint`, `stylelint:fix` scripts
- Added `lux init --preset` to materialize all built-in presets to `~/.lux/preset/` without writing to project directory
- `--no-stylelint` now strips stylelint segments inline from `lint` and `lint:fix` scripts instead of removing separate script keys
- `--dry-run` now reports which dependencies would be added instead of silently skipping the install step
- Fixed `--no-install` resolving all template deps instead of only the missing ones
- CSpell configs in all presets now ignore `**/*.svg` and `**/*.png` files by default (recursive glob)
- Fixed Vue presets (web-vue, electron-vue, uniapp) ESLint flat config import compatibility with `@vue/eslint-config-prettier`

## 1.1.1

- Added `lux init` command — interactively select an AI coding tool (Claude Code / OpenCode) and copy bundled skill files to the project
- Generated presets are now saved to `~/.lux/preset/` for reuse — subsequent runs use the local copy instead of regenerating
- Added `--reset` flag to `fmt` and `vscode` commands to re-create local preset from built-in defaults
- Edit files in `~/.lux/preset/` to customize what gets applied on future runs
- `lux vscode` now merges extensions with existing `extensions.json` instead of overwriting — user-installed extensions are preserved
- Fixed `--force` not reporting overwritten files correctly for local presets

## 1.0.9

- **BREAKING**: `fmt` stylelint is now opt-in via `--stylelint` flag (previously included by default)
- **BREAKING**: `fmt` editorconfig is now opt-in via `--editorconfig` flag (previously included by default)
- Added `web-react` preset for `fmt` and `vscode` commands
- Dependencies are now written to `package.json` when using `--no-install` flag
- Fixed silent crashes on file write and JSON read errors
- ESLint lint and lint:fix scripts now use `--cache` with cache stored in `node_modules/.cache/.eslintcache`

## 1.0.8

- Fixed stylelint scripts and deps not being filtered when using `--no-stylelint` flag

## 1.0.7

- Renamed `web` preset to `web-vue` and `electron` preset to `electron-vue`
- Added `--no-stylelint` flag to `vscode` command

## 1.0.6

- Fixed quoted value format in vpn command's env config storage

## 1.0.5

- Added vpn proxy config persistent storage with `set`/`unset` sub-commands

## 1.0.4

- Fixed `demo.gif` URL in README

## 1.0.3

- Fixed npm package missing `demo.gif` in published files

## 1.0.2

- `lux fmt` and `lux vscode` no longer require `init` sub-command
- Added vpn bash command
- Simplified dependency install flow by removing version pinning

## 1.0.1

- Package renamed to `@luxkit/cli` — install with the new name
- Fixed README install commands

## 1.0.0

- Initial release: one-click project formatting and VSCode config CLI
- `lux fmt` — generate ESLint, Prettier, Stylelint, CSpell, EditorConfig configs with presets
- `lux vscode` — generate VSCode settings and recommended extensions
- `lux update` — self-update with npm/bun support
- `lux vpn` — proxy clipboard helper with `cmd`/`pw` sub-commands
