# Husky & Lint-Staged 预设驱动改造

**Date:** 2026-05-19
**Status:** Approved

## 问题

`--husky` 和 `--lint-staged` 两个 flag 与其他 flag（`--cspell`、`--stylelint`、`--editorconfig`）行为不一致：

| 对比维度 | cspell / stylelint | husky / lint-staged |
|----------|--------------------|---------------------|
| 预设提供内容 | `FmtPreset` 有函数字段 | 无对应字段，硬编码在命令层 |
| 生成方式 | `CONFIG_GETTERS` 统一遍历 | `initHusky()` 独立处理 |
| 自定义预设支持 | 从目录复制文件 | 不支持 |
| 内置预设可定制 | 返回不同内容 | 所有预设 hook 内容一样 |
| --force 处理 | 走 `conflict-resolver` | 独立判断 |

具体问题：

1. **Hook 内容硬编码**：`initHusky()` 写死 hook 命令，且使用 `npm run` 等 run 前缀调用 lint-staged，应该用可执行命令前缀（`npx`/`bunx`/`pnpx`）
2. **自定义预设不支持**：`applyLocalFmtPreset()` 不处理 `.husky/` 目录和 `.lintstagedrc.json`
3. **lint-staged 双机制**：内置预设用 `lintStagedFragments` + `composeLintStaged()` 代码动态组合，没有统一到 `FmtPreset` 接口
4. **PM 前缀硬编码在函数内**：预设无法灵活控制 PM 相关前缀

## 方案

将 husky 和 lint-staged 对齐到 cspell/stylelint 的「预设提供内容 → 生成器消费」模式。

核心设计决策：**使用占位符标签（`<pm>`、`<pmx>`）而非运行时映射函数**，与现有 `<lockfile>` 占位符机制保持一致，为用户提供最大灵活性。

### 占位符标签

| 标签 | 含义 | 替换示例（bun） | 替换示例（npm） |
|------|------|----------------|----------------|
| `<pm>` | run 前缀 | `bun run` | `npm run` |
| `<pmx>` | exec 前缀 | `bunx` | `npx` |
| `<lockfile>` | 锁文件名（现有） | `bun.lock` | `package-lock.json` |

替换规则：
- `<pm>` → `getRunPrefix(pm)` 的结果
- `<pmx>` → `getExecPrefix(pm)` 的结果（新增工具函数）

标签在写入文件时统一替换。

### 改动 1：FmtPreset 类型扩展

新增两个函数字段：

```typescript
// src/presets/types.ts
export interface FmtPreset {
  // ... 现有字段 ...

  /** Husky pre-commit hook 内容模板。支持 <pm> 和 <pmx> 占位符 */
  husky?: (flags: { lintStaged: boolean }) => string;

  /** lint-staged 配置内容（JSON string）。flags 用于决定包含哪些片段 */
  lintStaged?: (flags: { stylelint: boolean }) => string;
}
```

- 函数不再接收 `pm` 参数 — PM 相关内容通过 `<pm>` / `<pmx>` 标签表达，运行时统一替换
- `lintStagedFragments` 保留为内置预设的内部数据，不暴露到接口

### 改动 2：新增工具函数 getExecPrefix

```typescript
// src/utils/deps.ts
export function getExecPrefix(pm: PackageManager): string {
  switch (pm) {
    case 'bun':   return 'bunx';
    case 'pnpm':  return 'pnpx';
    case 'yarn':  return 'yarn dlx';
    case 'npm':   return 'npx';
  }
}
```

用于标签替换，不直接暴露给预设。

### 改动 3：内置预设实现函数

每个内置 preset 添加 `husky` 和 `lintStaged` 函数，返回带标签的模板内容：

```typescript
// src/presets/fmt/web-vue.ts
export const webVue: FmtPreset = {
  // ... 现有字段 ...

  husky: ({ lintStaged }) => {
    if (lintStaged) {
      return '<pmx> lint-staged\n';
    }
    return '<pm> lint\n';
  },

  lintStaged: ({ stylelint }) => {
    const composed = composeLintStaged(lintStagedFragments, { stylelint });
    return JSON.stringify(composed, null, 2) + '\n';
  },
};
```

预设只提供模板内容，不关心 PM 是什么。`lintStagedFragments` 变为 `lintStaged` 函数的内部实现数据。

