<div align="center">

# lux

**一键项目格式化 & VSCode 配置 CLI**

[![npm version](https://img.shields.io/npm/v/@luxkit/cli.svg)](https://www.npmjs.com/package/@luxkit/cli)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/license-ISC-purple.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg)](https://www.typescriptlang.org/)
[![ESM Only](https://img.shields.io/badge/ESM-only-F7DF1E.svg)](https://nodejs.org/api/esm.html)

[English](./README.md) | **中文**

</div>

---

### lux 是什么？

`lux` 是一个 CLI 工具，只需一条命令即可初始化项目格式化配置和 VSCode 工作区设置。它从经过实战检验的预设中生成 ESLint、Prettier、Stylelint、CSpell、EditorConfig 配置文件以及 VSCode 设置 —— 并带有智能合并和冲突解决机制。

<div align="center">
  <img src="https://github.com/TTT1231/lux/blob/main/demo.gif?raw=true" alt="lux 演示" width="640" />
</div>

### ✨ 核心亮点

| 特性                    | 说明                                                                     |
| :---------------------- | :----------------------------------------------------------------------- |
| 🎯 **一键配置**         | `lux fmt web` 即可生成所有 lint 与格式化配置                        |
| 🔧 **5 种格式化预设**   | `web` · `electron` · `uniapp` · `node` · `nest` — 各配备精选规则         |
| 🖥️ **6 种 VSCode 预设** | `web` · `electron` · `uniapp` · `node` · `nest` · `go` — 设置 + 扩展推荐 |
| 🔀 **智能合并**         | 预设优先覆盖 linting 相关键；用户配置优先保留个人偏好                    |
| 🛡️ **冲突解决**         | `neverOverwrite` / `forceOverwrite` 列表 + `--force` 标志                |
| 📦 **自动安装**         | 自动检测 bun / pnpm / yarn / npm 并安装 devDependencies                  |
| 🔍 **模糊匹配**         | 预设名拼错了？Levenshtein 距离帮你找到最接近的匹配                       |
| 🧪 **Dry Run**          | 使用 `--dry-run` 预览所有变更，不写入任何文件                            |
| 🔗 **脚本注入**         | 自动将 `<pm> lint` / `<pm> format` 脚本注入 package.json                 |

<br />

### 快速开始

```bash
# 全局安装（选择你的包管理器）
npm install -g @luxkit/cli
# 或
bun add -g @luxkit/cli

# 初始化格式化配置
lux fmt web          # 生成 ESLint、Prettier、Stylelint、CSpell、EditorConfig

# 初始化 VSCode 设置
lux vscode web       # 生成 .vscode/settings.json + extensions.json

# 查看可用预设
lux fmt list
lux vscode list
```

<br />

### CLI 命令

| 命令                       | 说明                                 |
| :------------------------- | :----------------------------------- |
| `lux fmt <preset>`    | 初始化格式化配置文件                 |
| `lux fmt list`             | 列出可用的格式化预设                 |
| `lux vscode <preset>` | 初始化 VSCode 工作区设置             |
| `lux vscode list`          | 列出可用的 VSCode 预设               |
| `lux vpn cmd`              | 复制 CMD 代理环境变量到剪贴板        |
| `lux vpn pw`               | 复制 PowerShell 代理环境变量到剪贴板 |

<br />

### 可用预设

| 预设       | 格式化 | VSCode | 技术栈                 |
| :--------- | :----: | :----: | :--------------------- |
| `web`      |   ✅   |   ✅   | Vue / React / TS / CSS |
| `electron` |   ✅   |   ✅   | Electron + Web 技术栈  |
| `uniapp`   |   ✅   |   ✅   | UniApp / 微信小程序    |
| `node`     |   ✅   |   ✅   | Node.js 后端           |
| `nest`     |   ✅   |   ✅   | NestJS 后端            |
| `go`       |   —    |   ✅   | Go 后端                |

<br />

### 命令选项

```bash
lux fmt <preset> [options]

  --force       强制覆盖已有文件
  --no-install  跳过依赖安装
  --dry-run     预览模式，不写入文件
```

<br />

### 工作原理

```
lux fmt web
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

| 分类   | 技术                                 |
| :----- | :----------------------------------- |
| 语言   | TypeScript 6.0（纯 ESM）             |
| 运行时 | Node.js 18+                          |
| 构建   | tsup                                 |
| 测试   | Vitest（单元测试 + 验收测试）        |
| CLI    | Commander.js                         |
| 输出   | Chalk                                |
| 依赖   | 零运行时依赖（仅 chalk + commander） |

<br />

### 开发

```bash
git clone git@github.com:TTT1231/lux.git
cd lux
bun install

bun link                  # 全局注册 `lux` 用于测试
lux fmt web          # 在任意项目上测试

bun test                  # 运行测试
bun build                 # 构建到 dist/
bun code:check:all        # lint + 格式化 + 拼写检查
```

<br />

### 📄 许可证

[ISC](https://opensource.org/licenses/ISC) — 可自由使用、修改和分发。

<br />

<p align="right"><a href="./README.md">← Switch to English</a></p>
