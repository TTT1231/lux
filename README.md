<div align="center">

# lux

**One-click project formatting & VSCode config CLI**

[![npm version](https://img.shields.io/npm/v/@luxkit/cli.svg)](https://www.npmjs.com/package/@luxkit/cli)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/license-ISC-purple.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg)](https://www.typescriptlang.org/)
[![ESM Only](https://img.shields.io/badge/ESM-only-F7DF1E.svg)](https://nodejs.org/api/esm.html)

**English** | [中文](./README_ZH.md)

</div>

---

### 📌 What is lux?

`lux` is a CLI tool built for modern development & the **AI era** — set up project lint configs and VSCode workspace settings with a single command.

- 🚀 **One-click setup**: ESLint, Prettier, CSpell, Stylelint, EditorConfig, and VSCode workspace — all in one command.
- 🤖 **AI Agent companion**: Skill support for Claude, Opencode and more. Use natural language (e.g. _"/lux configure a react lint template for my team"_) to let AI build and adjust presets for you.
- 📦 **Framework presets**: Built-in presets for `web-vue`, `web-react`, `node`, and more.
- 🎨 **Highly customizable**: Extract and fine-tune built-in presets, or create **fully custom private presets** — balancing out-of-the-box usability with team customization needs.
- 🧠 **Safe project integration**: Smart conflict resolution and merge, auto-detects `bun`, `pnpm`, `npm`, `yarn` dependency trees.

<div align="center">
  <img src="https://github.com/TTT1231/lux/blob/main/demo.gif?raw=true" alt="lux demo" width="640" />
</div>

### ⚡Quick Start

```bash
# Install globally (pick your package manager)
npm install -g @luxkit/cli

# Initialize skill and preset
lux init && lux init --preset

# Initialize your project — lux requires a package.json to inject deps and scripts
# Use pnpm create vite, claude, or any method to create your project
# lux detects the package manager via lockfile (bun.lock / package-lock.json / pnpm-lock.yaml)
# Or use --no-install to skip dependency installation

# Lint config
lux fmt web-vue                # ESLint + Prettier
lux fmt web-vue --stylelint    # + Stylelint
lux fmt web-vue --editorconfig # + EditorConfig
lux fmt web-vue --cspell       # + CSpell
lux fmt web-vue --lint-staged  # + lint-staged (implies --husky)
lux fmt web-vue --husky        # + husky only (no lint-staged)

# VSCode config (optional, skip if already configured globally)
lux vscode web-vue             # Generate .vscode/settings.json + extensions.json

# List available presets
lux fmt list
lux vscode list

# Next Steps:
# 🎨 Customize built-in fmt lint presets, e.g. web-vue (Optional)
# 🧩 Create your own custom presets, e.g. fmt <your-lint-preset-name> (Optional)
```

<br />

### 🎨Customize Built-in Presets

> Prerequisite: `lux init && lux init --preset` completed (see Quick Start)

```bash
# Use an AI agent to customize (recommended)
# In Claude or other AI agents, just run:
/lux configure built-in preset web-react template to fit my development project style

# Or manually edit files under ~/.lux/preset/
# e.g. add a cspell script to web-react:
# add "cspell":"cspell \"src/**/*\"" to ~/.lux/preset/fmt/web-react/package.json scripts
```

### 🧩Fully Custom Presets

> Prerequisite: `lux init && lux init --preset` completed (see Quick Start)

```bash
# Use an AI agent to create a custom preset (recommended)
# In Claude or other AI agents, just run:
/lux configure my formatting template <your-custom-fmt-preset-name> to fit my development project style

# Verify the preset is registered
lux fmt list
```

### 📖CLI Commands

| Command                     | Description                                                       |
| :-------------------------- | :---------------------------------------------------------------- |
| `lux fmt <preset>`          | Generate lint configs                                             |
| `lux fmt list`              | List available lint presets                                       |
| `lux vscode <preset>`       | Generate VSCode config (per-project)                              |
| `lux vscode list`           | List available VSCode presets                                     |
| `lux init`                  | Initialize Skill files to AI Agent                                |
| `lux init --preset`         | Initialize all built-in presets to `~/.lux/preset/`               |
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

  --force         Overwrite existing files and scripts
  --no-install    Write deps to package.json but skip install
  --dry-run       Preview mode, write nothing
  --stylelint     Include Stylelint config (opt-in)
  --editorconfig  Include EditorConfig config (opt-in)
  --husky        Initialize husky for Git hooks (opt-in)
  --lint-staged   Set up lint-staged (implies --husky, opt-in)
  --cspell        Include CSpell config (opt-in)
  --reset         Reset local preset and re-create from built-in defaults

lux vscode <preset> [options]

  --force         Overwrite existing VSCode config files
  --dry-run       Preview mode, write nothing
  --stylelint     Include Stylelint settings and extension (opt-in)
  --reset         Reset local preset and re-create from built-in defaults
```

<br />

### 🔧How It Works

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
  --stylelint / --editorconfig / --cspell / --husky / --lint-staged filtering (warns if custom preset lacks matching config)
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
  Install devDependencies (detects lockfile for package manager)
```

<br />

### 🔄Reset & Uninstall

#### Reset presets

```bash
# Reset built-in presets (delete local copy and re-generate from built-in template)
lux fmt web-vue --reset
lux vscode web-vue --reset

# Re-initialize all built-in presets (overwrite existing local copies)
lux init --preset

# Reset custom presets: manually delete the directory
# rm -rf ~/.lux/preset/fmt/<your-custom-preset-name>
```

> Using `--reset` on a custom preset will warn and abort — there is no built-in source to restore.

#### Uninstall

```bash
# Uninstall CLI
npm uninstall -g @luxkit/cli

# Clean config directory (optional)
# rm -rf ~/.lux

# Clean skill files, claude/opencode
# rm -rf ~/.claude/skill/lux
# rm -rf ~/.opencode/skill/lux
```

### 🔍Troubleshooting

| Issue                          | Solution                                                                                                                                            |
| :----------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` errors          | Ensure a valid `package.json` exists in the project root                                                                                            |
| Preset not found               | Run `lux fmt list` to see all available presets — lux auto-suggests via fuzzy matching                                                              |
| Wrong package manager detected | Ensure the lockfile exists (`bun.lock` / `package-lock.json` / `pnpm-lock.yaml`)                                                                    |
| Skip dependency install        | Use `--no-install` to only write to `package.json`, install manually                                                                                |
| Preview before applying        | Use `--dry-run` to see all operations without writing                                                                                               |
| Flags have no effect           | Custom presets must include the corresponding config files and deps for `--stylelint`/`--cspell`/`--editorconfig`/`--husky`/`--lint-staged` to work |

<br />

### 🤝Contributing

Bug reports, feature suggestions, and code contributions are welcome!

- 🐛 **Issues**: [GitHub Issues](https://github.com/TTT1231/lux/issues)
- 🛠 **Pull Requests**: [GitHub Pull Requests](https://github.com/TTT1231/lux/pulls)
- ⭐️ **Star**: If lux helped you, please give us a [Star](https://github.com/TTT1231/lux)!

<br />

### 📄License

[ISC](https://opensource.org/licenses/ISC) — Free to use, modify, and distribute.

<br />

<p align="right"><a href="./README_Zh.md">切换到中文 →</a></p>
