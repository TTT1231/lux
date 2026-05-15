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

### 📌 为什么选择 lux？

每次新建项目都要花大量时间折腾代码规范配置？`lux` 让你彻底告别这一痛点！作为一款专为现代化开发与 **AI 时代** 打造的工程化配置工具，只需一条命令即可为您搭好绝佳的开发 lint 基建。

- 🚀 **一键极速配置**：告别繁琐的手动依赖安装，一套命令自动为你搭好 ESLint、Prettier、CSpell、Stylelint、EditorConfig 以及完美的 VSCode 工作区体验。
- 🤖 **AI Agent 最佳拍档**：专为 Claude、Opencode 打造生态！技能（Skill）体系，你可以直接用自然语言（如*"/lux 帮我配一套适合团队的 react 代码规范"*），让 AI 帮你全自动构建和调整自定义预设。
- 📦 **框架开箱即用**：内置场景预设：`web-vue`, `web-react`, `node`等。
- 🎨 **高度自由的专属定制**：厌倦了死板的“一刀切”封装配置？`lux` 支持提取和微调内置预设，更支持**完全自定义私有预设**，完美兼顾开箱即用体验与团队强定制化刚需。
- 🧠 **项目安全无痛接入**：拥有智能冲突解决与合配机制，自动检测 `bun` `pnpm` `npm` `yarn` 依赖树，将配置注入到已有项目中。

<div align="center">
  <img src="https://github.com/TTT1231/lux/blob/main/demo.gif?raw=true" alt="lux 演示" width="640" />
</div>

## ⚡快速开始

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
lux vscode web-vue             #（项目内） 生成 .vscode/settings.json + extensions.json

# 查看可用预设
lux fmt list
lux vscode list

# 下一步：自定义你自己的lint预设（可选）
```

<br />

## 🎨 自定义内置预设

```bash
# 检查skill和预设是否初始化（已初始化，请忽视）
lux init && lux init --preset

# 使用 ai agent 进行自定义内置预设（推荐）
# 在ai agent例如claude，直接执行以下即可
/lux 配置内置预设 web-react 模板，符合我的开发项目风格

# 如果你不想使用 ai agent 可直接编辑 `~/.lux/preset/`下的内置预设文件
# 例如修改 web-react 增加cspell script
# "cspell":"cspell \"src/**/*\""  到 `~/.lux/preset/fmt/web-react/package.json` 即可
```

## 🧩 完全自定义预设

如果你想完全自定义自己的 lint，按照以下方法进行即可：

```bash
# 检查skill和预设是否初始化（已初始化，请忽视）
lux init && lux init --preset

# 使用 ai agent 进行完全自定义预设（推荐）
# 在ai agent例如claude，直接执行以下即可
/lux 配置我的格式化模板<your-custom-fmt-preset-name>，符合我的开发项目风格

# 检查是否配置成功
lux fmt list
```

## 📖命令参考

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

### ⚙️命令选项

```bash
lux fmt <preset> [options]

  --force         强制覆盖已有文件
  --no-install    跳过依赖安装
  --dry-run       预览模式，不写入文件
  --stylelint     包含 Stylelint 配置（按需启用）
  --editorconfig  包含 EditorConfig 的配置（按需启用）
  --reset         重置本地预设，从内置默认值重新创建

lux vscode <preset> [options]

  --force         强制覆盖已有文件
  --dry-run       预览模式，不写入文件
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
  --stylelint / --editorconfig 过滤（自定义预设无对应配置时 warning）
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
  自动安装 devDependencies（检测 lockfile 判断包管理器）
```

<br />

## 🤝 参与贡献与支持

发现 Bug、有绝妙的新功能想法，或者想亲自下场优化代码？我们极其欢迎你的加入！

- 🐛 **提交 Bug 或需求**：任何疑问或改进建议，欢迎随时在 GitHub [提交 Issue](https://github.com/TTT1231/lux/issues)。
- 🛠 **提交代码 (PR)**：非常欢迎并且期待你提交 [PR](https://github.com/TTT1231/lux/pulls) 来一起完善这个项目！
- ⭐️ **点赞支持**：如果这个工具帮你节省了哪怕 5 分钟的配置时间，请在 GitHub 上点亮一个 [⭐️Star](https://github.com/TTT1231/lux)！

<br />

## 📄 许可证

[ISC](https://opensource.org/licenses/ISC) — 可自由使用、修改和分发。

<br />

<p align="right"><a href="./README.md">← Switch to English</a></p>
