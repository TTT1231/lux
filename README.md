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

`lux` is a CLI tool that initializes project formatting configs and VSCode workspace settings with a single command. It generates ESLint, Prettier, Stylelint, CSpell, EditorConfig files and VSCode settings from battle-tested presets — with smart merge and conflict resolution.

<div align="center">
  <img src="demo.gif" alt="lux demo" width="640" />
</div>

### ✨ Key Highlights

| Feature                    | Description                                                                    |
| :------------------------- | :----------------------------------------------------------------------------- |
| 🎯 **One Command Setup**   | `lux fmt web` generates all linting & formatting configs instantly        |
| 🔧 **5 Fmt Presets**       | `web` · `electron` · `uniapp` · `node` · `nest` — each with curated rules      |
| 🖥️ **6 VSCode Presets**    | `web` · `electron` · `uniapp` · `node` · `nest` · `go` — settings + extensions |
| 🔀 **Smart Merge**         | Preset wins for linting keys; user wins for personal preferences               |
| 🛡️ **Conflict Resolution** | `neverOverwrite` / `forceOverwrite` lists + `--force` flag                     |
| 📦 **Auto Install**        | Detects bun / pnpm / yarn / npm and installs devDependencies                   |
| 🔍 **Fuzzy Matching**      | Typo a preset name? Levenshtein distance finds the closest match               |
| 🧪 **Dry Run**             | Preview all changes with `--dry-run` before writing anything                   |
| 🔗 **Script Injection**    | Auto-injects `<pm> lint` / `<pm> format` scripts into package.json             |

<br />

### Quick Start

```bash
# Install globally (pick your package manager)
npm install -g @luxkit/cli
# or
bun add -g @luxkit/cli

# Initialize formatting configs
lux fmt web          # Generate ESLint, Prettier, Stylelint, CSpell, EditorConfig

# Initialize VSCode settings
lux vscode web       # Generate .vscode/settings.json + extensions.json

# List available presets
lux fmt list
lux vscode list
```

<br />

### CLI Commands

| Command                    | Description                                 |
| :------------------------- | :------------------------------------------ |
| `lux fmt <preset>`    | Initialize formatting config files          |
| `lux fmt list`             | List available fmt presets                  |
| `lux vscode <preset>` | Initialize VSCode workspace settings        |
| `lux vscode list`          | List available VSCode presets               |
| `lux vpn cmd`              | Copy CMD proxy env-vars to clipboard        |
| `lux vpn pw`               | Copy PowerShell proxy env-vars to clipboard |

<br />

### Available Presets

| Preset     | Fmt | VSCode | Stack                        |
| :--------- | :-: | :----: | :--------------------------- |
| `web`      | ✅  |   ✅   | Vue / React / TS / CSS       |
| `electron` | ✅  |   ✅   | Electron + Web stack         |
| `uniapp`   | ✅  |   ✅   | UniApp / WeChat Mini Program |
| `node`     | ✅  |   ✅   | Node.js backend              |
| `nest`     | ✅  |   ✅   | NestJS backend               |
| `go`       |  —  |   ✅   | Go backend                   |

<br />

### Options

```bash
lux fmt <preset> [options]

  --force       Force overwrite existing files
  --no-install  Skip dependency installation
  --dry-run     Preview without writing files
```

<br />

### How It Works

```
lux fmt web
       │
       ▼
  Parse CLI args ──► Resolve preset (fuzzy match on typo)
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

### Tech Stack

| Category | Technology                                 |
| :------- | :----------------------------------------- |
| Language | TypeScript 6.0 (ESM-only)                  |
| Runtime  | Node.js 18+                                |
| Build    | tsup                                       |
| Test     | Vitest (unit + acceptance)                 |
| CLI      | Commander.js                               |
| Output   | Chalk                                      |
| Bundle   | Zero runtime deps (chalk + commander only) |

<br />

### Development

```bash
git clone git@github.com:TTT1231/lux.git
cd lux
bun install

bun link                  # Register `lux` globally for testing
lux fmt web          # Test it on any project

bun test                  # Run tests
bun build                 # Build to dist/
bun code:check:all        # lint + format + spell check
```

<br />

### 📄 License

[ISC](https://opensource.org/licenses/ISC) — Free to use, modify, and distribute.

<br />

<p align="right"><a href="./README_Zh.md">切换到中文 →</a></p>
