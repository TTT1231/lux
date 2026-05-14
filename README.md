<div align="center">

# lux

**One-click project formatting & VSCode config CLI**

[![npm version](https://img.shields.io/npm/v/@luxkit/cli.svg)](https://www.npmjs.com/package/@luxkit/cli)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/license-ISC-purple.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg)](https://www.typescriptlang.org/)
[![ESM Only](https://img.shields.io/badge/ESM-only-F7DF1E.svg)](https://nodejs.org/api/esm.html)

**English** | [中文](./README_Zh.md)

</div>

---

### What is lux?

`lux` is a CLI tool that sets up project lint configs and VSCode workspace settings with a single command — saving you from repetitive configuration overhead and wasted tokens. It generates ESLint, Prettier, CSpell, Stylelint，EditorConfig configs and VSCode settings from presets — with smart merge and conflict resolution. Configurations can be customized to your needs.

<div align="center">
  <img src="https://github.com/TTT1231/lux/blob/main/demo.gif?raw=true" alt="lux demo" width="640" />
</div>

### Quick Start

```bash
# Install globally (pick your package manager)
npm install -g @luxkit/cli

# Initialize skill and preset
lux init && lux init --preset

# Lint usage
lux fmt web-vue                # Configure web-vue lint — ESLint, Prettier, CSpell
lux fmt web-vue --stylelint    # Also include Stylelint
lux fmt web-vue --editorconfig # Also include EditorConfig

# VSCode config (optional)
# If you've already configured globally, you can skip this
lux vscode web-vue       # Generate .vscode/settings.json + extensions.json (per-project)

# List available presets
lux fmt list
lux vscode list
```

<br />

### Custom Configuration

```bash
# Check if skill and presets are initialized (skip if already done)
lux init && lux init --preset

# Use an agent to customize a preset
/lux help me configure my web react lint template to fit my development project style
```

### CLI Commands

| Command                     | Description                                                       |
| :-------------------------- | :---------------------------------------------------------------- |
| `lux fmt <preset>`          | Initialize lint configs                                           |
| `lux fmt list`              | List available lint presets                                       |
| `lux vscode <preset>`       | Configure VSCode settings (per-project)                           |
| `lux vscode list`           | List available VSCode presets                                     |
| `lux init`                  | Initialize skills                                                 |
| `lux init --preset`         | Initialize all presets                                            |
| `lux set <key=value> [...]` | Persist proxy env vars (e.g. `https_proxy=http://127.0.0.1:7890`) |
| `lux unset`                 | Clear all stored proxy configuration                              |
| `lux show env`              | Display stored proxy environment variables                        |
| `lux vpn cmd`               | Copy CMD proxy commands to clipboard                              |
| `lux vpn pw`                | Copy PowerShell proxy commands to clipboard                       |
| `lux vpn bash`              | Copy Bash proxy commands to clipboard                             |
| `lux update`                | Update `@luxkit/cli` to the latest version                        |
| `lux update --check`        | Check for available updates without installing                    |

<br />

### Options

```bash
lux fmt <preset> [options]

  --force         Force overwrite existing files
  --no-install    Skip dependency installation
  --dry-run       Preview without writing files
  --stylelint     Include Stylelint config generation (opt-in)
  --editorconfig  Include EditorConfig config generation (opt-in)
  --reset         Reset local preset and re-create from built-in defaults
```

<br />

### How It Works

```
lux fmt web-vue
       │
       ▼
  Parse CLI args ──► Resolve preset (fuzzy match on typo)
       │
       ▼
  Local preset exists in ~/.lux/preset/?
       │
       ├── Yes ──► Copy files from local preset (editable, survives updates)
       └── No  ──► Generate from built-in ──► Save to ~/.lux/preset/ for reuse
       │
       ▼
  For each config file:
       │
       ├── File not found? ──► Create
       ├── In neverOverwrite? ──► Skip
       ├── In forceOverwrite? ──► Overwrite
       └── Exists + --force? ──► Overwrite / Skip
       │
       ▼
  Inject scripts into package.json (<pm> → bun run / pnpm run / ...)
       │
       ▼
  Auto-install devDependencies (detects lockfile)
```

<br />

### 🤝 Support

If you have any questions or run into issues, feel free to [open an issue](https://github.com/TTT1231/lux/issues) on GitHub.

<br />

### 📄 License

[ISC](https://opensource.org/licenses/ISC) — Free to use, modify, and distribute.

<br />

<p align="right"><a href="./README_Zh.md">切换到中文 →</a></p>
