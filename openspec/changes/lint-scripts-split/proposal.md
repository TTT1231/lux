## Why

Aggregated lint scripts (`eslint . && cspell && tsc --noEmit && stylelint "..."`) cause `&&` short-circuit failures where later tool errors are invisible. The regex-based `filterScripts` that strips inline tool segments is fragile and hard to maintain. Dependency filtering uses hardcoded `isNotXxxDep()` functions that require code changes when adding new tools. A unified deps.json per tool grouping will enable fully custom presets without touching preset TypeScript code.

## What Changes

- **BREAKING**: Replace aggregated `lint`/`lint:fix` scripts with 8 individual tool scripts (`eslint`, `eslint:fix`, `stylelint`, `stylelint:fix`, `cspell`, `type:check`, `format`, `lint-staged`). User's existing `lint`/`lint:fix` are not touched.
- Introduce `deps.json` as the **sole** dependency source for all presets (builtin + materialized), organized by tool group with both `dependencies` and `devDependencies`.
- Remove `dependencies.dev` array from preset TypeScript code — dependencies are fully externalized to `deps.json`.
- Simplify `filterScripts` from regex content-stripping to key-based deletion (each tool is an independent script key).
- Change `.lintstagedrc.json` generation from static JSON string to dynamic composition from per-tool fragments based on flags.
- Flip `GenerateOptions` flag semantics from `noStylelint: boolean` (default true) to `stylelint: boolean` (default false) for clarity.
- Remove `isNotStylelintDep`, `isNotEditorconfigDep`, `isNotCspellDep`, `isNotHuskyDep`, `isNotLintStagedDep` functions and `STYLELINT_DEPS`, `HUSKY_DEPS`, `LINTSTAGED_DEPS` Sets.
- Rewrite `resolveLocalDeps` to read from `deps.json` tool groups instead of template `package.json` `<latest>` placeholders.
- Simplify materialized template `package.json` to only contain `scripts` (remove `devDependencies` section).

## Capabilities

### New Capabilities

- `deps-registry`: Unified per-tool dependency registry (deps.json) serving as the sole source of truth for dependency installation decisions across builtin and materialized presets.
- `lint-staged-composition`: Dynamic assembly of `.lintstagedrc.json` from per-tool lint-staged fragments based on active flags, with empty glob key cleanup.

### Modified Capabilities

- `fmt-command`: Script injection changes from aggregated to individual tool scripts; `filterScripts` simplifies from regex to key-based; flag semantics flip from `noXxx` to positive boolean.
- `husky-lint-staged`: `.lintstagedrc.json` generation changes from static preset output to dynamic composition.
- `local-preset`: Materialization stops writing `devDependencies` to template `package.json`; `resolveLocalDeps` reads from `deps.json` instead; dependency flag detection uses deps.json tool groups instead of `isNotXxxDep` functions.

## Impact

- **Preset files** (`src/presets/fmt/*.ts`): Remove `dependencies` field, change `scripts` from aggregated to individual, change `lintStaged` from static JSON to per-tool fragments.
- **Core logic** (`src/core/shared.ts`, `src/core/local-preset.ts`): Remove filter functions and Sets, rewrite deps resolution.
- **Command handler** (`src/commands/fmt.ts`): Flip `GenerateOptions` fields, simplify filterDeps and filterScripts, change injectScripts to handle new script structure.
- **Generator** (`src/generators/fmt.ts`): `.lintstagedrc.json` generation uses composition instead of preset string.
- **New files**: `deps.json` for each builtin preset under `src/presets/fmt/<name>/deps.json`.
- **Template `package.json`** in materialized presets loses `devDependencies`, gains nothing new.

## Change the overall picture

```
 ┌─────────────────────────────────────────────────────────────────────┐
  │                    改动全貌                                         │
  ├─────────────────────────────────────────────────────────────────────┤
  │                                                                     │
  │  1. deps.json (新增，统一依赖源)                                     │
  │     ├── builtin:  src/presets/fmt/<name>/deps.json                  │
  │     ├── local:    ~/.lux/preset/fmt/<name>/deps.json                │
  │     ├── 格式:     按工具分组 { eslint: { devDependencies: {...} } } │
  │     └── preset 代码中 dependencies 字段完全移除                       │
  │                                                                     │
  │  2. Scripts (拆分)                                                   │
  │     ├── 8 个独立脚本替代聚合脚本                                      │
  │     ├── eslint/eslint:fix 带 preset 自己的 glob                      │
  │     └── 不碰用户已有的 lint / lint:fix                               │
  │                                                                     │
  │  3. filterScripts (简化)                                             │
  │     ├── 从正则剥离内容 → 按 key 删除整个脚本                          │
  │     └── 不再需要 regex surgery                                       │
  │                                                                     │
  │  4. lint-staged (动态组合)                                           │
  │     ├── 每个工具独立定义分片                                          │
  │     ├── 按 flag 组装输出                                             │
  │     └── 空 glob key 删除                                            │
  │                                                                     │
  │  5. Flag 语义 (翻转)                                                │
  │     ├── noStylelint → stylelint: boolean                            │
  │     ├── 所有 GenerateOptions 字段翻转                                │
  │     └── 条件判断方向跟着变                                           │
  │                                                                     │
  │  6. isNotStylelintDep 等 (简化/移除)                                 │
  │     ├── deps.json 按工具分组后，不需要逐包名过滤                       │
  │     └── 直接读对应工具的 devDependencies 列表                        │
  └─────────────────────────────────────────────────────────────────────┘
```

## Design Consensus

```
 ┌───────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────┐
  │              点               │                                      决策                                       │
  ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
  │ deps.json 格式                │ 按工具分组，含 dependencies + devDependencies                                   │
  ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
  │ deps.json 位置                │ src/presets/fmt/<name>/deps.json (builtin) + ~/.lux/preset/fmt/<name>/deps.json │
  │                               │  (local)                                                                        │
  ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
  │ preset 代码中 dependencies    │ 完全移除                                                                        │
  ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
  │ scripts                       │ 拆为 8 个独立脚本                                                               │
  ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
  │ filterScripts                 │ 按 key 删除，删掉正则                                                           │
  ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
  │ lint-staged                   │ 留在 preset 代码，按工具分片定义                                                │
  ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
  │ isNotXxxDep / STYLELINT_DEPS  │ 全部删除                                                                        │
  │ 等                            │                                                                                 │
  ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
  │ flag 语义                     │ 翻转为 stylelint: boolean 等正值                                                │
  ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
  │ resolveLocalDeps              │ 改为读 deps.json                                                                │
  ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
  │ 模板 package.json             │ 只保留 scripts，移除 devDependencies                                            │
  └───────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────┘
```
