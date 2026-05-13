## Why

内置预设（web-vue、web-react 等）无法覆盖所有技术栈，用户也无法微调已生成的配置。每次重新执行命令，手动修改的内容会被覆盖。需要一个"一次生成、持久定制"的机制。

## What Changes

- `lux fmt <preset>` 和 `lux vscode <preset>` 命令增加本地预设检测与物化逻辑
- 首次执行：走现有生成管线（不变），事后将生成的文件存档到 `.lux/preset/` 目录，同时生成模板 `package.json`（含 deps 和 scripts，使用 `<latest>` 和 `<pm>` 占位符）
- 后续执行：检测到 `.lux/preset/` 存在后，跳过内置预设生成，直接从本地目录复制文件到项目根，合并 `package.json`
- 新增 `--reset` flag：删除本地预设目录，恢复为首次物化流程
- 所有现有 flags（`--stylelint`、`--editorconfig`、`--force`、`--no-install`、`--dry-run`）在本地预设路径下全部支持

## Capabilities

### New Capabilities

- `local-preset`: 本地预设物化、检测、复制、补全、重置能力

### Modified Capabilities

- `fmt-command`: 增加本地预设检测分支和 `--reset` flag
- `vscode-command`: 增加本地预设检测分支和 `--reset` flag

## Impact

- **Modified files**: `src/commands/fmt.ts`（本地预设检测 + 物化 post-step + `--reset`）、`src/commands/vscode.ts`（同上）
- **New files**: `src/core/local-preset.ts`（物化存档、检测、文件复制、package.json 合并逻辑）
- **No new dependencies**: 全部使用 Node.js 内置 `fs` 模块

## Materialized Directory Structure

```
.lux/preset/
├── fmt/
│   └── web-vue/
│       ├── eslint.config.mjs     → 复制到项目根
│       ├── .prettierrc           → 复制到项目根
│       ├── .prettierignore       → 复制到项目根
│       ├── stylelint.config.mjs  → 复制到项目根（可选）
│       ├── .stylelintignore      → 复制到项目根（可选）
│       ├── cspell.json           → 复制到项目根
│       ├── .editorconfig         → 复制到项目根（可选）
│       └── package.json          → 合并到项目 package.json
│                                    devDependencies: <latest> 或固定版本
│                                    scripts: 含 <pm> 占位符
└── vscode/
    └── web-vue/
        ├── settings.json          → 合并到 .vscode/settings.json
        └── extensions.json        → 写入 .vscode/extensions.json
```

## Placeholder Convention

| Placeholder | Where | Meaning |
|-------------|-------|---------|
| `<pm>` | scripts | `bun` / `npm run` / `pnpm` |
| `<latest>` | package.json devDeps | 不带版本号，PM 安装最新版 |

## Flag Behavior (Local Preset Path)

| Flag | Behavior |
|------|----------|
| `--stylelint` | 过滤 stylelint 文件/依赖/脚本 |
| `--editorconfig` | 过滤 .editorconfig |
| `--force` | 覆盖已有文件 |
| `--no-install` | 只写 package.json，不安装 |
| `--dry-run` | 预览哪些文件会被复制/覆盖/跳过 |
| `--reset` | 删除本地预设，走首次物化路径 |

## Non-goals

- 远程/包预设加载（npm、Git、URL）
- 预设继承/组合（"基于 web-vue 叠加自定义规则"）
- 预设版本管理（回滚、diff）
- 团队共享/分发
