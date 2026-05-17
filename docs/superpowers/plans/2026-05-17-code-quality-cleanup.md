# Code Quality Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate code duplication and fix pattern inconsistencies across commands/, generators/, core/, and utils/ without changing any external behavior.

**Architecture:** Extract shared constants and functions into a new `core/shared.ts` module. Update all consumers to import from it. Fix type safety issues, path construction inconsistencies, and logger bypass. Add `readFile` utility to `utils/fs.ts` for non-JSON file reads.

**Tech Stack:** TypeScript (ESM), Node.js 18+, bun, vitest

---

### Task 1: Add `readFile` to `utils/fs.ts`

**Files:**
- Modify: `src/utils/fs.ts`

- [ ] **Step 1: Add readFile function**

Add after `writeJson` function (after line 40):

```typescript
/** Read file content as string, return null if not exists. Logs IO errors. */
export function readFile(filePath: string): string | null {
   try {
      return fs.readFileSync(filePath, 'utf-8');
   } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to read ${path.basename(filePath)}: ${message}`);
      return null;
   }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/fs.ts
git commit -m "feat(fs): add readFile utility for non-JSON file reads"
```

---

### Task 2: Create `core/shared.ts`

**Files:**
- Create: `src/core/shared.ts`

- [ ] **Step 1: Write the shared module**

Create `src/core/shared.ts`:

```typescript
import type { FmtPreset } from '../presets/types';

// --- VSCode stylelint constants ---

export const STYLELINT_SETTINGS_PREFIXES = [
   'stylelint.',
   'css.validate',
   'less.validate',
   'scss.validate',
];

export const STYLELINT_EXTENSION = 'stylelint.vscode-stylelint';

// --- Dependency sets ---

export const STYLELINT_DEPS = new Set([
   'stylelint',
   'stylelint-config-standard-scss',
   'stylelint-order',
   'stylelint-scss',
   '@stylistic/stylelint-plugin',
   'postcss-html',
   'postcss-scss',
]);

export const HUSKY_DEPS = new Set(['husky']);

export const LINTSTAGED_DEPS = new Set(['lint-staged']);

// --- Config filename constants ---

export const STYLELINT_FILES = new Set(['stylelint.config.mjs', '.stylelintignore']);

export const EDITORCONFIG_FILE = '.editorconfig';

export const CSPELL_FILE = 'cspell.json';

export const LINTSTAGED_FILE = '.lintstagedrc.json';

// --- Config file getters ---

export const CONFIG_GETTERS: ReadonlyArray<{
   filename: string;
   getContent: (preset: FmtPreset) => string | undefined;
}> = [
   { filename: 'eslint.config.mjs', getContent: p => p.eslint?.() },
   { filename: '.prettierrc', getContent: p => p.prettier?.() },
   { filename: '.prettierignore', getContent: p => p.prettierIgnore?.() },
   { filename: 'stylelint.config.mjs', getContent: p => p.stylelint?.() },
   { filename: '.stylelintignore', getContent: p => p.stylelintIgnore?.() },
   { filename: 'cspell.json', getContent: p => p.cspell?.() },
   { filename: '.editorconfig', getContent: p => p.editorconfig?.() },
   { filename: '.lintstagedrc.json', getContent: p => p.lintStaged?.() },
];

// --- Shared functions ---

export function filterStylelintSettings(settings: Record<string, unknown>): Record<string, unknown> {
   const filtered = Object.fromEntries(
      Object.entries(settings).filter(
         ([key]) => !STYLELINT_SETTINGS_PREFIXES.some(prefix => key.startsWith(prefix)),
      ),
   );

   if (
      typeof filtered['editor.codeActionsOnSave'] === 'object' &&
      filtered['editor.codeActionsOnSave'] !== null
   ) {
      const actions = { ...(filtered['editor.codeActionsOnSave'] as Record<string, unknown>) };
      delete actions['source.fixAll.stylelint'];
      filtered['editor.codeActionsOnSave'] = actions;
   }

   return filtered;
}

export function isNotStylelintDep(dep: string): boolean {
   if (dep.includes('stylelint')) return false;
   if (dep === 'postcss-html' || dep === 'postcss-scss') return false;
   return true;
}

export function isNotEditorconfigDep(dep: string): boolean {
   return !dep.includes('editorconfig');
}

export function isNotCspellDep(dep: string): boolean {
   return dep !== 'cspell';
}

export function isNotHuskyDep(dep: string): boolean {
   return dep !== 'husky';
}

