<div align="center">

# lux

**One-click project formatting & VSCode config CLI**

[![npm version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/TTT1231/lux)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/license-ISC-purple.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg)](https://www.typescriptlang.org/)
[![ESM Only](https://img.shields.io/badge/ESM-only-F7DF1E.svg)](https://nodejs.org/api/esm.html)

<br />

<a href="#-english">English</a> | <a href="#-中文">中文</a>

</div>

---

<br />

## 🇬🇧 English

<br />

### What is lux?

`lux` is a CLI tool that initializes project formatting configs and VSCode workspace settings with a single command. It generates ESLint, Prettier, Stylelint, CSpell, EditorConfig files and VSCode settings from battle-tested presets — with smart merge and conflict resolution.

<br />

### ✨ Key Highlights

| Feature | Description |
|:--------|:------------|
| 🎯 **One Command Setup** | `lux fmt init web` generates all linting & formatting configs instantly |
| 🔧 **5 Fmt Presets** | `web` · `electron` · `uniapp` · `node` · `nest` — each with curated rules |
| 🖥️ **6 VSCode Presets** | `web` · `electron` · `uniapp` · `node` · `nest` · `go` — settings + extensions |
| 🔀 **Smart Merge** | Preset wins for linting keys; user wins for personal preferences |
| 🛡️ **Conflict Resolution** | `neverOverwrite` / `forceOverwrite` lists + `--force` flag |
| 📦 **Auto Install** | Detects bun / pnpm / yarn / npm and installs devDependencies |
| 🔍 **Fuzzy Matching** | Typo a preset name? Levenshtein distance finds the closest match |
| 🧪 **Dry Run** | Preview all changes with `--dry-run` before writing anything |
| 🔗 **Script Injection** | Auto-injects `<pm> lint` / `<pm> format` scripts into package.json |

<br />

### Quick Start

```bash
# Install globally (pick your package manager)
npm install -g lux
# or
bun add -g lux

# Initialize formatting configs
lux fmt init web          # Generate ESLint, Prettier, Stylelint, CSpell, EditorConfig

# Initialize VSCode settings
lux vscode init web       # Generate .vscode/settings.json + extensions.json

# List available presets
lux fmt list
lux vscode list
```

<br />

### CLI Commands

| Command | Description |
|:--------|:------------|
| `lux fmt init <preset>` | Initialize formatting config files |
| `lux fmt list` | List available fmt presets |
| `lux vscode init <preset>` | Initialize VSCode workspace settings |
| `lux vscode list` | List available VSCode presets |
| `lux vpn cmd` | Copy CMD proxy env-vars to clipboard |
| `lux vpn pw` | Copy PowerShell proxy env-vars to clipboard |

<br />

### Available Presets

| Preset | Fmt | VSCode | Stack |
|:-------|:---:|:------:|:------|
| `web` | ✅ | ✅ | Vue / React / TS / CSS |
| `electron` | ✅ | ✅ | Electron + Web stack |
| `uniapp` | ✅ | ✅ | UniApp / WeChat Mini Program |
| `node` | ✅ | ✅ | Node.js backend |
| `nest` | ✅ | ✅ | NestJS backend |
| `go` | — | ✅ | Go backend |

<br />

### Options

```bash
lux fmt init <preset> [options]

  --force       Force overwrite existing files
  --no-install  Skip dependency installation
  --dry-run     Preview without writing files
```

<br />

### How It Works

```
lux fmt init web
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

| Category | Technology |
|:---------|:-----------|
| Language | TypeScript 6.0 (ESM-only) |
| Runtime | Node.js 18+ |
| Build | tsup |
| Test | Vitest (unit + acceptance) |
| CLI | Commander.js |
| Output | Chalk |
| Bundle | Zero runtime deps (chalk + commander only) |

<br />

### Development

```bash
git clone git@github.com:TTT1231/lux.git
cd lux
bun install

bun link                  # Register `lux` globally for testing
lux fmt init web          # Test it on any project

bun test                  # Run tests
bun build                 # Build to dist/
bun code:check:all        # lint + format + spell check
```

<br />

### 📄 License

[ISC](https://opensource.org/licenses/ISC) — Free to use, modify, and distribute.

<br />

<p align="right"><a href="#-中文">切换到中文 →</a></p>

---

<br />

## 🇨🇳 中文

<br />

### lux 是什么？

`lux` 是一个 CLI 工具，只需一条命令即可初始化项目格式化配置和 VSCode 工作区设置。它从经过实战检验的预设中生成 ESLint、Prettier、Stylelint、CSpell、EditorConfig 配置文件以及 VSCode 设置 —— 并带有智能合并和冲突解决机制。

<br />

### ✨ 核心亮点

| 特性 | 说明 |
|:-----|:-----|
| 🎯 **一键配置** | `lux fmt init web` 即可生成所有 lint 与格式化配置 |
| 🔧 **5 种格式化预设** | `web` · `electron` · `uniapp` · `node` · `nest` — 各配备精选规则 |
| 🖥️ **6 种 VSCode 预设** | `web` · `electron` · `uniapp` · `node` · `nest` · `go` — 设置 + 扩展推荐 |
| 🔀 **智能合并** | 预设优先覆盖 linting 相关键；用户配置优先保留个人偏好 |
| 🛡️ **冲突解决** | `neverOverwrite` / `forceOverwrite` 列表 + `--force` 标志 |
| 📦 **自动安装** | 自动检测 bun / pnpm / yarn / npm 并安装 devDependencies |
| 🔍 **模糊匹配** | 预设名拼错了？Levenshtein 距离帮你找到最接近的匹配 |
| 🧪 **Dry Run** | 使用 `--dry-run` 预览所有变更，不写入任何文件 |
| 🔗 **脚本注入** | 自动将 `<pm> lint` / `<pm> format` 脚本注入 package.json |

<br />

### 快速开始

```bash
# 全局安装（选择你的包管理器）
npm install -g lux
# 或
bun add -g lux

# 初始化格式化配置
lux fmt init web          # 生成 ESLint、Prettier、Stylelint、CSpell、EditorConfig

# 初始化 VSCode 设置
lux vscode init web       # 生成 .vscode/settings.json + extensions.json

# 查看可用预设
lux fmt list
lux vscode list
```

<br />

### CLI 命令

| 命令 | 说明 |
|:-----|:-----|
| `lux fmt init <preset>` | 初始化格式化配置文件 |
| `lux fmt list` | 列出可用的格式化预设 |
| `lux vscode init <preset>` | 初始化 VSCode 工作区设置 |
| `lux vscode list` | 列出可用的 VSCode 预设 |
| `lux vpn cmd` | 复制 CMD 代理环境变量到剪贴板 |
| `lux vpn pw` | 复制 PowerShell 代理环境变量到剪贴板 |

<br />

### 可用预设

| 预设 | 格式化 | VSCode | 技术栈 |
|:-----|:------:|:------:|:-------|
| `web` | ✅ | ✅ | Vue / React / TS / CSS |
| `electron` | ✅ | ✅ | Electron + Web 技术栈 |
| `uniapp` | ✅ | ✅ | UniApp / 微信小程序 |
| `node` | ✅ | ✅ | Node.js 后端 |
| `nest` | ✅ | ✅ | NestJS 后端 |
| `go` | — | ✅ | Go 后端 |

<br />

### 命令选项

```bash
lux fmt init <preset> [options]

  --force       强制覆盖已有文件
  --no-install  跳过依赖安装
  --dry-run     预览模式，不写入文件
```

<br />

### 工作原理

```
lux fmt init web
       │
       ▼
  解析 CLI 参数 ──► 解析预设（拼写错误时自动模糊匹配）
       │
       ▼
  遍历每个配置文件：
       │
       ├── 文件不存在？ ──► 创建
       ├── 在 neverOverwrite 中？ ──► 跳过
       ├── 在 forceOverwrite 中？ ──► 覆盖
       └── 已存在 + --force？ ──► 覆盖 / 跳过
       │
       ▼
  注入脚本到 package.json（<pm> → bun run / pnpm run / ...）
       │
       ▼
  自动安装 devDependencies（检测 lockfile 判断包管理器）
```

<br />

### 技术栈

| 分类 | 技术 |
|:-----|:-----|
| 语言 | TypeScript 6.0（纯 ESM） |
| 运行时 | Node.js 18+ |
| 构建 | tsup |
| 测试 | Vitest（单元测试 + 验收测试） |
| CLI | Commander.js |
| 输出 | Chalk |
| 依赖 | 零运行时依赖（仅 chalk + commander） |

<br />

### 开发

```bash
git clone git@github.com:TTT1231/lux.git
cd lux
bun install

bun link                  # 全局注册 `lux` 用于测试
lux fmt init web          # 在任意项目上测试

bun test                  # 运行测试
bun build                 # 构建到 dist/
bun code:check:all        # lint + 格式化 + 拼写检查
```

<br />

### 📄 许可证

[ISC](https://opensource.org/licenses/ISC) — 可自由使用、修改和分发。

<br />

<p align="right"><a href="#-english">← Switch to English</a></p>
