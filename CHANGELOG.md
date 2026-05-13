# Changelog

## 1.1.0

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