### 改动 4：generateAllFmt 使用预设函数

```typescript
// src/generators/fmt.ts - generateAllFmt()

// 之前：
if (opts.lintStaged && preset.lintStagedFragments) {
  const composed = composeLintStaged(preset.lintStagedFragments, { stylelint: opts.stylelint });
  // ...
}

// 之后：
if (opts.lintStaged && preset.lintStaged) {
  const content = preset.lintStaged({ stylelint: opts.stylelint });
  const action = generateConfigFile(preset, '.lintstagedrc.json', content, opts);
  // ...
}
```

### 改动 5：initHusky 参数化 + 标签替换

```typescript
// src/commands/fmt.ts
async function initHusky(
  cwd: string,
  pm: PackageManager,
  opts: GenerateOptions,
  hookContent?: string,  // 新参数：预设提供的 hook 模板内容
): Promise<void> {
  // 默认值保留向后兼容
  const template = hookContent ?? (
    opts.lintStaged ? '<pmx> lint-staged\n' : '<pm> lint\n'
  );
  // 替换占位符标签
  const content = template
    .replace(/<pmx>/g, getExecPrefix(pm))
    .replace(/<pm>/g, getRunPrefix(pm));
  // ... 用 content 写入 .husky/pre-commit
}
```

内置预设调用：`initHusky(cwd, pm, opts, preset.husky?.({ lintStaged: opts.lintStaged }))`

**注意：husky init 默认内容**。`bunx husky init` 执行后，`.husky/pre-commit` 会包含默认内容（如 `bun test`）。`initHusky()` 需要在执行 init 后覆盖此默认内容，而不是在 init 前。调整执行顺序：

1. 注入 init script（`prepare: "husky"`）到 package.json
2. 执行 init script → husky 创建 `.husky/` 目录和默认 pre-commit
3. 用预设提供的正确内容覆盖 `.husky/pre-commit`

### 改动 6：自定义预设文件模板支持

自定义预设目录结构支持 `.husky/` 子目录：

```
.lux/presets/fmt/<preset-name>/
├── .husky/
│   └── pre-commit          # hook 内容，支持 <pm>/<pmx>/<lockfile> 标签
├── .lintstagedrc.json      # lint-staged 配置
├── eslint.config.mjs
├── ...
```

自定义预设的 `.husky/pre-commit` 内容示例：

```
<pmx> lint-staged
```

`applyLocalFmtPreset()` 改造：

1. 扫描预设目录下的 `.husky/` 子目录
2. 复制其中的文件到目标项目的 `.husky/`（带 chmod 0o755）
3. 复制时替换 `<pm>` / `<pmx>` / `<lockfile>` 标签
4. `.lintstagedrc.json` 当作普通配置文件，受 `--lint-staged` flag 控制
5. 读取 `.husky/pre-commit` 内容传给 `initHusky()`

### 改动 7：--force 统一

`.husky/pre-commit` 的 force 处理对齐 `forceOverwrite`/`neverOverwrite` 机制：

- `initHusky()` 中不再独立判断 `fileExists && !opts.force`
- 改为检查 `preset.forceOverwrite` / `preset.neverOverwrite`（如果预设提供了的话）
- 自定义预设路径同样使用 `applyLocalFmtPreset` 已有的 force 逻辑

### 固化（Materialization）策略

内置预设第一次运行后固化到 `.lux/presets/fmt/<name>/`，后续运行使用固化产物。husky 和 lint-staged 都固化完整版本，运行时根据 flag 裁剪。

**husky hooks — 固化完整版本：**
- `materializeFmtPreset()` 保存 `.husky/pre-commit` 完整版本（含 `<pmx> lint-staged`）
- 运行时 `applyLocalFmtPreset()` 读取固化文件，根据 `--lint-staged` flag 裁剪：
  - `--lint-staged` 传递 → 保持原样（替换标签后写入）
  - `--lint-staged` 未传递 → 从内容中去掉 lint-staged 命令（strip），替换为 `<pm> lint`
- 类似 package.json scripts 的处理方式：固化全量，运行时根据 flag 过滤

