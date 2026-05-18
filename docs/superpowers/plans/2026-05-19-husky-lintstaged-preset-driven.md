# Husky & Lint-Staged 预设驱动改造 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `--husky` 和 `--lint-staged` flag 对齐到 cspell/stylelint 的预设驱动模式，支持占位符标签、固化、自定义预设。

**Architecture:** FmtPreset 新增 `husky` 和 `lintStaged` 函数字段返回带标签模板，`initHusky()` 参数化接收模板内容并替换 `<pm>`/`<pmx>` 标签。内置预设用函数，自定义预设用文件模板。固化保存完整版本，运行时根据 flag 裁剪。

**Tech Stack:** TypeScript, Vitest, Node.js fs

---

### Task 1: 新增 getExecPrefix 工具函数

**Files:**
- Modify: `src/utils/deps.ts:60-71`（在 `getRunPrefix` 后面添加）
- Test: `tests/unit/utils/deps.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/unit/utils/deps.test.ts` 的 `getRunPrefix` describe 块后面添加：

```typescript
import { getExecPrefix } from '../../../src/utils/deps';

describe('getExecPrefix', () => {
   it('returns correct exec prefix for each package manager', () => {
      expect(getExecPrefix('bun')).toBe('bunx');
      expect(getExecPrefix('pnpm')).toBe('pnpx');
      expect(getExecPrefix('yarn')).toBe('yarn dlx');
      expect(getExecPrefix('npm')).toBe('npx');
   });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bun run test --project unit -t "getExecPrefix"`
Expected: FAIL — `getExecPrefix` is not exported

- [ ] **Step 3: 实现 getExecPrefix**

在 `src/utils/deps.ts` 的 `getRunPrefix` 函数后添加：

```typescript
/** Get the exec command prefix for the detected package manager (npx/bunx/pnpx) */
export function getExecPrefix(pm: PackageManager): string {
   switch (pm) {
      case 'bun':
         return 'bunx';
      case 'pnpm':
         return 'pnpx';
      case 'yarn':
         return 'yarn dlx';
      case 'npm':
         return 'npx';
   }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `bun run test --project unit -t "getExecPrefix"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/deps.ts tests/unit/utils/deps.test.ts
git commit -m "feat(deps): add getExecPrefix utility function"
```

---

### Task 2: FmtPreset 类型扩展

**Files:**
- Modify: `src/presets/types.ts:36-56`

- [ ] **Step 1: 在 FmtPreset 接口新增字段**

在 `src/presets/types.ts` 的 `FmtPreset` 接口中，`lintStagedFragments` 后面添加两个新字段：

```typescript
/** Per-tool lint-staged fragments for dynamic composition */
lintStagedFragments?: Record<string, Record<string, string[]>>;
/** Husky pre-commit hook 内容模板，支持 <pm> 和 <pmx> 占位符 */
husky?: (flags: { lintStaged: boolean }) => string;
/** lint-staged 配置内容（JSON string），flags 用于决定包含哪些片段 */
lintStaged?: (flags: { stylelint: boolean }) => string;
/** Files to always overwrite even without --force */
forceOverwrite?: string[];
```

- [ ] **Step 2: 运行类型检查确认编译通过**

Run: `bun run type:check`
Expected: 无新增错误（新字段是 optional，不影响现有预设）

- [ ] **Step 3: Commit**

```bash
git add src/presets/types.ts
git commit -m "feat(types): add husky and lintStaged fields to FmtPreset"
```

---

### Task 3: 内置预设实现 husky 和 lintStaged 函数

**Files:**
- Modify: `src/presets/fmt/web-vue.ts`
- Modify: `src/presets/fmt/web-react.ts`
- Modify: `src/presets/fmt/nest.ts`
- Modify: `src/presets/fmt/node.ts`
- Modify: `src/presets/fmt/electron-vue.ts`
- Modify: `src/presets/fmt/uniapp.ts`
- Test: `tests/unit/presets/husky-lintstaged.test.ts`（新建）

- [ ] **Step 1: 写失败测试**

创建 `tests/unit/presets/husky-lintstaged.test.ts`：

```typescript
import { describe, expect, it } from 'vitest';
import { FMT_PRESETS } from '../../../src/presets/fmt';

