## Context

`lux fmt` 当前通过 `FMT_PRESETS` 数组（6 个内置 TypeScript 对象）提供预设。运行后 materialize 到 `~/.lux/preset/fmt/<name>/`，后续运行走 local preset 路径。但 `resolvePreset()` 在找不到内置名称时直接 `process.exit(1)`，阻断了自定义预设的入口。

现有 local preset 基础设施（`local-preset.ts`）已经完备：读取目录文件、复制到项目根、合并 package.json、处理 `--stylelint`/`--editorconfig` 过滤。只需打开入口 + 增加发现机制。

## Goals / Non-Goals

**Goals:**
- 用户在 `~/.lux/preset/fmt/<name>/` 创建目录（含 package.json）即可被 `fmt` 命令识别和使用
- `fmt list` 展示内置 + 自定义预设，自定义用 chalk 标记区分
- `--stylelint`/`--editorconfig` 未传入时，按约定过滤整个 script entry（key 含关键字）
- 最小化改动，复用现有 `executeLocalPath` 和 `applyLocalFmtPreset` 逻辑

**Non-Goals:**
- 不提供 `fmt create` 命令（用户手动创建目录）
- 不支持自定义 preset.json manifest
- 不修改 `FmtPreset` 类型定义（仅用于 builtin）
- 不修改 vscode 命令的自定义预设支持
- 不修改 stylelint/editorconfig 的文件名匹配集合（保持硬编码）

## Decisions

### D1: resolvePreset 改为 return undefined，不 process.exit

当前 `resolvePreset()` 找不到就 `process.exit(1)` — 这是不可测试的反模式，且 `vscode.ts` 也依赖它。

改动：
1. `resolvePreset` 在 `errors.ts` 中改为 `return undefined`（不再 process.exit）
2. `vscode.ts` 调用处加 `if (!preset) return` guard
3. `fmt.ts` 不再调用 `resolvePreset`，改为自行三路分支：

```
name in FMT_PRESETS?
  YES → existing flow (local exists? → localPath : builtinPath)
  NO  → local exists?
          YES → executeLocalPath()
          NO  → error + fuzzy match against all names
```

好处：一次性解决，未来 vscode 加自定义预设时无需再改 errors.ts。

### D2: 自定义预设验证规则

目录被视为有效自定义预设的条件：
1. 在 `~/.lux/preset/fmt/<name>/` 下
2. 目录下存在 `package.json` 文件
3. 目录名通过 `isValidPresetName` 校验（已有函数，防止路径穿越）

无需 package.json 内容校验（空 `{}` 也可以接受——只是不会注入任何 deps/scripts）。

### D3: fmt list 实现方式

扫描 `~/.lux/preset/fmt/` 目录，与 `FMT_PRESETS` 名称取差集得到自定义列表。输出格式：

```
web-vue       Vue 3 + TypeScript web project
web-react     React + TypeScript web project
...
my-custom     (custom)          ← chalk.yellow
```

内置在前、自定义在后，各自按原有顺序/字母序排列。

### D4: script entry 过滤约定 — 共用函数

当 `noStylelint` 为 true 时：
- 如果 script **key** 包含 `stylelint`（大小写敏感）→ 整条 entry 删除（不注入）
- 内联 `&& stylelint "..."` 剥离逻辑不变

当 `noEditorconfig` 为 true 时：
- 如果 script **key** 包含 `editorconfig`（大小写敏感）→ 整条 entry 删除

DRY 要求：抽取一个共用的 `filterScripts(scripts, noStylelint, noEditorconfig)` 函数，两处调用同一个函数。位置：`src/core/local-preset.ts`（已有 merge 逻辑）。

改动位置：
- `src/core/local-preset.ts` — 新增共用 filterScripts + mergeTemplateIntoProject 调用它
- `src/commands/fmt.ts` — 删除 filterStylelintScripts，改为调用共用 filterScripts

### D5: --reset 对自定义预设的处理

检测到自定义预设（名称不在 FMT_PRESETS 中）时：
- warn: `"<name> is a custom preset, --reset has no builtin to restore"`
- 直接 return，不执行任何应用操作

## Over-Engineering Traps

- 不做 preset schema validation（不校验 package.json 的 devDependencies/scripts 结构）
- 不做自定义预设的版本管理或元数据
- 不增加 `fmt create` / `fmt init` 命令引导用户创建自定义预设

## Risks / Trade-offs

- [用户放无效文件到 preset 目录] → 不校验文件内容，只检查 package.json 存在性。无效内容由用户自行负责
- [stylelint key 过滤误伤] → 大小写敏感 + key 必须包含完整 `stylelint` 字符串。风险极低，因为 npm script key 中 `stylelint` 本身就是专有名词
- [目录扫描性能] → `~/.lux/preset/fmt/` 目录下通常 <20 个子目录，`fs.readdirSync` 无性能问题