export function isNotLintStagedDep(dep: string): boolean {
   return dep !== 'lint-staged';
}
```

- [ ] **Step 2: Verify build**

Run: `bun run build`
Expected: Build succeeds (new file with no consumers yet)

- [ ] **Step 3: Commit**

```bash
git add src/core/shared.ts
git commit -m "refactor: create core/shared.ts with extracted constants and functions"
```

---

### Task 3: Update `generators/fmt.ts`

**Files:**
- Modify: `src/generators/fmt.ts`

- [ ] **Step 1: Replace CONFIG_FILES with shared import**

Replace lines 1-20 (imports + CONFIG_FILES) with:

```typescript
import path from 'node:path';
import type { FmtPreset, GenerateOptions, GenerateResult } from '../presets/types';
import { resolveConflict } from '../core/conflict-resolver';
import { writeFile, fileExists } from '../utils/fs';
import { logger } from '../utils/logger';
import { CONFIG_GETTERS } from '../core/shared';
```

Then on line 65, change `CONFIG_FILES` to `CONFIG_GETTERS`:

```typescript
for (const { filename, getContent } of CONFIG_GETTERS) {
```

- [ ] **Step 2: Verify build**

Run: `bun run build`
Expected: Success

- [ ] **Step 3: Commit**

```bash
git add src/generators/fmt.ts
git commit -m "refactor(fmt-gen): import CONFIG_GETTERS from shared"
```

---

### Task 4: Update `generators/vscode.ts`

**Files:**
- Modify: `src/generators/vscode.ts`

- [ ] **Step 1: Replace imports and remove local constants/functions**

Replace entire file content with:

```typescript
import path from 'node:path';
import type { VscodePreset, GenerateOptions, GenerateResult } from '../presets/types';
import { mergeVscodeSettings } from '../core/merge-settings';
import { writeJson, readJson, fileExists, writeFile } from '../utils/fs';
import { logger } from '../utils/logger';
import { STYLELINT_SETTINGS_PREFIXES, STYLELINT_EXTENSION, filterStylelintSettings } from '../core/shared';

/**
 * Generate .vscode/settings.json from a vscode preset.
 * Always uses layered merge with backup.
 */
export function generateVscodeSettings(
   preset: VscodePreset,
   opts: GenerateOptions,
): 'created' | 'overwritten' | null {
   const settingsPath = path.join(opts.cwd, '.vscode', 'settings.json');

   if (opts.dryRun) {
      const existingSettings = readJson<Record<string, unknown>>(settingsPath);
      return existingSettings ? 'overwritten' : 'created';
   }

   const rawSettings = preset.settings();
   const presetSettings = opts.noStylelint ? filterStylelintSettings(rawSettings) : rawSettings;
   const existingSettings = readJson<Record<string, unknown>>(settingsPath);

   if (existingSettings) {
      const backupPath = settingsPath + '.bak';
      if (!fileExists(backupPath)) {
         try {
            writeFile(backupPath, JSON.stringify(existingSettings, null, 2) + '\n');
            logger.log('Backed up .vscode/settings.json → settings.json.bak');
         } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn(
               `Failed to backup .vscode/settings.json: ${message}. Continuing without backup.`,
            );
         }
      }

      try {
         const merged = mergeVscodeSettings(presetSettings, existingSettings);
         writeJson(settingsPath, merged);
      } catch (error) {
         const msg = error instanceof Error ? error.message : String(error);
         logger.error(`Failed to write .vscode/settings.json: ${msg}`);
         return null;
      }
      return 'overwritten';
   }

   try {
      writeJson(settingsPath, presetSettings);
   } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to write .vscode/settings.json: ${msg}`);
      return null;
   }
   return 'created';
}

/**
 * Generate .vscode/extensions.json from a vscode preset.
 */
export function generateVscodeExtensions(
   preset: VscodePreset,
   opts: GenerateOptions,
): 'created' | null {
   if (opts.dryRun) return 'created';

   const extensions = opts.noStylelint
      ? preset.extensions().filter(ext => ext !== STYLELINT_EXTENSION)
      : preset.extensions();

   try {
      writeJson(path.join(opts.cwd, '.vscode', 'extensions.json'), { recommendations: extensions });
   } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to write .vscode/extensions.json: ${msg}`);
      return null;
   }
   return 'created';
}

/**
 * Generate all vscode config files for a preset.
 * Returns structured result for the caller to format output.
 */
