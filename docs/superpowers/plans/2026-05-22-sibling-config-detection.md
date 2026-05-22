# Sibling Config File Detection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect flat config sibling files (e.g. `eslint.config.js` when generating `eslint.config.mjs`) and warn + skip instead of creating duplicate configs.

**Architecture:** Add `findConflictSibling()` helper and `CONFIG_FAMILY` map to `conflict-resolver.ts`. Extend `resolveConflict()` with a `cwd` parameter for sibling filesystem checks. Two integration points: built-in path via `resolveConflict()`, local preset path via direct `findConflictSibling()` call.

**Tech Stack:** TypeScript, Vitest, Node.js `fs`

---

### Task 1: Add `findConflictSibling()` helper and unit tests

**Files:**
- Create: no new files
- Modify: `src/core/conflict-resolver.ts:1-28`
- Test: `tests/unit/core/conflict-resolver.test.ts`

- [ ] **Step 1: Write failing tests for `findConflictSibling()`**

Add to `tests/unit/core/conflict-resolver.test.ts`:

```typescript
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findConflictSibling } from '../../../src/core/conflict-resolver';

describe('findConflictSibling', () => {
   const tmpDir = path.join(os.tmpdir(), 'sibling-test-' + process.pid);

   beforeAll(() => {
      fs.mkdirSync(tmpDir, { recursive: true });
   });

   afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   afterEach(() => {
      for (const f of fs.readdirSync(tmpDir)) {
         fs.unlinkSync(path.join(tmpDir, f));
      }
   });

   it('returns undefined when no siblings exist', () => {
      expect(findConflictSibling('eslint.config.mjs', tmpDir)).toBeUndefined();
   });

   it('returns undefined for files without a family mapping', () => {
      expect(findConflictSibling('.prettierrc', tmpDir)).toBeUndefined();
   });

   it('returns sibling filename when eslint.config.js exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.js'), '');
      expect(findConflictSibling('eslint.config.mjs', tmpDir)).toBe('eslint.config.js');
   });

   it('returns first found sibling when multiple siblings exist', () => {
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.cjs'), '');
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.ts'), '');
      const result = findConflictSibling('eslint.config.mjs', tmpDir);
      expect(result).toBeDefined();
      expect(['eslint.config.cjs', 'eslint.config.ts']).toContain(result);
   });

   it('detects stylelint config siblings', () => {
      fs.writeFileSync(path.join(tmpDir, 'stylelint.config.js'), '');
      expect(findConflictSibling('stylelint.config.mjs', tmpDir)).toBe('stylelint.config.js');
   });

   it('returns undefined when only the target file itself exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.mjs'), '');
      expect(findConflictSibling('eslint.config.mjs', tmpDir)).toBeUndefined();
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test --project unit -t findConflictSibling`
Expected: FAIL — `findConflictSibling` is not exported

- [ ] **Step 3: Implement `CONFIG_FAMILY` and `findConflictSibling()`**

Replace the entire content of `src/core/conflict-resolver.ts` with:

```typescript
import fs from 'node:fs';
import path from 'node:path';
import type { FmtPreset } from '../presets/types';

const CONFIG_FAMILY: Record<string, string[]> = {
   'eslint.config.mjs': ['eslint.config.js', 'eslint.config.cjs', 'eslint.config.ts'],
   'stylelint.config.mjs': ['stylelint.config.js', 'stylelint.config.cjs', 'stylelint.config.ts'],
};

/** Find a conflicting sibling file in the same config family */
export function findConflictSibling(filename: string, cwd: string): string | undefined {
   const siblings = CONFIG_FAMILY[filename];
   if (!siblings) return undefined;

   for (const sibling of siblings) {
      if (fs.existsSync(path.join(cwd, sibling))) {
         return sibling;
      }
   }

   return undefined;
}

/** Resolve what action to take when a file conflict occurs */
export function resolveConflict(
   filename: string,
   exists: boolean,
   preset: FmtPreset,
   forceFlag: boolean,
): 'create' | 'overwrite' | 'skip' {
   // Never overwrite list → always skip
   if (exists && preset.neverOverwrite?.includes(filename)) {
      return 'skip';
   }

   // Force overwrite list → always overwrite
   if (exists && preset.forceOverwrite?.includes(filename)) {
      return 'overwrite';
   }

   // File doesn't exist → create
   if (!exists) {
      return 'create';
   }

   // File exists + force flag → overwrite
   if (forceFlag) {
      return 'overwrite';
   }

   // File exists + no force → skip
   return 'skip';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test --project unit -t findConflictSibling`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/conflict-resolver.ts tests/unit/core/conflict-resolver.test.ts
