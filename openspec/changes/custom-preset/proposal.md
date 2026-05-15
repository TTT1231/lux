## Why

当前 `fmt <preset>` 仅支持内置预设。用户无法创建自己的预设组合（例如公司内部模板、团队定制配置）。虽然内置预设运行后会 materialize 到 `~/.lux/preset/fmt/<name>/`，且已有 local preset 的应用逻辑，但由于 `resolvePreset()` 在找不到内置名称时直接 `process.exit(1)`，自定义预设永远无法被触发。

同时，`--stylelint` 未传入时的 script 过滤只处理内联 `&& stylelint "..."` 片段，不处理独立命名的 stylelint script entry（如 `stylelint:check`），导致不需要 stylelint 的项目仍会注入无用的 script。

## Requirement Confirmation

```bash
  ┌──────────────────────────────────────────────────────────────┐
  │            Change: custom-preset — 需求确认                   │
  ├──────────────────────────────────────────────────────────────┤
  │                                                              │
  │  Part 1: 自定义预设支持                                      │
  │  ├── 目录名 = 预设名，无需 manifest 文件                     │
  │  ├── package.json 是必需的，缺少则视为无效预设               │
  │  ├── fmt list: 内置在前，自定义在后，自定义标记 (custom)     │
  │  ├── fmt <custom> 使用现有 local preset 逻辑                │
  │  ├── --stylelint / --editorconfig 对自定义同样生效           │
  │  ├── --reset + 自定义预设 → warn 并中止整个命令              │
  │  ├── 名称冲突: local 优先于 builtin (已有行为)               │
  │  └── 不存在的名称 → error + 对全部名称 fuzzy match           │
  │                                                              │
  │  Part 2: stylelint script 过滤增强                           │
  │  ├── key 包含 "stylelint" (大小写敏感) → 整条删除           │
  │  ├── value 内联 && stylelint 片段仍剥掉 (不变)               │
  │  └── builtin + local 两条路径都改                            │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘

```

## What Changes

- `fmt <custom-name>` 支持执行 `~/.lux/preset/fmt/<custom-name>/` 下的用户自定义预设（复用现有 local preset 应用逻辑）
- `fmt list` 扫描 `~/.lux/preset/fmt/` 目录，展示自定义预设并用 chalk 标记 `(custom)`
- `--reset` + 自定义预设 → warn 并中止整个命令（自定义预设没有 builtin 可 reset）
- `resolvePreset()` 不再 `process.exit`，改为在 fmt 命令层做查找 + fallback
- 预设名不存在时，error 对所有名称（builtin + custom 合并）做 fuzzy match
- `--stylelint` 未传入时，script key 包含 `stylelint`（大小写敏感）→ 整条 entry 删除
- `--editorconfig` 同理，script key 包含 `editorconfig` → 整条 entry 删除
- builtin 和 local 两条执行路径的 script 过滤逻辑统一更新

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `fmt-command`: 自定义预设的命令分发、`fmt list` 增强、`--reset` 对自定义预设的行为、stylelint/editorconfig script entry 过滤
- `local-preset`: 自定义预设发现（扫描目录）、有效性验证（package.json 必需）、mergeTemplateIntoProject 的 script entry 过滤增强

## Impact

- `src/commands/fmt.ts` — 主要改动文件，重写 preset 查找分发逻辑，增强 `fmt list`，增强 script 过滤
- `src/core/local-preset.ts` — 新增 `listCustomPresets()` 函数，增强 `mergeTemplateIntoProject` 的 script 过滤
- `src/utils/errors.ts` — `resolvePreset` 行为可能需要调整（不再 process.exit），或 fmt 命令不再调用它
- `tests/` — 需要新增自定义预设相关的单元测试
