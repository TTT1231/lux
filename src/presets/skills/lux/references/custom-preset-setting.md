# Custom Preset Configuration

lux 预设存储在`~/.lux/preset/` (i.e. `os.homedir()/.lux/preset/`). Override with `LUX_HOME` env var。

```
~/.lux/preset/
├── fmt/                  # fmt presets (web-vue, web-react, electron-vue, uniapp, node, nest)
└── vscode/               # vscode presets (same + go)
```

> ⚠️ **Always use `lux init --preset` to initialize all built-in presets.**。

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

After init, edit files under `~/.lux/preset/<type>/<preset-name>/` to customize，例如`package.json`、`eslint.config.mjs`等等，也可以增加你自己的 lint 文件例如`your-file-lint-config`. Changes take effect on the next `lux fmt` / `lux vscode` run.

如果你自定义内置预设想重置的时候，可以重新执行`lux init --preset`去覆盖，或者使用`lux fmt <name> --reset` 、`lux vscode <name> --reset` (deletes local preset dir only; re-generated from built-in on next run).

## Customize your own presets

### fmt

Create a directory under `~/.lux/preset/fmt/<your-fmt-preset-name>/` with config files and a `package.json`:

```bash
# 1. Create the preset directory
mkdir -p ~/.lux/preset/fmt/[your-custom-fmt-preset-name]

# 2. Add config files (pick what you need)
#    Required: package.json (with devDependencies/dependencies and/or scripts)
#    Optional: eslint.config.mjs, .prettierrc, .prettierignore,
#              stylelint.config.mjs, .stylelintignore,
#              cspell.json, .editorconfig , etc....
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

Then 执行`lux fmt list`检查是否生效——这个`<your-fmt-preset-name>` 是否出现在其中。

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
- `lux fmt <name> --stylelint/--editorconfig` warns when the flag has no effect (preset has no matching config or dependencies)

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

`devDependencies` 和 `dependencies` 最新版本占位使用`<latest>`，特定版本除外。还有这个`scripts`如果不确定包管理器就用占位符`<pm>`让 lux 自动检测。

```jsonc
{
   "devDependencies": {
      // 最新版本
      "prettier": "<latest>",
      // 固定版本
      "cspell": "10.0.0",
   },
   "scripts": {
      "lint": "<pm> eslint .",
      "lint:fix": "<pm> eslint . --fix --cache --cache-location node_modules/.cache/.eslintcache",
      "cspell": "<pm> cspell \"**\"",
   },
}
```