git commit -m "feat(conflict): add findConflictSibling helper with CONFIG_FAMILY map"
```

---

### Task 2: Extend `resolveConflict()` with sibling detection

**Files:**
- Modify: `src/core/conflict-resolver.ts` (the `resolveConflict` function)
- Test: `tests/unit/core/conflict-resolver.test.ts`

- [ ] **Step 1: Write failing tests for sibling-aware `resolveConflict()`**

Add these imports at the top of the test file (after existing imports):

```typescript
// (already imported in Task 1: fs, os, path, findConflictSibling)
```

Add a new `describe` block after the existing `resolveConflict` tests:

```typescript
describe('resolveConflict with sibling detection', () => {
   const tmpDir = path.join(os.tmpdir(), 'resolve-sibling-' + process.pid);

   beforeAll(() => {
      fs.mkdirSync(tmpDir, { recursive: true });
   });

   afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   afterEach(() => {
      for (const f of fs.readdirSync(tmpDir)) {
         fs.unlinkSync(path.join(tmpDir, f));
      }
   });

   it('returns "skip" when sibling exists and file does not', () => {
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.js'), '');
      expect(resolveConflict('eslint.config.mjs', false, basePreset, false, tmpDir)).toBe('skip');
   });

   it('returns "create" when no sibling exists and file does not', () => {
      expect(resolveConflict('eslint.config.mjs', false, basePreset, false, tmpDir)).toBe('create');
   });

   it('returns "create" when sibling exists but --force is set', () => {
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.js'), '');
      expect(resolveConflict('eslint.config.mjs', false, basePreset, true, tmpDir)).toBe('create');
   });

   it('returns "skip" for neverOverwrite even when sibling does not exist', () => {
      const preset: FmtPreset = {
         ...basePreset,
         neverOverwrite: ['eslint.config.mjs'],
      };
      expect(resolveConflict('eslint.config.mjs', true, preset, true, tmpDir)).toBe('skip');
   });

   it('returns "overwrite" for forceOverwrite even when sibling exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.js'), '');
      const preset: FmtPreset = {
         ...basePreset,
         forceOverwrite: ['eslint.config.mjs'],
      };
      expect(resolveConflict('eslint.config.mjs', true, preset, false, tmpDir)).toBe('overwrite');
   });

   it('returns "skip" for stylelint sibling', () => {
      fs.writeFileSync(path.join(tmpDir, 'stylelint.config.ts'), '');
      expect(resolveConflict('stylelint.config.mjs', false, basePreset, false, tmpDir)).toBe('skip');
   });

   it('ignores siblings for files not in CONFIG_FAMILY', () => {
      expect(resolveConflict('.prettierrc', false, basePreset, false, tmpDir)).toBe('create');
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test --project unit -t "resolveConflict with sibling"`
Expected: FAIL — `resolveConflict` does not accept 5 arguments (the `cwd` tests will fail because sibling detection doesn't exist yet)

- [ ] **Step 3: Implement sibling detection in `resolveConflict()`**

Replace the `resolveConflict` function in `src/core/conflict-resolver.ts`:

```typescript
/** Resolve what action to take when a file conflict occurs */
export function resolveConflict(
   filename: string,
   exists: boolean,
   preset: FmtPreset,
   forceFlag: boolean,
   cwd?: string,
): 'create' | 'overwrite' | 'skip' {
   // Never overwrite list → always skip
   if (exists && preset.neverOverwrite?.includes(filename)) {
      return 'skip';
   }

   // Force overwrite list → always overwrite
   if (exists && preset.forceOverwrite?.includes(filename)) {
      return 'overwrite';
   }

   // Sibling exists + file doesn't exist + no force → skip
   if (!exists && !forceFlag && cwd && findConflictSibling(filename, cwd)) {
      return 'skip';
   }

   // File doesn't exist → create
   if (!exists) {
      return 'create';
   }

   // File exists + force flag → overwrite
   if (forceFlag) {
      return 'overwrite';
   }

   // File exists + no force → skip
   return 'skip';
}
```

- [ ] **Step 4: Run ALL conflict-resolver tests**

Run: `bun run test --project unit tests/unit/core/conflict-resolver.test.ts`
Expected: ALL PASS (both old and new tests)

- [ ] **Step 5: Run full unit test suite to confirm no regressions**

Run: `bun run test --project unit`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/core/conflict-resolver.ts tests/unit/core/conflict-resolver.test.ts
git commit -m "feat(conflict): extend resolveConflict with sibling detection"
```

---

### Task 3: Update built-in path to log sibling warnings

**Files:**
- Modify: `src/generators/fmt.ts:3-30` (the `generateConfigFile` function)
- Import: `findConflictSibling` from `../core/conflict-resolver`

- [ ] **Step 1: Update `generateConfigFile()` in `src/generators/fmt.ts`**

Change the import line from:

```typescript
import { resolveConflict } from '../core/conflict-resolver';
```

to:

```typescript
import { findConflictSibling, resolveConflict } from '../core/conflict-resolver';
```

Replace the `generateConfigFile` function:

```typescript
function generateConfigFile(
   preset: FmtPreset,
   filename: string,
   content: string,
   opts: GenerateOptions,
): FileAction | null {
   const filepath = path.join(opts.cwd, filename);
   const exists = fileExists(filepath);
   const action = resolveConflict(filename, exists, preset, opts.force, opts.cwd);

   if (action === 'skip') {
      if (!exists) {
         const sibling = findConflictSibling(filename, opts.cwd);
         if (sibling) {
            logger.warn(`${filename} not generated: ${sibling} already exists`);
         }
      }
      return 'skipped';
   }

   if (opts.dryRun) return exists ? 'overwritten' : 'created';

   const resolved = opts.lockfile
      ? content.replace(/<lockfile>/g, opts.lockfile)
      : content
           .replace(/,?\s*'<lockfile>'/g, '')
           .replace(/'<lockfile>',?\s*/g, '')
           .replace(/<lockfile>\n?/g, '');

   try {
      writeFile(filepath, resolved);
   } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to write ${filename}: ${message}`);
      return null;
   }

   return exists ? 'overwritten' : 'created';
}
```

- [ ] **Step 2: Run unit tests**

Run: `bun run test --project unit`
Expected: ALL PASS

- [ ] **Step 3: Run type check**

Run: `bun run type:check`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/generators/fmt.ts
git commit -m "feat(fmt): log sibling warning in built-in generateConfigFile"
```