describe('built-in preset husky()', () => {
   for (const preset of FMT_PRESETS) {
      describe(preset.name, () => {
         it('returns <pmx> lint-staged when lintStaged flag is true', () => {
            if (!preset.husky) return;
            const content = preset.husky({ lintStaged: true });
            expect(content).toContain('<pmx>');
            expect(content).toContain('lint-staged');
         });

         it('returns <pm> lint when lintStaged flag is false', () => {
            if (!preset.husky) return;
            const content = preset.husky({ lintStaged: false });
            expect(content).toContain('<pm>');
            expect(content).toContain('lint');
         });
      });
   }
});

describe('built-in preset lintStaged()', () => {
   for (const preset of FMT_PRESETS) {
      describe(preset.name, () => {
         it('returns valid JSON with eslint fragment when stylelint is false', () => {
            if (!preset.lintStaged) return;
            const content = preset.lintStaged({ stylelint: false });
            const parsed = JSON.parse(content);
            expect(Object.keys(parsed).length).toBeGreaterThan(0);
         });

         it('returns valid JSON with more entries when stylelint is true', () => {
            if (!preset.lintStaged) return;
            if (!preset.lintStagedFragments?.stylelint) return;
            const withoutStylelint = JSON.parse(preset.lintStaged({ stylelint: false }));
            const withStylelint = JSON.parse(preset.lintStaged({ stylelint: true }));
            const keysWith = Object.keys(withStylelint);
            const keysWithout = Object.keys(withoutStylelint);
            expect(keysWith.length).toBeGreaterThanOrEqual(keysWithout.length);
         });
      });
   }
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bun run test --project unit -t "built-in preset husky"`
Expected: FAIL — presets don't have `husky` function yet

- [ ] **Step 3: 为每个内置 preset 添加 husky 和 lintStaged 函数**

对 `src/presets/fmt/web-vue.ts`、`web-react.ts`、`nest.ts`、`node.ts`、`electron-vue.ts`、`uniapp.ts` 每个 preset 对象，在 `lintStagedFragments` 字段后添加：

```typescript
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
```

每个文件顶部需要确认已导入 `composeLintStaged`。检查现有 import，如果没有则添加：

```typescript
import { composeLintStaged } from '../../core/shared';
```

注意 `lintStagedFragments` 变量名在不同 preset 中可能不同 — 使用该 preset 中已定义的实际变量名。例如 web-vue.ts 中可能是 `lintStagedFragments`，直接引用。

- [ ] **Step 4: 运行测试确认通过**

Run: `bun run test --project unit -t "built-in preset"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/presets/fmt/ tests/unit/presets/husky-lintstaged.test.ts
git commit -m "feat(presets): add husky and lintStaged functions to all built-in presets"
```

---

### Task 4: generateAllFmt 使用预设 lintStaged 函数

**Files:**
- Modify: `src/generators/fmt.ts:56-66`
- Modify: `tests/unit/generators/fmt.test.ts`

- [ ] **Step 1: 更新测试**

修改 `tests/unit/generators/fmt.test.ts`，将 `presetWithLintStaged` 改为使用新的 `lintStaged` 函数字段：

```typescript
const presetWithLintStaged: FmtPreset = {
   name: 'test-preset',
   description: 'Test',
   eslint: () => 'export default []\n',
   lintStagedFragments: {
      eslint: {
         '*.{ts,js}': ['eslint --fix', 'prettier --write'],
      },
   },
   lintStaged: ({ stylelint }) => {
      const fragments: Record<string, Record<string, string[]>> = {
         eslint: {
            '*.{ts,js}': ['eslint --fix', 'prettier --write'],
         },
      };
      if (stylelint) {
         fragments.stylelint = {
            '*.{css,scss}': ['stylelint --fix'],
         };
      }
      return JSON.stringify(fragments, null, 2) + '\n';
   },
};
```

同时新增测试用例验证新路径：

```typescript
it('generates .lintstagedrc.json using lintStaged function when available', () => {
   tmpDir = createTempDir();

   const result = generateAllFmt(presetWithLintStaged, {
      ...baseOpts,
      cwd: tmpDir,
      lintStaged: true,
   });

   const filePath = path.join(tmpDir, '.lintstagedrc.json');
   expect(fs.existsSync(filePath)).toBe(true);
   expect(result.created).toContain('.lintstagedrc.json');

   const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
   expect(content['*.{ts,js}']).toEqual(['eslint --fix', 'prettier --write']);
});
```

- [ ] **Step 2: 运行测试确认现有测试通过（未改逻辑前）**

Run: `bun run test --project unit -t "generateAllFmt"`
Expected: PASS（现有测试仍用旧路径）

- [ ] **Step 3: 修改 generateAllFmt**

在 `src/generators/fmt.ts` 中，替换 lint-staged 生成逻辑：

```typescript
// 替换 import 中的 composeLintStaged
import { CONFIG_GETTERS } from '../core/shared';
```

替换 `generateAllFmt` 中的 lint-staged 块：

```typescript
if (opts.lintStaged) {
   const content = preset.lintStaged
      ? preset.lintStaged({ stylelint: opts.stylelint })
      : preset.lintStagedFragments
         ? JSON.stringify(composeLintStaged(preset.lintStagedFragments, { stylelint: opts.stylelint }), null, 2) + '\n'
         : undefined;

   if (content) {
      const action = generateConfigFile(preset, '.lintstagedrc.json', content, opts);
      if (action === 'created') result.created.push('.lintstagedrc.json');
      else if (action === 'overwritten') result.overwritten.push('.lintstagedrc.json');
      else if (action === 'skipped') result.skipped.push('.lintstagedrc.json');
   }
}
```

注意：保留 `composeLintStaged` 的 import 以支持 `lintStagedFragments` 回退路径。

- [ ] **Step 4: 运行测试确认通过**

Run: `bun run test --project unit -t "generateAllFmt"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/generators/fmt.ts tests/unit/generators/fmt.test.ts
git commit -m "refactor(generators): use preset lintStaged function in generateAllFmt"
```

---

### Task 5: initHusky 参数化 + 标签替换

**Files:**
- Modify: `src/commands/fmt.ts:491-548`

- [ ] **Step 1: 重构 initHusky 签名和内部逻辑**

替换 `src/commands/fmt.ts` 中的 `initHusky` 函数（第 490-548 行）：

```typescript
/** Initialize husky: inject init script, execute once, then write pre-commit hook */
async function initHusky(
   cwd: string,
   pm: PackageManager,
   opts: GenerateOptions,
   hookContent?: string,
): Promise<void> {
   const pkgPath = path.join(cwd, 'package.json');
   const pkg = readJson<Record<string, unknown>>(pkgPath);
   if (!pkg) {
      logger.warn('package.json not found, skipping husky setup');
      return;
   }

   const isYarn = pm === 'yarn';
   const initScriptName = isYarn ? 'postinstall' : 'prepare';
   const prefix = getRunPrefix(pm);

   // Resolve hook template with tag replacement
   const template = hookContent ?? (
      opts.lintStaged ? '<pmx> lint-staged\n' : '<pm> lint\n'
   );
   const resolvedHook = template
      .replace(/<pmx>/g, getExecPrefix(pm))
      .replace(/<pm>/g, prefix);

   const huskyDir = path.join(cwd, '.husky');
   const preCommitPath = path.join(huskyDir, 'pre-commit');

   if (opts.dryRun) {
      logger.log(`[dry-run] Would create .husky/pre-commit with: ${resolvedHook.trim()}`);
      logger.log(`[dry-run] Would inject "${initScriptName}": "husky" script`);
      logger.log(`[dry-run] Would run ${prefix} ${initScriptName}`);
      return;
   }

   // 1. Inject init script into package.json
   const scripts = (pkg.scripts ?? {}) as Record<string, string>;
   if (scripts[initScriptName] !== undefined && !opts.force) {
      logger.log(`Skipped script "${initScriptName}" (already exists)`);
   } else {
      scripts[initScriptName] = 'husky';
      pkg.scripts = scripts;
      writeJson(pkgPath, pkg);
      logger.log(`Injected "${initScriptName}" script for husky`);
   }

   // 2. Execute init script (husky creates .husky/ dir with default pre-commit)
   logger.log(`Running ${prefix} ${initScriptName} to initialize git hooks...`);
   try {
      const args = isYarn ? ['postinstall'] : ['run', initScriptName];
      const { exitCode } = await execFileNoThrow(pm, args, { cwd });
      if (exitCode === 0) {
         logger.success('Husky initialized successfully');
      } else {
         logger.warn(`Husky init script exited with code ${exitCode}`);
      }
   } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Husky init failed: ${message}. You can run "${prefix} ${initScriptName}" manually.`);
   }

   // 3. Overwrite .husky/pre-commit with correct content (replaces husky's default "bun test")
   if (fileExists(preCommitPath) && !opts.force) {
      logger.log('Skipped .husky/pre-commit (already exists)');
   } else {
      ensureDir(huskyDir);
      writeFile(preCommitPath, resolvedHook);
      fs.chmodSync(preCommitPath, 0o755);
   }
}
```

关键变化：
- 新增 `hookContent?: string` 参数
- 使用 `<pm>`/`<pmx>` 标签替换而非硬编码 `getRunPrefix`
- 调整执行顺序：先注入 script → 执行 init → 再写 pre-commit（覆盖 husky 默认内容）
- 需要在文件顶部 import 中添加 `getExecPrefix`：`import { ..., getExecPrefix } from '../utils/deps';`

- [ ] **Step 2: 更新 executeBuiltinPath 中的 initHusky 调用**

在 `executeBuiltinPath` 函数中，将所有 `initHusky(cwd, pm, opts)` 调用改为：

```typescript
await initHusky(cwd, pm, opts, preset.husky?.({ lintStaged: opts.lintStaged }));
```

共有 3 处调用（第 318、326、360 行附近），都需要改。

- [ ] **Step 3: 运行类型检查**

Run: `bun run type:check`
Expected: PASS

- [ ] **Step 4: 运行现有测试**

Run: `bun run test --project unit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/fmt.ts
git commit -m "refactor(fmt): parameterize initHusky with tag-based hook content"
```

---

### Task 6: materializeFmtPreset 固化 husky 和 lint-staged

**Files:**
- Modify: `src/core/local-preset.ts:80-109`
- Test: `tests/unit/core/local-preset.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/unit/core/local-preset.test.ts` 的 `materializeFmtPreset` describe 块中添加：

```typescript
it('materializes .lintstagedrc.json when preset has lintStaged function', () => {
   const presetWithLintStagedFn: FmtPreset = {
      name: 'test-lint-staged',
      description: 'Test',
      eslint: () => 'export default []\n',
      lintStaged: () => JSON.stringify({ '*.{ts}': ['eslint --fix'] }, null, 2) + '\n',
   };
   tmpDir = createTempDir();

   materializeFmtPreset('test-lint-staged', presetWithLintStagedFn, {
      ...baseOpts,
      cwd: tmpDir,
   });

   const presetDir = getLocalPresetDir('fmt', 'test-lint-staged');
   expect(fs.existsSync(path.join(presetDir, '.lintstagedrc.json'))).toBe(true);
   const content = JSON.parse(fs.readFileSync(path.join(presetDir, '.lintstagedrc.json'), 'utf-8'));
   expect(content['*.{ts}']).toEqual(['eslint --fix']);
});

it('materializes .husky/pre-commit when preset has husky function', () => {
   const presetWithHusky: FmtPreset = {
      name: 'test-husky',
      description: 'Test',
      eslint: () => 'export default []\n',
      husky: () => '<pmx> lint-staged\n',
   };
   tmpDir = createTempDir();

   materializeFmtPreset('test-husky', presetWithHusky, {
      ...baseOpts,
      cwd: tmpDir,
   });

   const presetDir = getLocalPresetDir('fmt', 'test-husky');
   expect(fs.existsSync(path.join(presetDir, '.husky'))).toBe(true);
   expect(fs.existsSync(path.join(presetDir, '.husky', 'pre-commit'))).toBe(true);
   expect(fs.readFileSync(path.join(presetDir, '.husky', 'pre-commit'), 'utf-8')).toBe('<pmx> lint-staged\n');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bun run test --project unit -t "materializes .lintstagedrc.json"`
Expected: FAIL

- [ ] **Step 3: 修改 materializeFmtPreset**

在 `src/core/local-preset.ts` 的 `materializeFmtPreset` 函数中，在 `writeJson(path.join(presetDir, 'package.json'), templatePkg);` 之后、`logger.log` 之前添加：

```typescript
// Materialize lint-staged config (full version with all fragments)
if (preset.lintStaged) {
   const lintStagedContent = preset.lintStaged({ stylelint: true });
   writeFile(path.join(presetDir, '.lintstagedrc.json'), lintStagedContent);
}

// Materialize husky hook (full version with lint-staged)
if (preset.husky) {
   const hookContent = preset.husky({ lintStaged: true });
   const huskyDir = path.join(presetDir, '.husky');
   ensureDir(huskyDir);
   writeFile(path.join(huskyDir, 'pre-commit'), hookContent);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `bun run test --project unit -t "materializeFmtPreset"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/local-preset.ts tests/unit/core/local-preset.test.ts
git commit -m "feat(local-preset): materialize husky hooks and lint-staged config"
```

---

### Task 7: applyLocalFmtPreset 支持 .husky/ 和 .lintstagedrc.json

**Files:**
- Modify: `src/core/local-preset.ts:157-233`（`applyLocalFmtPreset` 函数）
- Test: `tests/unit/core/local-preset.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/unit/core/local-preset.test.ts` 中添加新的 describe 块：

```typescript
describe('applyLocalFmtPreset — husky and lint-staged', () => {
   let tmpDir: string;
   let presetDir: string;

   afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      resetLocalPreset('fmt', 'test-husky-ls');
   });

   function setupPresetWithHuskyAndLintStaged(): string {
      presetDir = getLocalPresetDir('fmt', 'test-husky-ls');
      fs.mkdirSync(presetDir, { recursive: true });
      fs.mkdirSync(path.join(presetDir, '.husky'), { recursive: true });
      fs.writeFileSync(path.join(presetDir, '.husky', 'pre-commit'), '<pmx> lint-staged\n');
      fs.writeFileSync(path.join(presetDir, '.lintstagedrc.json'), JSON.stringify({ '*.{ts}': ['eslint --fix'] }));
      fs.writeFileSync(path.join(presetDir, 'package.json'), JSON.stringify({ scripts: {} }));
      fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ name: 'test', scripts: {} }));
      return presetDir;
   }

   it('copies .lintstagedrc.json when lintStaged flag is true', () => {
      tmpDir = createTempDir();
      setupPresetWithHuskyAndLintStaged();

      const result = applyLocalFmtPreset(tmpDir, 'test-husky-ls', {
         ...baseOpts,
         cwd: tmpDir,
         lintStaged: true,
      });

      expect(fs.existsSync(path.join(tmpDir, '.lintstagedrc.json'))).toBe(true);
      expect(result.created).toContain('.lintstagedrc.json');
   });

   it('skips .lintstagedrc.json when lintStaged flag is false', () => {
      tmpDir = createTempDir();
      setupPresetWithHuskyAndLintStaged();

      const result = applyLocalFmtPreset(tmpDir, 'test-husky-ls', {
         ...baseOpts,
         cwd: tmpDir,
         lintStaged: false,
      });

      expect(fs.existsSync(path.join(tmpDir, '.lintstagedrc.json'))).toBe(false);
      expect(result.created).not.toContain('.lintstagedrc.json');
   });

   it('copies .husky/pre-commit with tag replacement', () => {
      tmpDir = createTempDir();
      setupPresetWithHuskyAndLintStaged();

      applyLocalFmtPreset(tmpDir, 'test-husky-ls', {
         ...baseOpts,
         cwd: tmpDir,
         husky: true,
         lockfile: 'bun.lock',
      });

      expect(fs.existsSync(path.join(tmpDir, '.husky', 'pre-commit'))).toBe(true);
      // Tags are NOT replaced in applyLocalFmtPreset — they're passed to initHusky for replacement
      const content = fs.readFileSync(path.join(tmpDir, '.husky', 'pre-commit'), 'utf-8');
      expect(content).toContain('lint-staged');
   });

   it('strips lint-staged from pre-commit when lintStaged flag is false', () => {
      tmpDir = createTempDir();
      setupPresetWithHuskyAndLintStaged();

      applyLocalFmtPreset(tmpDir, 'test-husky-ls', {
         ...baseOpts,
         cwd: tmpDir,
         husky: true,
         lintStaged: false,
      });

      const content = fs.readFileSync(path.join(tmpDir, '.husky', 'pre-commit'), 'utf-8');
      expect(content).not.toContain('lint-staged');
      expect(content).toContain('<pm>');
      expect(content).toContain('lint');
   });
});
```

注意：`cwd` 变量名需要修正为 `tmpDir`。上面测试代码中的 `cwd` 应全部替换为项目工作目录引用。

- [ ] **Step 2: 运行测试确认失败**

Run: `bun run test --project unit -t "applyLocalFmtPreset — husky"`
Expected: FAIL

- [ ] **Step 3: 修改 applyLocalFmtPreset**

在 `src/core/local-preset.ts` 的 `applyLocalFmtPreset` 函数中，在文件复制循环之后、templatePkg 读取之前，添加 husky 和 lint-staged 处理：

```typescript
// Handle .lintstagedrc.json
const lintStagedFile = '.lintstagedrc.json';
const lintStagedSrc = path.join(presetDir, lintStagedFile);
if (opts.lintStaged && fileExists(lintStagedSrc)) {
   const destPath = path.join(cwd, lintStagedFile);
   const exists = fileExists(destPath);

   if (exists && !opts.force) {
      result.skipped.push(lintStagedFile);
   } else if (!opts.dryRun) {
      const content = readFile(lintStagedSrc);
      if (content !== null) {
         writeFile(destPath, content);
         (exists ? result.overwritten : result.created).push(lintStagedFile);
      }
   }
}