**`.lintstagedrc.json` — 固化完整版本：**
- `materializeFmtPreset()` 保存完整版本的 `.lintstagedrc.json`（包含所有 lint-staged 片段）
- `applyLocalFmtPreset()` 根据 `--lint-staged` flag 决定是否复制该文件
- 片段内容在固化时包含所有工具（stylelint 等），lint-staged 在运行时会自动跳过未安装的 linter

**固化时的文件内容：**
- `.husky/pre-commit` 内容：`<pmx> lint-staged\n`（完整的 lint-staged 版本）
- 标签（`<pmx>`、`<pm>`、`<lockfile>`）在固化时保留原样，运行时替换

### PM 处理

PM 冲突处理与其他功能保持一致 — 使用 `detectPackageManager()` 的结果（全局配置优先于 lockfile），不做特殊处理。

## 调用流程

```
内置预设首次运行（executeBuiltinPath）:
  generateAllFmt():
    preset.lintStaged?.({ stylelint }) → 生成 .lintstagedrc.json
  initHusky(cwd, pm, opts, preset.husky?.({ lintStaged }))
    → initHusky 内部替换 <pm>/<pmx> 标签
  materializeFmtPreset():
    固化 .lintstagedrc.json（完整版本）
    固化 .husky/pre-commit（完整版本，含 <pmx> lint-staged）

内置预设后续运行（executeLocalPath，使用固化产物）:
  applyLocalFmtPreset():
    根据 --lint-staged flag 决定是否复制 .lintstagedrc.json
    读取 .husky/pre-commit，根据 --lint-staged flag 裁剪内容
    替换 <pm>/<pmx>/<lockfile> 标签
  initHusky(cwd, pm, opts, hookContentFromFile)
    → 执行 husky init，覆盖默认内容

自定义预设运行（executeLocalPath）:
  applyLocalFmtPreset():
    复制 .lintstagedrc.json 文件到目标项目（根据 flag）
    复制 .husky/ 目录下的文件（带标签替换）
  initHusky(cwd, pm, opts, hookContentFromFile)
```

## 改动范围

| 文件 | 改动 |
|------|------|
| `src/presets/types.ts` | 新增 `husky`、`lintStaged` 字段 |
| `src/presets/fmt/*.ts` | 各内置 preset 实现新函数（web-vue, web-react, nest, node 等） |
| `src/generators/fmt.ts` | `generateAllFmt()` 使用 `preset.lintStaged()` 替代直接访问 `lintStagedFragments` |
| `src/commands/fmt.ts` | `initHusky()` 参数化 + 标签替换 + 调整执行顺序（先 init 再覆盖） |
| `src/core/local-preset.ts` | `applyLocalFmtPreset()` 支持 `.husky/` 和 `.lintstagedrc.json` + 标签替换 + flag 裁剪；`materializeFmtPreset()` 固化 `.husky/` 和 `.lintstagedrc.json` |
| `src/utils/deps.ts` | 新增 `getExecPrefix()` 工具函数 |

## 测试

- 单元测试：`getExecPrefix()` 根据 PM 返回正确的可执行命令前缀（bun→bunx, npm→npx 等）
- 单元测试：内置预设 `husky()` 函数返回带 `<pmx>` / `<pm>` 标签的模板内容
- 单元测试：内置预设 `lintStaged()` 函数根据 flag 组合正确片段
- 单元测试：`initHusky()` 正确替换 `<pmx>` → `bunx`/`npx` 等实际前缀
- 单元测试：`materializeFmtPreset()` 固化 `.husky/pre-commit` 和 `.lintstagedrc.json`
- 单元测试：`applyLocalFmtPreset()` 无 `--lint-staged` 时从 pre-commit 中去掉 lint-staged
- 单元测试：`applyLocalFmtPreset()` 有 `--lint-staged` 时保持 pre-commit 原样
- 单元测试：`applyLocalFmtPreset()` 无 `--lint-staged` 时不复制 `.lintstagedrc.json`
- 单元测试：自定义预设目录含 `.husky/pre-commit` 时正确复制（带标签替换）
- 单元测试：`initHusky()` 覆盖 husky init 的默认内容（`bun test`）
- 单元测试：无 hookContent 时回退到默认行为
- 现有验收测试继续通过

## 不在范围内

- husky hooks beyond pre-commit（如 commit-msg、pre-push）
- lint-staged 配置的动态验证
- initHusky 拆分到独立文件（保持原地改动）
