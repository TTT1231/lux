# Custom Preset Configuration

> ⚠️ **Always use `lux init --preset` to initialize presets.** Running `lux fmt` / `lux vscode` directly generates config files in cwd and requires `package.json` — only use in real project directories.

## Quick Start

```bash
lux init --preset                # materialize all built-in presets to ~/.lux/preset/
```

After materialization, edit files under `~/.lux/preset/<type>/<preset-name>/` to customize. Changes take effect on the next `lux fmt` / `lux vscode` run.

`lux init --preset` can be run repeatedly — each run overwrites with built-in defaults. To reset a single preset, use `lux fmt <name> --reset` or `lux vscode <name> --reset` (deletes local preset dir only; re-generated from built-in on next run).

## Storage Location

`~/.lux/preset/` (i.e. `os.homedir()/.lux/preset/`). Override with `LUX_HOME` env var.

```
~/.lux/preset/
├── fmt/                  # fmt presets (web-vue, web-react, electron-vue, uniapp, node, nest)
└── vscode/               # vscode presets (same + go)
```

## File Reference

### fmt preset

| File                   | Description                                    |
| :--------------------- | :--------------------------------------------- |
| `eslint.config.mjs`    | ESLint flat config                             |
| `.prettierrc`          | Prettier JSON config                           |
| `.prettierignore`      | Prettier ignore rules                          |
| `stylelint.config.mjs` | Stylelint config                               |
| `.stylelintignore`     | Stylelint ignore rules                         |
| `cspell.json`          | CSpell dictionary config                       |
| `.editorconfig`        | EditorConfig config                            |
| `package.json`         | Template with `devDependencies` and `scripts`  |

### vscode preset

| File              | Description                 |
| :---------------- | :-------------------------- |
| `settings.json`   | VSCode workspace settings   |
| `extensions.json` | VSCode extension recommendations |

## Template Placeholders (fmt preset)

| Placeholder | Replaced with |
| :---------- | :------------ |
| `<pm>`      | Package manager prefix (`bun run` / `pnpm run` / `npm run`) |
| `<lockfile>` | Project lockfile name (`bun.lock` / `pnpm-lock.yaml` etc.) |
| `"<latest>"` | Resolved to latest version at install time, or pin like `"3.3.0"` |

## Workflow

```
lux init --preset
  → materialize all built-in presets to ~/.lux/preset/ (no cwd writes)

lux fmt web-vue (in target project)
  → local preset exists → use local version (with custom edits)
  → local preset missing → generate from built-in + materialize (also writes to cwd)

lux vscode web-vue (in target project)
  → same as above
```
