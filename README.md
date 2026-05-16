<div align="center">

# lux

**One-click project formatting & VSCode config CLI**

[![npm version](https://img.shields.io/npm/v/@luxkit/cli.svg)](https://www.npmjs.com/package/@luxkit/cli)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/license-ISC-purple.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg)](https://www.typescriptlang.org/)
[![ESM Only](https://img.shields.io/badge/ESM-only-F7DF1E.svg)](https://nodejs.org/api/esm.html)

**English** | [中文](#中文)

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

| Command                     | Description                                                                        |
| :-------------------------- | :--------------------------------------------------------------------------------- |
| `lux fmt <preset>`          | Generate lint configs                                                              |
| `lux fmt list`              | List available lint presets                                                        |
| `lux vscode <preset>`       | Generate VSCode config (per-project)                                               |
| `lux vscode list`           | List available VSCode presets                                                      |
| `lux init`                  | Initialize Skill files to AI Agent                                                 |
| `lux init --preset`         | Initialize all built-in presets to `~/.lux/preset/`                                |
| `lux set <key=value> [...]` | Set config values (proxy, global lux package management`lux_package_manager=pnpm`) |
| `lux unset`                 | Clear all stored configuration                                                     |
| `lux show env`              | Display stored configuration                                                       |
| `lux vpn cmd`               | Copy CMD proxy commands to clipboard                                               |
| `lux vpn pw`                | Copy PowerShell proxy commands to clipboard                                        |
| `lux vpn bash`              | Copy Bash proxy commands to clipboard                                              |
| `lux update`                | Update `@luxkit/cli` to the latest version                                         |
| `lux update --check`        | Check for available updates without installing                                     |

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
| Wrong package manager detected | Ensure the lockfile exists (`bun.lock` / `package-lock.json` / `pnpm-lock.yaml`), or set globally: `lux set lux_package_manager=pnpm`               |
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

<p align="right"><a href="#中文">切换到中文 →</a></p>

---

<br />

## 中文

<div align="center">

**一键项目格式化 & VSCode 配置 CLI**

[![npm version](https://img.shields.io/npm/v/@luxkit/cli.svg)](https://www.npmjs.com/package/@luxkit/cli)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/license-ISC-purple.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg)](https://www.typescriptlang.org/)
[![ESM Only](https://img.shields.io/badge/ESM-only-F7DF1E.svg)](https://nodejs.org/api/esm.html)

[English](#lux) | **中文**

</div>

---

### 📌 为什么选择 lux？

`lux` 是一款专为现代化开发与 **AI 时代** 打造的工程化配置 CLI 工具，一条命令完成项目代码规范配置。

- 🚀 **一键配置**：ESLint、Prettier、CSpell、Stylelint、EditorConfig 及 VSCode 工作区配置，一条命令搞定。
- 🤖 **AI Agent 拍档**：为 Claude、Opencode 等提供技能（Skill）支持，可直接用自然语言（如*"/lux 帮我配一套适合团队的 react 代码规范"*）让 AI 自动构建和调整预设。
- 📦 **框架预设开箱即用**：内置 `web-vue`、`web-react`、`node` 等场景预设。
- 🎨 **高度可定制**：支持提取和微调内置预设，也支持**完全自定义私有预设**，兼顾开箱即用与团队定制化需求。
- 🧠 **安全接入已有项目**：智能冲突解决与合并机制，自动检测 `bun`、`pnpm`、`npm`、`yarn` 依赖树。

<div align="center">
  <img src="https://github.com/TTT1231/lux/blob/main/demo.gif?raw=true" alt="lux 演示" width="640" />
</div>

## ⚡快速开始

```bash
# 全局安装（选择你的包管理器）
npm install -g @luxkit/cli

# 初始化 skill 和 preset
lux init && lux init --preset

# 初始化你的项目 — lux 需要项目中有 package.json 来注入依赖和脚本
# 可使用 pnpm create vite、claude 等方式创建项目
# lux 通过锁文件检测包管理器（bun.lock / package-lock.json / pnpm-lock.yaml）
# 也可使用 --no-install 跳过依赖安装

# Lint 配置
lux fmt web-vue                # 配置 ESLint + Prettier
lux fmt web-vue --stylelint    # + Stylelint
lux fmt web-vue --editorconfig # + EditorConfig
lux fmt web-vue --cspell       # + CSpell
lux fmt web-vue --lint-staged  # + lint-staged（自动启用 --husky）
lux fmt web-vue --husky        # + 仅 husky（不包含 lint-staged）

# VSCode 配置（可选，全局已配置可跳过）
lux vscode web-vue             # 生成 .vscode/settings.json + extensions.json

# 查看可用预设
lux fmt list
lux vscode list

# 下一步：
# 🎨 自定义内置fmt lint预设，例如web-vue（可选）
# 🧩 自定义你自己的预设，例如fmt <your-lint-preset-name>（可选）
```

<br />

## 🎨 自定义内置预设

> 前置条件：已完成 `lux init && lux init --preset`（见快速开始）

```bash
# 使用 AI Agent 自定义（推荐）
# 在 Claude 等 AI Agent 中直接执行：
/lux 配置内置预设 web-react 模板，符合我的开发项目风格

# 也可手动编辑 ~/.lux/preset/ 下的预设文件
# 例如给 web-react 添加 cspell 脚本：
# 在 ~/.lux/preset/fmt/web-react/package.json 的 scripts 中添加 "cspell":"cspell \"src/**/*\""
```

## 🧩 完全自定义预设

> 前置条件：已完成 `lux init && lux init --preset`（见快速开始）

```bash
# 使用 AI Agent 创建自定义预设（推荐）
# 在 Claude 等 AI Agent 中直接执行：
/lux 配置我的格式化模板 <your-custom-fmt-preset-name>，符合我的开发项目风格

# 验证预设是否注册成功
lux fmt list
```

## 📖命令参考

| 命令                        | 说明                                                        |
| :-------------------------- | :---------------------------------------------------------- |
| `lux fmt <preset>`          | 生成 Lint 配置                                              |
| `lux fmt list`              | 列出可用的 Lint 预设                                        |
| `lux vscode <preset>`       | 生成 VSCode 配置（项目内）                                  |
| `lux vscode list`           | 列出可用的 VSCode 预设                                      |
| `lux init`                  | 初始化 Skill 文件到 AI Agent                                |
| `lux init --preset`         | 初始化所有内置预设到 `~/.lux/preset/`                       |
| `lux set <key=value> [...]` | 设置配置值（代理、全局lux包管理`lux_package_manager=pnpm`） |
| `lux unset`                 | 清除所有已存储的配置                                        |
| `lux show env`              | 显示已存储的配置                                            |
| `lux vpn cmd`               | 复制 CMD 代理命令到剪贴板                                   |
| `lux vpn pw`                | 复制 PowerShell 代理命令到剪贴板                            |
| `lux vpn bash`              | 复制 Bash 代理命令到剪贴板                                  |
| `lux update`                | 更新 `@luxkit/cli` 到最新版本                               |
| `lux update --check`        | 检查可用更新，不执行安装                                    |

<br />

### ⚙️命令选项

```bash
lux fmt <preset> [options]

  --force         覆盖已有文件和脚本
  --no-install    写入依赖到 package.json 但跳过安装
  --dry-run       预览模式，不写入任何文件
  --stylelint     包含 Stylelint 配置（按需启用）
  --editorconfig  包含 EditorConfig 配置（按需启用）
  --husky        初始化 husky Git hooks（按需启用）
  --lint-staged   配置 lint-staged（自动启用 --husky，按需启用）
  --cspell        包含 CSpell 配置（按需启用）
  --reset         重置本地预设，从内置默认值重新创建

lux vscode <preset> [options]

  --force         覆盖已有的 VSCode 配置文件
  --dry-run       预览模式，不写入任何文件
  --stylelint     包含 Stylelint 设置和扩展（按需启用）
  --reset         重置本地预设，从内置默认值重新创建
```

<br />

## 🔧工作原理

```
lux fmt <preset> [options]
       │
       ▼
  解析 CLI 参数，校验项目 package.json
       │
       ▼
  预设类型判断
       │
       ├── 内置预设 ──► --reset？ ──► 重置本地副本
       │              │
       │              ├── 本地副本存在 (~/.lux/preset/)？ ──► 从本地副本应用
       │              └── 不存在 ──► 从内置生成 ──► 保存到 ~/.lux/preset/ ──► 应用
       │
       ├── 自定义预设 (~/.lux/preset/fmt/<name>/) ──► 直接从本地目录应用
       │
       └── 未找到 ──► 模糊匹配所有可用预设（内置 + 自定义）并报错
       │
       ▼
  --stylelint / --editorconfig / --cspell / --husky / --lint-staged 过滤（自定义预设无对应配置时 warning）
       │
       ▼
  遍历每个配置文件：
       │
       ├── 文件不存在？ ──► 创建
       ├── 已存在 + --force？ ──► 覆盖
       └── 已存在？ ──► 跳过
       │
       ▼
  注入脚本到 package.json（自动检测 bun / pnpm / npm / yarn）
       │
       ▼
  安装 devDependencies（检测 lockfile 判断包管理器）
```

<br />

## 🔄重置与卸载

### 重置预设

```bash
# 重置内置预设（删除本地副本并从内置模板重新生成）
lux fmt web-vue --reset
lux vscode web-vue --reset

# 重新初始化所有内置预设（覆盖已有本地副本）
lux init --preset

# 重置自定义预设：手动删除对应目录
# rm -rf ~/.lux/preset/fmt/<your-custom-preset-name>
```

> 自定义预设使用 `--reset` 会提示警告并中止，因为不存在内置源可供恢复。

### 卸载

```bash
# 卸载 CLI
npm uninstall -g @luxkit/cli

# 清理配置目录（可选）
# rm -rf ~/.lux

# 清理skill，claude/opencode
# rm -rf ~/.claude/skill/lux
# rm -rf ~/.opencode/skill/lux
```

## 🔍故障排查

| 问题                    | 解决方案                                                                                                                  |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| `package.json` 相关错误 | 确保项目根目录存在合法的 `package.json`                                                                                   |
| 预设未找到              | 运行 `lux fmt list` 查看所有可用预设，lux 会自动模糊匹配建议                                                              |
| 包管理器检测不正确      | 确保 lockfile 存在（`bun.lock` / `package-lock.json` / `pnpm-lock.yaml`），或全局指定：`lux set lux_package_manager=pnpm` |
| 跳过依赖安装            | 使用 `--no-install` 仅写入 `package.json`，手动安装                                                                       |
| 预览操作结果            | 使用 `--dry-run` 查看将执行的所有操作                                                                                     |
| flag 无效果             | 自定义预设需包含对应的配置文件和依赖，`--stylelint`/`--cspell`/`--editorconfig`/`--husky`/`--lint-staged` 才能生效        |

<br />

## 🤝 参与贡献

欢迎提交 Bug、功能建议或代码贡献！

- 🐛 **提交 Issue**：[GitHub Issues](https://github.com/TTT1231/lux/issues)
- 🛠 **提交 PR**：[GitHub Pull Requests](https://github.com/TTT1231/lux/pulls)
- ⭐️ **Star 支持**：如果 lux 对你有帮助，欢迎 [Star](https://github.com/TTT1231/lux)！

<br />

## 📄 许可证

[ISC](https://opensource.org/licenses/ISC) — 可自由使用、修改和分发。

<p align="right"><a href="#lux">← Switch to English</a></p>
