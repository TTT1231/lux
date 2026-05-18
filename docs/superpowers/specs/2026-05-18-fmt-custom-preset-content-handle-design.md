# 自定义预设内容处理对齐设计

## 问题

自定义预设（用户从零创建的）在 `applyLocalFmtPreset` 中直接复制文件，不做任何内容转换。内置预设通过 `generateConfigFile` 会将 `<lockfile>` 占位符替换为实际的锁文件名（如 `bun.lock`、`package-lock.json`），但自定义预设保留原始 `<lockfile>` 字符串。

影响范围：所有包含 `<lockfile>` 占位符的配置文件，包括：
- `eslint.config.mjs` 的 `ignores` 数组
- `.prettierignore` 内容
- 其他可能包含 `<lockfile>` 的文件

## 根因

1. `executeLocalPath`（`fmt.ts`）没有检测包管理器，`opts.lockfile` 为 `undefined`
2. `applyLocalFmtPreset`（`local-preset.ts`）读取文件后直接写入，不做占位符替换

## 方案

最小改动方案 — 在现有位置添加替换逻辑，不引入新抽象。

### 改动 1：`executeLocalPath` 检测锁文件

将 PM 检测提前到 `opts` 构建之前，设置 `lockfile` 字段：

```typescript
// src/commands/fmt.ts - executeLocalPath()
const pm = fileExists(path.join(cwd, 'package.json'))
   ? detectPackageManager(cwd)
   : undefined;

const opts: GenerateOptions = {
   // ... 其他字段不变
   lockfile: pm ? getLockfileName(pm) : undefined,
};
```

同时删除 line 166 的重复 PM 检测，复用提前检测的结果。

### 改动 2：`applyLocalFmtPreset` 添加占位符替换

读取文件后、写入前，应用与内置预设路径一致的 `<lockfile>` 替换：

```typescript
// src/core/local-preset.ts - applyLocalFmtPreset()
const content = readFile(path.join(presetDir, filename));
if (content !== null) {
   const resolved = opts.lockfile
      ? content.replace(/<lockfile>/g, opts.lockfile)
      : content.replace(/<lockfile>\n?/g, '');
   writeFile(destPath, resolved);
}
```

## 改动范围

| 文件 | 改动 | 行数变化 |
|------|------|----------|
| `src/commands/fmt.ts` | PM 检测提前 + `opts.lockfile` | ~3 行 |
| `src/core/local-preset.ts` | `<lockfile>` 替换 | ~3 行 |

## 测试

- 单元测试：自定义预设文件含 `<lockfile>` 时正确替换为实际锁文件名
- 单元测试：无 lockfile 时 `<lockfile>` 及其后换行被清除
- 现有验收测试应继续通过

## 不在范围内

- lint-staged 动态组合（自定义预设使用静态 `.lintstagedrc.json`）
- JSON 格式化标准化（用户控制自己的文件格式）
- 其他新占位符