export function generateAllVscode(preset: VscodePreset, opts: GenerateOptions): GenerateResult {
   const result: GenerateResult = { created: [], overwritten: [], skipped: [] };

   const settingsAction = generateVscodeSettings(preset, opts);
   if (settingsAction === 'created') result.created.push('.vscode/settings.json');
   else if (settingsAction === 'overwritten') result.overwritten.push('.vscode/settings.json');

   const extAction = generateVscodeExtensions(preset, opts);
   if (extAction === 'created') result.created.push('.vscode/extensions.json');

   return result;
}
```

Key changes:
- Added `import path from 'node:path'`
- Imported `STYLELINT_SETTINGS_PREFIXES`, `STYLELINT_EXTENSION`, `filterStylelintSettings` from shared
- Removed local constants and `filterStylelintSettings` function
- Path on line 22: `` `${opts.cwd}/.vscode/settings.json` `` → `path.join(opts.cwd, '.vscode', 'settings.json')`
- Path on line 34: `` `${settingsPath}.bak` `` → `settingsPath + '.bak'`
- Path on line 82: `` `${opts.cwd}/.vscode/extensions.json` `` → `path.join(opts.cwd, '.vscode', 'extensions.json')`

- [ ] **Step 2: Verify build**

Run: `bun run build`
Expected: Success

- [ ] **Step 3: Commit**

```bash
git add src/generators/vscode.ts
git commit -m "refactor(vscode-gen): import from shared, fix path construction with path.join"
```

---

### Task 5: Update `core/local-preset.ts`

**Files:**
- Modify: `src/core/local-preset.ts`

This is the largest task. Multiple edits to one file.

- [ ] **Step 1: Update imports**

Replace lines 1-9:

```typescript
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { FmtPreset, GenerateOptions, VscodePreset } from '../presets/types';
import { mergeVscodeSettings } from './merge-settings';
import { fileExists, ensureDir, writeFile, readFile, readJson, writeJson } from '../utils/fs';
import { logger } from '../utils/logger';
import { detectPackageManager, getRunPrefix } from '../utils/deps';
import type { PackageManager } from '../utils/deps';
import {
   CONFIG_GETTERS,
   STYLELINT_FILES,
   EDITORCONFIG_FILE,
   CSPELL_FILE,
   LINTSTAGED_FILE,
   STYLELINT_DEPS,
   HUSKY_DEPS,
   LINTSTAGED_DEPS,
   STYLELINT_EXTENSION,
   filterStylelintSettings,
   isNotStylelintDep,
   isNotEditorconfigDep,
   isNotLintStagedDep,
} from './shared';
```

- [ ] **Step 2: Remove extracted constants and type**

Delete the following blocks (now imported from shared):
- Lines 11-25: `type PresetType` through `CONFIG_GETTERS` array
- Lines 27-30: `STYLELINT_FILES`, `EDITORCONFIG_FILE`, `CSPELL_FILE`, `LINTSTAGED_FILE`
- Lines 32-37: `STYLELINT_SETTINGS_PREFIXES`
- Lines 39-47: `STYLELINT_DEPS`
- Line 49: `STYLELINT_EXTENSION`
- Lines 51-52: `HUSKY_DEPS`, `LINTSTAGED_DEPS`

Keep `type PresetType = 'fmt' | 'vscode';` (line 11) since it's local to this file — add it back after the imports:

```typescript
type PresetType = 'fmt' | 'vscode';
```

- [ ] **Step 3: Replace fs.* calls with utils**

Apply these replacements:

| Location | Old | New |
|----------|-----|-----|
| `listCustomPresets` body | `fs.existsSync(fmtDir)` | `fileExists(fmtDir)` |
| `listCustomPresets` body | `fs.existsSync(pkgPath)` | `fileExists(pkgPath)` |
| `isValidCustomPreset` body | `fs.existsSync(presetDir)` | `fileExists(presetDir)` |
| `isValidCustomPreset` body | `fs.existsSync(pkgPath)` | `fileExists(pkgPath)` |
| `localPresetExists` body | `fs.existsSync(dir)` | `fileExists(dir)` |
| `materializeVscodePreset` | `fs.readFileSync(settingsSrc, 'utf-8')` | `readFile(settingsSrc)` |
| `materializeVscodePreset` | `fs.readFileSync(extensionsSrc, 'utf-8')` | `readFile(extensionsSrc)` |
| `applyLocalFmtPreset` | `fs.existsSync(presetDir)` | `fileExists(presetDir)` |
| `applyLocalFmtPreset` JSON validation | `JSON.parse(fs.readFileSync(projectPkgPath, 'utf-8'))` | See below |
| `applyLocalFmtPreset` file copy | `fs.readFileSync(path.join(presetDir, filename), 'utf-8')` | `readFile(path.join(presetDir, filename))` |
| `detectPresetCapabilities` | `fs.readdirSync(presetDir)` | keep as-is |

For the JSON validation in `applyLocalFmtPreset`, replace:
```typescript
      try {
         JSON.parse(fs.readFileSync(projectPkgPath, 'utf-8'));
      } catch {
         throw new InvalidPackageJsonError(projectPkgPath);
      }
