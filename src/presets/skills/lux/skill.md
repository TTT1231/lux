---
name: lux
description: Use when setting up ESLint, Prettier, CSpell, Stylelint, EditorConfig, VSCode workspace settings, proxy env
---

## fmt — generate lint/format configs

```bash
lux fmt <preset> [--stylelint] [--editorconfig]
lux fmt list
```

- `--force` — overwrite existing config files (default: skip)
- `--dry-run` — preview what would be generated, write nothing
- `--no-install` — write deps to package.json but skip install
- `--reset` — reset local preset, re-materialize from built-in defaults

`lux fmt list` Built-in presets first, custom presets last, marked with **custom**.

built-in presets: `web-vue` `web-react` `electron-vue` `uniapp` `node` `nest`

## vscode — generate editor settings

```bash
lux vscode <preset> [--dry-run] [--stylelint]
lux vscode list
```

- `--force` — overwrite existing settings (default: skip)
- `--dry-run` — preview what would be generated, write nothing
- `--stylelint` — Include Stylelint settings and extension
- `--reset` — reset local preset, re-materialize from built-in defaults

built-in presets: `web-vue` `web-react` `electron-vue` `uniapp` `node` `nest` `go`

## init — initialize skills or presets

```bash
lux init                  # interactively select AI tool, copy skill files to AI Agent
lux init --preset         # materialize all built-in presets to ~/.lux/preset/ (no cwd writes, no package.json required)
```

## vpn — proxy clipboard helper

```bash
lux vpn cmd       # copy CMD proxy commands
lux vpn pw        # copy PowerShell proxy commands
lux vpn bash      # copy Bash proxy commands
```

## env — proxy env management

```bash
lux set https_proxy=http://127.0.0.1:7890
lux unset         # clear all proxy config
lux show env      # show stored proxy env
```

## update — self-update

```bash
lux update        # update to latest
lux update --check
```

## Custom presets

To customize preset rules, see `references/custom-preset-setting.md`.
