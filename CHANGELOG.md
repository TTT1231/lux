# Changelog

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
