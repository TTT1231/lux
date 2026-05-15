## Why

CSpell 当前作为默认工具内置于所有 fmt preset 中 — 运行 `lux fmt web-vue` 会无条件生成 cspell.json、安装 cspell 依赖、将 cspell 检查链入 lint script。这与项目已有的 opt-in 模式不一致：Stylelint 和 EditorConfig 都通过 `--stylelint` / `--editorconfig` flag 显式启用。用户无法在不修改 preset 的情况下跳过 CSpell，增加了不必要的依赖和配置噪音。

## What Changes

- 新增 `--cspell` CLI flag，使 CSpell 成为 opt-in 工具（与 `--stylelint` 对称）
- `GenerateOptions` 接口新增 `noCspell: boolean` 字段
- `filterScripts` 函数新增 `noCspell` 参数，在无 `--cspell` 时从 lint script 中 strip 掉 `&& cspell ...` 段落并移除 key 含 `cspell` 的 script entry
- 文件生成、依赖安装、local preset materialization / apply 路径均需尊重 `--cspell` flag

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `fmt-command`: 新增 `--cspell` flag，默认不包含 CSpell；cspell 文件/依赖/script 过滤逻辑
- `local-preset`: materialization 和 apply 路径新增 cspell 过滤；`filterScripts` 签名扩展

### Behavioral comparison

```bash
┌──────────────────────────────────────────────────────────────┐
│                 Behavioral comparison                        │
├──────────────────────────────────────────────────────────────┤
│  命令                             │ cspell.json │ 依赖 │ 校验 │
│ ──────────────────────────────────┼─────────────┼──────┼──────│
│  lux fmt web-vue                  │      ✗      │  ✗   │  ✗   │
│  lux fmt web-vue --cspell         │      ✓      │  ✓   │  ✓   │
│  lux fmt web-vue --stylelint      │      ✗      │  ✗   │  ✗   │
│  lux fmt web-vue --cspell --slint │      ✓      │  ✓   │  ✓   │
│                                                              │
│  ✓ = 启用包含    ✗ = 关闭不包含                               │
└──────────────────────────────────────────────────────────────┘
```

## Impact

- `src/presets/types.ts` — `GenerateOptions` 接口变更
- `src/commands/fmt.ts` — CLI option 注册、`noCspell` 传递、依赖/script 过滤
- `src/generators/fmt.ts` — 文件生成过滤
- `src/core/local-preset.ts` — `filterScripts` 签名扩展、materialization/apply 过滤
- `tests/` — 现有测试需适配新的默认行为（cspell 默认不生成）
