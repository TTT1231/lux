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

`lux` 是一个 CLI 工具，只需一条命令即可快速配置项目 lint 和 VSCode 工作区设置，节省大量重复配置繁琐和Token。它从预设中生成 ESLint、Prettier、CSpell、Stylelint、EditorConfig 配置文件以及 VSCode 设置 —— 并带有智能合并和冲突解决机制。可根据需要自定义配置。

<div align="center">
  <img src="https://github.com/TTT1231/lux/blob/main/demo.gif?raw=true" alt="lux 演示" width="640" />
</div>

### 快速开始

```bash
# 全局安装（选择你的包管理器）
npm install -g @luxkit/cli

# 初始化 skill 和 preset
lux init && lux init --preset

# lint 使用
lux fmt web-vue                # 配置web-vue lint，配置 ESLint、Prettier、CSpell
lux fmt web-vue --stylelint    # 同时包含 Stylelint
lux fmt web-vue --editorconfig # 同时包含 EditorConfig

# vscode配置使用（option）
# 如果你全局自定义配置了，可忽视
lux vscode web-vue       #（项目内） 生成 .vscode/settings.json + extensions.json

# 查看可用预设
lux fmt list
lux vscode list
```

<br />

### 自定义配置

```bash
# 检查skill和预设是否初始化（已初始化，请忽视）
lux init && lux init --preset

# 使用 agent 进行自定义配置预设
/lux 帮我配置我的 web-react lint 模板，符合我的开发项目风格
```

### CLI 命令

| 命令                        | 说明                                                         |
| :-------------------------- | :----------------------------------------------------------- |
| `lux fmt <preset>`          | lint 配置                                                    |
| `lux fmt list`              | 列出 lint 可用的预设                                         |
| `lux vscode <preset>`       | 配置 VSCode 设置 (项目内)                                    |
| `lux vscode list`           | 列出可用的 VSCode 预设                                       |
| `lux init`                  | 初始化 skill                                                 |
| `lux init --preset`         | 初始化所有预设                                               |
| `lux set <key=value> [...]` | 设置代理环境变量（如 `https_proxy="http://127.0.0.1:7890"`） |
| `lux unset`                 | 清除全部的代理配置                                           |
| `lux show env`              | 显示已配置的代理环境变量                                     |
| `lux vpn cmd`               | 复制 CMD 代理命令到剪贴板                                    |
| `lux vpn pw`                | 复制 PowerShell 代理命令到剪贴板                             |
| `lux vpn bash`              | 复制 Bash 代理命令到剪贴板                                   |
| `lux update`                | 更新 `@luxkit/cli` 到最新版本                                |
| `lux update --check`        | 仅检查是否有可用更新，不执行安装                             |

<br />

### 命令选项

```bash
lux fmt <preset> [options]

  --force         强制覆盖已有文件
  --no-install    跳过依赖安装
  --dry-run       预览模式，不写入文件
  --stylelint     包含 Stylelint 配置（按需启用）
  --editorconfig  包含 EditorConfig 的配置（按需启用）
  --reset         重置本地预设，从内置默认值重新创建
```

<br />

### 工作原理

```
lux fmt web-vue
       │
       ▼
  解析 CLI 参数 ──► 解析预设（拼写错误时自动模糊匹配）
       │
       ▼
  本地预设存在于 ~/.lux/preset/？
       │
       ├── 是 ──► 从本地预设复制文件（可编辑，更新后不丢失）
       └── 否 ──► 从内置生成 ──► 保存到 ~/.lux/preset/ 以便复用
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

### 🤝 反馈与支持

如果你有任何疑问或遇到问题，欢迎到 GitHub [提交 Issue](https://github.com/TTT1231/lux/issues)。

<br />

### 📄 许可证

[ISC](https://opensource.org/licenses/ISC) — 可自由使用、修改和分发。

<br />

<p align="right"><a href="./README.md">← Switch to English</a></p>