```
with:
```typescript
      const parsed = readJson(projectPkgPath);
      if (parsed === null) {
         throw new InvalidPackageJsonError(projectPkgPath);
      }
```

For the file reads in `materializeVscodePreset`, replace:
```typescript
   if (fileExists(settingsSrc)) {
      const content = fs.readFileSync(settingsSrc, 'utf-8');
      writeFile(path.join(presetDir, 'settings.json'), content);
   }
```
with:
```typescript
   const settingsContent = readFile(settingsSrc);
   if (settingsContent !== null) {
      writeFile(path.join(presetDir, 'settings.json'), settingsContent);
   }
```

Same pattern for extensions:
```typescript
   const extensionsContent = readFile(extensionsSrc);
   if (extensionsContent !== null) {
      writeFile(path.join(presetDir, 'extensions.json'), extensionsContent);
   }
```

For the file copy in `applyLocalFmtPreset`, replace:
```typescript
      const content = fs.readFileSync(path.join(presetDir, filename), 'utf-8');
      writeFile(destPath, content);
```
with:
```typescript
      const content = readFile(path.join(presetDir, filename));
      if (content !== null) {
         writeFile(destPath, content);
         (exists ? result.overwritten : result.created).push(filename);
      }
```

- [ ] **Step 4: Remove extracted functions**

Delete these functions from the bottom of the file (now imported from shared):
- `filterStylelintSettings` (lines 433-450)
- `isNotStylelintDep` (lines 525-529)
- `isNotEditorconfigDep` (lines 531-533)
- `isNotLintStagedDep` (lines 535-537)

- [ ] **Step 5: Verify build**

Run: `bun run build`
Expected: Success

- [ ] **Step 6: Commit**

```bash
git add src/core/local-preset.ts
git commit -m "refactor(local-preset): import from shared, replace raw fs calls with utils"
```

---

### Task 6: Update `commands/fmt.ts`

**Files:**
- Modify: `src/commands/fmt.ts`

- [ ] **Step 1: Update imports and remove local functions**

Replace lines 1-59 with:

```typescript
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import type { Command } from 'commander';
import type { FmtPreset } from '../presets/types';
import { FMT_PRESETS } from '../presets/fmt';
import { logger } from '../utils/logger';
import { PresetNotFoundError } from '../utils/errors';
import { generateAllFmt } from '../generators/fmt';
import {
   detectPackageManager,
   getLockfileName,
   getRunPrefix,
   installDevDeps,
   addDepsToManifest,
} from '../utils/deps';
import type { PackageManager } from '../utils/deps';
import { execFileNoThrow } from '../utils/execFileNoThrow';
import { fileExists, readJson, writeJson, ensureDir, writeFile } from '../utils/fs';
import {
   getLocalPresetDir,
   localPresetExists,
   resetLocalPreset,
   materializeFmtPreset,
   applyLocalFmtPreset,
   resolveLocalDeps,
   InvalidPackageJsonError,
   filterScripts,
   isValidCustomPreset,
   listCustomPresets,
   detectPresetCapabilities,
} from '../core/local-preset';
import {
   isNotStylelintDep,
   isNotEditorconfigDep,
   isNotCspellDep,
   isNotHuskyDep,
   isNotLintStagedDep,
} from '../core/shared';

