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

### 📌 What is lux?

`lux` is a CLI tool for modern development & the **AI era** that sets up project lint configs and VSCode workspace settings with a single command.

- 🚀**One-click setup**: ESLint, Prettier, CSpell, Stylelint, EditorConfig, and VSCode workspace — all in one command.
- 🤖**AI Agent companion**: Built for Claude, Opencode and more! Use natural language (e.g. _"/lux configure a react lint template for my team"_) to let AI build and adjust custom presets for you.
- 📦**Framework presets**: Built-in presets for `web-vue`, `web-react`, `node`, and more.
- 🎨**Ultimate Freedom for Customization**: Tired of rigid one-size-fits-all encapsulated configurations? lux allows you to extract and fine-tune built-in presets, and also supports **fully custom private presets**. It perfectly balances out-of-the-box usability with the strong customization demands of team collaboration.
- 🧠**Safe project integration**: Smart conflict resolution and merge, auto-detects `bun`, `pnpm`, `npm`, `yarn` dependency trees.

<div align="center">
  <img src="https://github.com/TTT1231/lux/blob/main/demo.gif?raw=true" alt="lux demo" width="640" />
</div>

### ⚡Quick Start

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

# Next: customize your own lint preset (optional)
```

<br />

### 🎨Customize Built-in Presets

```bash
# Check if skill and presets are initialized (skip if already done)
lux init && lux init --preset

# Use an AI agent to customize a built-in preset (recommended)
# In an AI agent like Claude, just run:
/lux configure built-in preset web-react template to fit my development project style

# Or manually edit files under ~/.lux/preset/
# e.g. add a cspell script to web-react:
# "cspell":"cspell \"src/**/*\"" to ~/.lux/preset/fmt/web-react/package.json
```

### 🧩Fully Custom Presets

```bash
# Check if skill and presets are initialized (skip if already done)
lux init && lux init --preset

# Use an AI agent to create a fully custom preset (recommended)
# In an AI agent like Claude, just run:
/lux configure my formatting template <your-custom-fmt-preset-name> to fit my development project style

# Verify the preset is registered
lux fmt list
```

### 📖CLI Commands

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

### ⚙️Options

```bash
lux fmt <preset> [options]

  --force         Force overwrite existing files
  --no-install    Skip dependency installation
  --dry-run       Preview without writing files
  --stylelint     Include Stylelint config generation (opt-in)
  --editorconfig  Include EditorConfig config generation (opt-in)
  --reset         Reset local preset and re-create from built-in defaults

lux vscode <preset> [options]

  --force         Force overwrite existing files
  --dry-run       Preview without writing files
  --stylelint     Include Stylelint settings and extension (opt-in)
  --reset         Reset local preset and re-create from built-in defaults
```

<br />

###🔧 How It Works

```
lux fmt <preset> [options]
       │
       ▼
  Parse CLI args, validate project package.json
       │
       ▼
  Resolve preset type
       │
       ├── Built-in preset ──► --reset? ──► Reset local copy
       │              │
       │              ├── Local copy exists (~/.lux/preset/)? ──► Apply from local
       │              └── Not found ──► Generate from built-in ──► Save to ~/.lux/preset/ ──► Apply
       │
       ├── Custom preset (~/.lux/preset/fmt/<name>/) ──► Apply from local directory
       │
       └── Not found ──► Fuzzy match against all presets (built-in + custom), show error
       │
       ▼
  --stylelint / --editorconfig filtering (warns if custom preset lacks matching config)
       │
       ▼
  For each config file:
       │
       ├── File not found? ──► Create
       ├── Exists + --force? ──► Overwrite
       └── Exists? ──► Skip
       │
       ▼
  Inject scripts into package.json (auto-detect bun / pnpm / npm / yarn)
       │
       ▼
  Auto-install devDependencies (detects lockfile)
```

<br />

### 🤝 Support

Found a bug, have a feature idea, or want to improve the code? Contributions are welcome!

- **Report bugs or request features**: [Open an issue](https://github.com/TTT1231/lux/issues) on GitHub.
- **Submit code**: [Pull Requests](https://github.com/TTT1231/lux/pulls) are very welcome!
- **Star us**: If this tool saved you even 5 minutes of config time, please give us a [⭐️Star](https://github.com/TTT1231/lux)!

<br />

### 📄 License

[ISC](https://opensource.org/licenses/ISC) — Free to use, modify, and distribute.

<br />

<p align="right"><a href="./README_Zh.md">切换到中文 →</a></p>