---

### Task 4: Update local preset path for sibling detection

**Files:**
- Modify: `src/core/local-preset.ts:211-233` (the per-file loop in `applyLocalFmtPreset`)
- Import: `findConflictSibling` from `./conflict-resolver`

- [ ] **Step 1: Add import**

Add to the imports at the top of `src/core/local-preset.ts`:

```typescript
import { findConflictSibling } from './conflict-resolver';
```

- [ ] **Step 2: Add sibling check in the per-file loop**

In `applyLocalFmtPreset()`, after the tsconfig check (line 222) and before the `const destPath` line (line 224), insert a sibling check block. The resulting code from the filter checks through the sibling check should look like:

```typescript
      if (!opts.stylelint && STYLELINT_FILES.has(filename)) continue;
      if (!opts.editorconfig && filename === EDITORCONFIG_FILE) continue;
      if (!opts.cspell && filename === CSPELL_FILE) continue;
      if (!opts.lintStaged && filename === '.lintstagedrc.json') continue;
      if (projectHasTsconfig && isTsconfigFile(filename)) {
         result.skipped.push(filename);
         if (opts.dryRun) {
            logger.log(`[dry-run] Skipped ${filename} (project already has tsconfig)`);
         }
         continue;
      }

      const destPath = path.join(cwd, filename);
      const exists = fileExists(destPath);

      // Sibling config detection
      if (!exists && !opts.force) {
         const sibling = findConflictSibling(filename, cwd);
         if (sibling) {
            result.skipped.push(filename);
            logger.warn(`${filename} not generated: ${sibling} already exists`);
            continue;
         }
      }

      if (exists && !opts.force) {
         result.skipped.push(filename);
         if (opts.dryRun) {
            logger.log(`[dry-run] Skipped ${filename} (already exists)`);
         }
         continue;
      }
```

- [ ] **Step 3: Run unit tests**

Run: `bun run test --project unit`
Expected: ALL PASS

- [ ] **Step 4: Run type check**