interface FmtCommandOptions {
   force?: boolean;
   install?: boolean;
   dryRun?: boolean;
   stylelint?: boolean;
   editorconfig?: boolean;
   cspell?: boolean;
   husky?: boolean;
   lintStaged?: boolean;
   reset?: boolean;
}
```

Key changes:
- Removed `isNotStylelintDep`, `isNotEditorconfigDep`, `isNotCspellDep`, `isNotHuskyDep`, `isNotLintStagedDep` local functions
- Added import of all 5 from `../core/shared`
- Added `FmtCommandOptions` interface
- Removed `import type { GenerateOptions }` (no longer used at top level — it's still used in internal functions)

Wait — `GenerateOptions` IS still used. Keep the import. Updated:
```typescript
import type { GenerateOptions, FmtPreset } from '../presets/types';
```

- [ ] **Step 2: Update action handler to use FmtCommandOptions**

Replace the inline options type in the `.action()` callback (lines 76-87):

```typescript
      .action(
         async (
            presetName: string,
            options: FmtCommandOptions,
         ) => {
```

- [ ] **Step 3: Fix readJson at line 103**

Replace:
```typescript
            if (fileExists(pkgPath)) {
               try {
                  JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
               } catch {
                  logger.error(
                     'package.json exists but is not valid JSON. Fix it first, then re-run this command.',
                  );
                  return;
               }
            }
```
with:
```typescript
            if (fileExists(pkgPath) && readJson(pkgPath) === null) {
               logger.error(
                  'package.json exists but is not valid JSON. Fix it first, then re-run this command.',
               );
               return;
            }
```

- [ ] **Step 4: Update executeLocalPath options type**

Replace lines 155-168:
```typescript
async function executeLocalPath(
   cwd: string,
   presetName: string,
   options: FmtCommandOptions,
): Promise<void> {
```

- [ ] **Step 5: Update executeBuiltinPath options type**

Replace lines 310-324:
```typescript
async function executeBuiltinPath(
   cwd: string,
   presetName: string,
   preset: FmtPreset,
   options: FmtCommandOptions,
): Promise<void> {
```

- [ ] **Step 6: Fix `preset as never` at line 351**

Replace:
```typescript
      materializeFmtPreset(presetName, preset as never, opts);
```
with:
```typescript
      materializeFmtPreset(presetName, preset, opts);
```

If TypeScript errors, investigate the underlying type mismatch. The likely fix is to update `materializeFmtPreset`'s second parameter type or add a non-null assertion `!`.

- [ ] **Step 7: Fix console.log at lines 145, 150**

Replace:
```typescript
            console.log(`${p.name.padEnd(12)} ${p.description}`);
```
with:
```typescript
            logger.log(`${p.name.padEnd(12)} ${p.description}`);
```

And:
```typescript
            console.log(`${name.padEnd(12)} ${chalk.yellow('(custom)')}`);
```
with:
```typescript
            logger.log(`${name.padEnd(12)} ${chalk.yellow('(custom)')}`);
```

- [ ] **Step 8: Verify build**

Run: `bun run build`
Expected: Success (may need to fix the `as never` type issue first)

- [ ] **Step 9: Commit**

```bash
git add src/commands/fmt.ts
git commit -m "refactor(fmt-cmd): import dep filters from shared, extract options type, fix console.log and readJson"
```

---

### Task 7: Update `commands/vscode.ts` and `utils/errors.ts`

**Files:**
- Modify: `src/commands/vscode.ts`
- Modify: `src/utils/errors.ts`

- [ ] **Step 1: Update vscode.ts — extract options type, fix console.log, inline resolvePreset**

Replace entire file content:

```typescript
import type { Command } from 'commander';
import type { GenerateOptions, VscodePreset } from '../presets/types';
import { VSCODE_PRESETS } from '../presets/vscode';
import { logger } from '../utils/logger';
import { PresetNotFoundError } from '../utils/errors';
import { generateAllVscode } from '../generators/vscode';
import {
   localPresetExists,
   resetLocalPreset,
   materializeVscodePreset,
   applyLocalVscodePreset,
} from '../core/local-preset';

interface VscodeCommandOptions {
   force?: boolean;
   dryRun?: boolean;
   stylelint?: boolean;
   reset?: boolean;
}

export function registerVscodeCommand(program: Command) {
   const vscode = program.command('vscode').description('Initialize VSCode config with preset');

   vscode
      .argument('<preset>')
      .option('-F, --force', 'Force overwrite existing files')
      .option('--dry-run', 'Preview without writing files')
      .option('--stylelint', 'Include Stylelint settings and extension')
      .option('--reset', 'Reset local preset and re-materialize from built-in')
      .action(
         async (
            presetName: string,
            options: VscodeCommandOptions,
         ) => {
            const preset = VSCODE_PRESETS.find(p => p.name === presetName);
            if (!preset) {
               const err = new PresetNotFoundError(
                  presetName,
                  VSCODE_PRESETS.map(p => p.name),
               );
               logger.error(err.message);
               process.exitCode = 1;
               return;
            }

            const cwd = process.cwd();

            if (options.reset) {
               resetLocalPreset('vscode', presetName);
            }

            const useLocal = localPresetExists('vscode', presetName);

            if (useLocal) {
               executeVscodeLocalPath(cwd, presetName, options);
            } else {
               executeVscodeBuiltinPath(cwd, presetName, preset, options);
            }
         },
      );

   vscode
      .command('list')
      .description('List available vscode presets')
      .action(() => {
         for (const p of VSCODE_PRESETS) {
            logger.log(`${p.name.padEnd(12)} ${p.description}`);
         }
      });
}

function executeVscodeLocalPath(
   cwd: string,
   presetName: string,
   options: VscodeCommandOptions,
): void {
   logger.log('Using local custom preset');

   const opts: GenerateOptions = {
      cwd,
      force: options.force ?? false,
      dryRun: options.dryRun ?? false,
      noStylelint: options.stylelint !== true,
      noEditorconfig: false,
      noCspell: false,
      noHusky: true,
      noLintStaged: true,
   };

   const result = applyLocalVscodePreset(cwd, presetName, opts);
   const files = [...result.created, ...result.overwritten];

   if (files.length === 0) {
      logger.warn('No files generated');
      return;
   }

   if (opts.dryRun) {
      logger.log(`[dry-run] Would create ${files.join(', ')} from local preset`);
      return;
   }

   logger.log(`Created ${files.join(', ')} from local preset`);
}

function executeVscodeBuiltinPath(
   cwd: string,
   presetName: string,
   preset: VscodePreset,
   options: VscodeCommandOptions,
): void {
   const opts: GenerateOptions = {
      cwd,
      force: options.force ?? false,
      dryRun: options.dryRun ?? false,
      noStylelint: options.stylelint !== true,
      noEditorconfig: false,
      noCspell: false,
      noHusky: true,
      noLintStaged: true,
   };

   const result = generateAllVscode(preset, opts);
   const files = [...result.created, ...result.overwritten];

   if (files.length === 0) {
      logger.warn('No files generated');
      return;
   }

   if (opts.dryRun) {
      logger.log(`[dry-run] Would create ${files.join(', ')}`);
      return;
   }

   logger.log(`Created ${files.join(', ')}`);

   materializeVscodePreset(cwd, presetName);
}
```

Key changes:
- Added `VscodeCommandOptions` interface
- Removed `import { resolvePreset }` — inlined as `VSCODE_PRESETS.find(p => p.name === presetName)`
- Changed `console.log` → `logger.log` in list action
- Used `VscodeCommandOptions` in all function signatures

- [ ] **Step 2: Update errors.ts — remove resolvePreset, fix Array.fill**

Replace:
```typescript
const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[]);
```
with:
```typescript
const dp = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0));
```

Delete the `resolvePreset` function and `Named` interface (lines 57-64):
```typescript
// DELETE these lines:
interface Named {
   name: string;
}

export function resolvePreset<T extends Named>(presets: T[], name: string): T | undefined {
   const found = presets.find(p => p.name === name);
   return found;
}
```

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: Success

- [ ] **Step 4: Commit**

```bash
git add src/commands/vscode.ts src/utils/errors.ts
git commit -m "refactor(vscode-cmd,errors): extract options type, inline resolvePreset, fix Array.fill"
```

---

### Task 8: Final build and test

**Files:**
- None (verification only)

- [ ] **Step 1: Build**

Run: `bun run build`
Expected: Success with no type errors

- [ ] **Step 2: Run unit tests**

Run: `bun run test --project unit`
Expected: All tests pass

- [ ] **Step 3: Run targeted acceptance tests**

Run the acceptance tests that exercise the modified commands:

```bash
bun run test --project acceptance -- -t "fmt"
bun run test --project acceptance -- -t "vscode"
```

Expected: All pass

- [ ] **Step 4: Run linter**

Run: `bun run lint`
Expected: No errors

---

## Self-Review Checklist

- [x] **Spec coverage:** Each spec item (1-8) maps to Tasks 1-7
- [x] **Placeholder scan:** No TBDs, TODOs, or "implement later" patterns
- [x] **Type consistency:** All import paths and type names are consistent across tasks
- [x] `core/shared.ts` exports match what consumers import in Tasks 3-7
- [x] `readFile` added to `utils/fs.ts` (Task 1) before it's used in Task 5
- [x] `FmtCommandOptions` defined in Task 6, used in all fmt.ts function signatures
- [x] `VscodeCommandOptions` defined in Task 7, used in all vscode.ts function signatures