// Handle .husky/ directory
const huskySrcDir = path.join(presetDir, '.husky');
if (opts.husky && fileExists(huskySrcDir)) {
   const huskyEntries = fs.readdirSync(huskySrcDir).filter(
      name => fs.statSync(path.join(huskySrcDir, name)).isFile(),
   );

   for (const filename of huskyEntries) {
      const srcPath = path.join(huskySrcDir, filename);
      const destPath = path.join(cwd, '.husky', filename);
      const exists = fileExists(destPath);

      if (exists && !opts.force) {
         result.skipped.push(`.husky/${filename}`);
         continue;
      }

      if (opts.dryRun) {
         (exists ? result.overwritten : result.created).push(`.husky/${filename}`);
         continue;
      }

      let content = readFile(srcPath);
      if (content !== null) {
         // Strip lint-staged from hook content if --lint-staged is not passed
         if (!opts.lintStaged) {
            content = content.replace(/<pmx>\s*lint-staged/g, '<pm> lint');
         }
         ensureDir(path.join(cwd, '.husky'));
         writeFile(destPath, content);
         fs.chmodSync(destPath, 0o755);
         (exists ? result.overwritten : result.created).push(`.husky/${filename}`);
      }
   }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `bun run test --project unit -t "applyLocalFmtPreset"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/local-preset.ts tests/unit/core/local-preset.test.ts
git commit -m "feat(local-preset): support .husky/ and .lintstagedrc.json in applyLocalFmtPreset"
```

---

### Task 8: executeLocalPath 传入 hookContent 给 initHusky

**Files:**
- Modify: `src/commands/fmt.ts:113-243`（`executeLocalPath` 函数）

- [ ] **Step 1: 修改 executeLocalPath 中的 initHusky 调用**

在 `executeLocalPath` 函数中，需要从固化预设目录读取 `.husky/pre-commit` 内容并传给 `initHusky`。

在函数中添加辅助函数读取 hook 内容：

```typescript
// 在 executeLocalPath 中，opts 构建之后、applyLocalFmtPreset 调用之前
const presetDir = getLocalPresetDir('fmt', presetName);
const hookTemplatePath = path.join(presetDir, '.husky', 'pre-commit');
const hookContent = fileExists(hookTemplatePath) ? readFile(hookTemplatePath) ?? undefined : undefined;
```

注意：`readFile` 已从 `../utils/fs` 导入（需确认在 import 中）。

然后将所有 `await initHusky(cwd, pm, opts)` 调用改为：

```typescript
await initHusky(cwd, pm, opts, hookContent);
```

`executeLocalPath` 中有 3 处 initHusky 调用需要更新。

注意 `getLocalPresetDir` 和 `readFile` 需要在 import 中确认存在。`getLocalPresetDir` 已在现有 import 中。`readFile` 需要从 `../utils/fs` import 中添加。

- [ ] **Step 2: 运行类型检查和测试**

Run: `bun run type:check && bun run test --project unit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/commands/fmt.ts
git commit -m "feat(fmt): pass hook content from local preset to initHusky"
```

---

### Task 9: 验收测试验证

**Files:** 无新增，运行现有验收测试

- [ ] **Step 1: Build**

Run: `bun run build`

- [ ] **Step 2: 运行与 husky/lint-staged 相关的验收测试**

Run: `bun run test --project acceptance -t "husky"`
Expected: PASS（如果现有测试存在的话）

Run: `bun run test --project acceptance -t "lint-staged"`
Expected: PASS（如果现有测试存在的话）

- [ ] **Step 3: 运行全量单元测试**

Run: `bun run test --project unit`
Expected: ALL PASS

- [ ] **Step 4: Commit（如有修复）**

如果有验收测试需要更新以适配新行为，在此提交修复。

```bash
git commit -m "test: update acceptance tests for husky/lint-staged preset-driven flow"
```
