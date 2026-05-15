## Context

当前 fmt 命令中 CSpell 是默认包含的工具 — 所有 preset 的 lint script 都链入 cspell 检查，cspell.json 无条件生成，cspell 依赖无条件安装。项目中已有两个 opt-in 工具：`--stylelint`（opt-in，默认不包含）和 `--editorconfig`（opt-in，默认不包含）。CSpell 的无条件包含与这一模式不一致。

现有 opt-in 机制采用 STRIP 模式：preset 源码保留工具配置，运行时通过 `filterScripts` 动态剥离。CSpell 将复用相同模式。

## Goals / Non-Goals

**Goals:**

- 新增 `--cspell` flag，使 CSpell 成为 opt-in
- 复用与 `--stylelint` 完全一致的 STRIP 过滤机制
- 所有路径（built-in 生成、local preset materialization、local preset apply）均尊重 flag

**Non-Goals:**

- 不修改 preset 源码中的 lint script 定义（cspell 段落保留在源码中）
- 不建立 CSPELL_DEPS Set（只按包名 `cspell` 过滤）
- 不影响 vscode / init / update / show 等其他命令
- 不重命名 `noStylelint` / `noEditorconfig` 字段

## Architecture Visualization

```
                    ┌─────────────────────────┐
                    │     CLI (--cspell)       │
                    └────────────┬────────────┘
                                 │
                    noCspell = !options.cspell
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │  Generator   │  │  Deps Filter │  │ Scripts      │
     │  fmt.ts      │  │  fmt.ts      │  │ Filter       │
     │              │  │              │  │ filterScripts│
     │ skip cspell  │  │ skip cspell  │  │ strip cspell │
     │ .json        │  │ dep          │  │ inline + key │
     └──────────────┘  └──────────────┘  └──────────────┘

     ┌──────────────────────────────────────────────────┐
     │              Local Preset Path                    │
     │  materializeFmtPreset → stores FULL template     │
     │  applyLocalFmtPreset  → filters by --cspell flag │
     │  filterScripts        → add noCspell param       │
     └──────────────────────────────────────────────────┘
```

## Decisions

### 1. 复用 STRIP 模式而非 INJECT 模式

**选择**: preset 源码保留 cspell，运行时 strip

**替代方案**: preset 源码不含 cspell，传 `--cspell` 时动态注入

**理由**: 与 stylelint/editorconfig 保持一致，减少代码分歧。strip 只需正则匹配已有段落，inject 需要知道插入位置和命令模板。

### 2. 依赖过滤只匹配包名 `cspell`

**选择**: `dep === 'cspell'` 简单匹配

**替代方案**: 建立 `CSPELL_DEPS` Set（仿 `STYLELINT_DEPS`）

**理由**: 当前所有 preset 中 cspell 相关依赖只有 `cspell` 一个包，没有插件/扩展包。无需预留扩展性 — 如果将来出现 cspell 插件，届时再建 Set。

### 3. `noCspell` 命名与 `noStylelint` 保持一致

**选择**: `noCspell: boolean`（默认 `true`，即不包含）

**理由**: 与现有命名约定一致。虽然双重否定略绕，但保持一致性优先。

### 4. script inline strip 正则

**选择**: 与 stylelint 一致的模式 — strip `&& cspell ...` 段落

**理由**: 所有 preset 中 cspell 在 lint script 中的格式统一为 `&& cspell --cache --cache-location node_modules/.cache/cspell --gitignore "src/**/*"`，可用同类正则匹配。

## Over-Engineering Traps

N/A — 改动范围小且模式已确立（复制 stylelint 的处理逻辑），过度工程化风险低。

## Risks / Trade-offs

- **Breaking change**: 默认不再包含 cspell → 现有用户首次升级后需手动加 `--cspell`。缓解：这是 config 工具，不影响用户项目的运行时行为，且 cspell 本身只是检查工具。
- **Local preset 不一致**: 已 materialize 的 local preset 中仍有 cspell.json → 用户需 `--reset` 重新 materialize。缓解：用户可以手动删除 local preset 中的 cspell.json。