Run: `bun run type:check`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/core/local-preset.ts
git commit -m "feat(fmt): add sibling detection to local preset path"
```

---

### Task 5: Add acceptance tests for sibling detection

**Files:**
- Modify: `tests/acceptance/acceptance.spec.ts`

- [ ] **Step 1: Add acceptance test scenarios**

Add the following two `describe` blocks at the end of the main `describe('Acceptance: lux CLI', ...)` block, before the closing `});`:

```typescript
   // ─── Scenario 23: Sibling config blocks generation ─────────────────
   describe('Scenario: sibling flat config file blocks generation', () => {
      it('skips eslint.config.mjs when eslint.config.js already exists (built-in path)', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'sibling-test',
                  version: '1.0.0',
                  scripts: {},
               }),
               'eslint.config.js': '// existing flat config',
            },
         });

         const result = ctx.run(['fmt', 'web-vue', '--no-install']);
         expect(result.exitCode).toBe(0);

         // eslint.config.mjs NOT generated — sibling exists
         expect(ctx.fileExists('eslint.config.mjs')).toBe(false);
         // The existing file is untouched
         expect(ctx.readFile('eslint.config.js')).toBe('// existing flat config');

         // Warning message printed
         expect(result.stderr).toContain('eslint.config.mjs not generated');
         expect(result.stderr).toContain('eslint.config.js already exists');

         // Other files still generated normally
         expect(ctx.fileExists('.prettierrc')).toBe(true);
         expect(ctx.fileExists('.prettierignore')).toBe(true);
      });

      it('skips stylelint.config.mjs when stylelint.config.ts already exists', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'sibling-stylelint-test',
                  version: '1.0.0',
                  scripts: {},
               }),
               'stylelint.config.ts': '// existing stylelint',
            },
         });

         const result = ctx.run(['fmt', 'web-vue', '--no-install', '--stylelint']);
         expect(result.exitCode).toBe(0);

         expect(ctx.fileExists('stylelint.config.mjs')).toBe(false);
         expect(ctx.fileExists('.stylelintignore')).toBe(true);
      });

      it('--force overrides sibling detection and generates the file', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'sibling-force-test',
                  version: '1.0.0',
                  scripts: {},
               }),
               'eslint.config.js': '// existing flat config',
            },
         });

         const result = ctx.run(['fmt', 'web-vue', '--no-install', '--force']);
         expect(result.exitCode).toBe(0);

         // --force overrides sibling: file IS generated
         expect(ctx.fileExists('eslint.config.mjs')).toBe(true);
      });

      it('skips eslint.config.mjs when sibling exists (local preset path)', async () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'sibling-local-test',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         // First run — materializes local preset
         ctx.run(['fmt', 'web-vue', '--no-install']);

         // Delete generated eslint config and add a sibling
         const fs = await import('node:fs');
         const nodePath = await import('node:path');
         fs.unlinkSync(nodePath.join(ctx.tmpDir, 'eslint.config.mjs'));
         fs.writeFileSync(nodePath.join(ctx.tmpDir, 'eslint.config.js'), '// sibling from user');

         // Second run — uses local preset path
         const result = ctx.run(['fmt', 'web-vue', '--no-install', '--force']);
         expect(result.exitCode).toBe(0);
         expect(result.stdout.toLowerCase()).toContain('using local custom preset');

         // eslint.config.mjs NOT generated
         expect(ctx.fileExists('eslint.config.mjs')).toBe(false);
         expect(result.stderr).toContain('eslint.config.mjs not generated');
      });
   });
```

- [ ] **Step 2: Build the project**

Run: `bun run build`
Expected: build succeeds

- [ ] **Step 3: Run only the new acceptance tests**

Run: `bun run test --project acceptance -t "sibling"`
Expected: ALL PASS

- [ ] **Step 4: Run full unit tests to confirm no regressions**

Run: `bun run test --project unit`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add tests/acceptance/acceptance.spec.ts
git commit -m "test: add acceptance tests for sibling config detection"
```

---

### Task 6: Build and manual E2E verification

**Files:**
- Manual test directory: `C:\Users\Tu1231\Desktop\temptest\`

- [ ] **Step 1: Build the project**

Run: `bun run build`

- [ ] **Step 2: Verify lint + type check pass**

Run: `bun run eslint && bun run type:check`
Expected: no errors

- [ ] **Step 3: Manual E2E test — sibling blocks generation**

In `C:\Users\Tu1231\Desktop\temptest\`:
1. Create `package.json` with `{ "name": "e2e-sibling", "scripts": {} }`
2. Create `eslint.config.js` with `export default []`
3. Run: `node D:\MyProject\lux\.claude\worktrees\fix-similar-guy-file-warn\dist\index.js fmt web-vue --no-install`
4. Verify: `eslint.config.mjs` is NOT created, warning printed
5. Verify: `.prettierrc` and `.prettierignore` ARE created
6. Run: `node ... dist\index.js fmt web-vue --no-install --force`
7. Verify: `eslint.config.mjs` IS created (--force overrides)

- [ ] **Step 4: Clean up temptest**

Remove all test files from `C:\Users\Tu1231\Desktop\temptest\`.
