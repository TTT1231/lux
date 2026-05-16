# Global Package Manager Configuration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `lux_package_manager` config key to `~/.lux/env.txt` so users can override lockfile-based PM detection globally.

**Architecture:** Extend the existing `config.ts` + `vpn.ts` set/unset infrastructure with a new allowed key. Modify `detectPackageManager()` in `deps.ts` to check global config before lockfile detection. Warn on lockfile mismatch but honor the global setting.

**Tech Stack:** TypeScript, Vitest, existing lux config system

---

### Task 1: Extend config.ts with `lux_package_manager` key

**Files:**
- Modify: `src/utils/config.ts`
- Test: `tests/unit/utils/config.test.ts` (create)

- [ ] **Step 1: Write failing test for getEnvConfig reading lux_package_manager**

Create `tests/unit/utils/config.test.ts`:

```typescript
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEnvConfig, setEnvConfig, clearEnvConfig } from '../../../src/utils/config';

vi.mock('../../../src/utils/fs', () => ({
   writeFile: vi.fn(),
}));

const envPath = path.join(os.homedir(), '.lux', 'env.txt');

function writeEnvFile(content: string) {
   fs.mkdirSync(path.dirname(envPath), { recursive: true });
   fs.writeFileSync(envPath, content);
}

describe('getEnvConfig', () => {
   afterEach(() => {
      try { fs.unlinkSync(envPath) } catch { /* noop */ }
   });

   it('parses lux_package_manager from env.txt', () => {
      writeEnvFile('lux_package_manager="pnpm"\n');
      const config = getEnvConfig();
      expect(config.lux_package_manager).toBe('pnpm');
   });

   it('returns empty object when file missing', () => {
      try { fs.unlinkSync(envPath) } catch { /* noop */ }
      const config = getEnvConfig();
      expect(config).toEqual({});
   });

   it('coexists with proxy keys', () => {
      writeEnvFile('https_proxy="http://127.0.0.1:7890"\nlux_package_manager="yarn"\n');
      const config = getEnvConfig();
      expect(config.https_proxy).toBe('http://127.0.0.1:7890');
      expect(config.lux_package_manager).toBe('yarn');
   });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `bun run test --project unit -- -t "getEnvConfig"`
Expected: PASS — `config.ts` already parses arbitrary keys, no code change needed yet.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/utils/config.test.ts
git commit -m "test(config): add unit tests for getEnvConfig with lux_package_manager"
```

---

### Task 2: Add PM value validation to handleSet

**Files:**
- Modify: `src/commands/vpn.ts`
- Test: `tests/unit/commands/vpn.test.ts`

- [ ] **Step 1: Write failing test for lux_package_manager validation**

Add to `tests/unit/commands/vpn.test.ts`:

```typescript
import { handleSet } from '../../../src/commands/vpn';
import { getEnvConfig, setEnvConfig } from '../../../src/utils/config';

vi.mock('../../../src/utils/config', () => ({
   getEnvConfig: vi.fn(),
   setEnvConfig: vi.fn(),
   clearEnvConfig: vi.fn(),
}));

const mockGetEnvConfig = vi.mocked(getEnvConfig);
const mockSetEnvConfig = vi.mocked(setEnvConfig);

describe('handleSet — lux_package_manager', () => {
   afterEach(() => {
      vi.clearAllMocks();
   });

   it('accepts valid package manager values', () => {
      mockGetEnvConfig.mockReturnValue({});
      handleSet(['lux_package_manager=pnpm']);
      expect(mockSetEnvConfig).toHaveBeenCalledWith({ lux_package_manager: 'pnpm' });
   });

   it('accepts auto as value', () => {
      mockGetEnvConfig.mockReturnValue({});
      handleSet(['lux_package_manager=auto']);
      expect(mockSetEnvConfig).toHaveBeenCalledWith({ lux_package_manager: 'auto' });
   });

   it('rejects invalid package manager value', () => {
      mockGetEnvConfig.mockReturnValue({});
      handleSet(['lux_package_manager=invalid']);
      expect(mockSetEnvConfig).not.toHaveBeenCalled();
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test --project unit -- -t "handleSet.*lux_package_manager"`
Expected: FAIL — `lux_package_manager` is not in `ALLOWED_KEYS` yet.

- [ ] **Step 3: Implement validation in vpn.ts**

In `src/commands/vpn.ts`:

1. Add `lux_package_manager` to `ALLOWED_KEYS`:

```typescript
const ALLOWED_KEYS = ['https_proxy', 'http_proxy', 'all_proxy', 'lux_package_manager'] as const;
```

2. Add a `VALID_PM_VALUES` constant and a validation check in `handleSet`, after the key validation block:

```typescript
const VALID_PM_VALUES = ['auto', 'bun', 'pnpm', 'yarn', 'npm'] as const;
```

In `handleSet`, after the `isValidKey` check, add:

```typescript
if (key === 'lux_package_manager' && !VALID_PM_VALUES.includes(value as typeof VALID_PM_VALUES[number])) {
   logger.error(
      `Invalid package manager: "${value}". Allowed values: ${VALID_PM_VALUES.join(', ')}`,
   );
   return;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test --project unit -- -t "handleSet.*lux_package_manager"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/vpn.ts tests/unit/commands/vpn.test.ts
git commit -m "feat(set): add lux_package_manager key with value validation"
```

---

### Task 3: Modify detectPackageManager to check global config

**Files:**
- Modify: `src/utils/deps.ts`
- Test: `tests/unit/utils/deps.test.ts`

- [ ] **Step 1: Write failing tests for global PM config**

Add to `tests/unit/utils/deps.test.ts`:

```typescript
vi.mock('../../../src/utils/config', () => ({
   getEnvConfig: vi.fn(),
}));

import { getEnvConfig } from '../../../src/utils/config';
const mockGetEnvConfig = vi.mocked(getEnvConfig);

describe('detectPackageManager — global config override', () => {
   let tmpDir = '';

   afterEach(() => {
      vi.clearAllMocks();
      if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   it('uses global config when set', () => {
      mockGetEnvConfig.mockReturnValue({ lux_package_manager: 'pnpm' });
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-global-'));
      expect(detectPackageManager(tmpDir)).toBe('pnpm');
   });

   it('falls back to lockfile detection when config is auto', () => {
      mockGetEnvConfig.mockReturnValue({ lux_package_manager: 'auto' });
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-global-'));
      fs.writeFileSync(path.join(tmpDir, 'bun.lock'), '');
      expect(detectPackageManager(tmpDir)).toBe('bun');
   });

   it('falls back to lockfile detection when config is unset', () => {
      mockGetEnvConfig.mockReturnValue({});
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-global-'));
      fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      expect(detectPackageManager(tmpDir)).toBe('pnpm');
   });

   it('warns when global PM mismatches lockfile', () => {
      mockGetEnvConfig.mockReturnValue({ lux_package_manager: 'pnpm' });
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-global-'));
      fs.writeFileSync(path.join(tmpDir, 'bun.lock'), '');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(detectPackageManager(tmpDir)).toBe('pnpm');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
   });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test --project unit -- -t "global config override"`
Expected: FAIL — `detectPackageManager` doesn't check config yet.

- [ ] **Step 3: Implement global config check in detectPackageManager**

In `src/utils/deps.ts`:

1. Add import:

```typescript
import { getEnvConfig } from './config';
import { logger } from './logger';
```

2. Replace `detectPackageManager` with:

```typescript
const PM_LOCKFILE_MAP: Record<PackageManager, string[]> = {
   bun: ['bun.lockb', 'bun.lock'],
   pnpm: ['pnpm-lock.yaml'],
   yarn: ['yarn.lock'],
   npm: ['package-lock.json'],
};

/** Detect package manager from global config or lockfile in the given directory */
export function detectPackageManager(cwd: string): PackageManager {
   const env = getEnvConfig();
   const configured = env.lux_package_manager;

   if (configured && configured !== 'auto') {
      const pm = configured as PackageManager;
      const lockfiles = PM_LOCKFILE_MAP[pm] ?? [];
      const hasMatch = lockfiles.some(f => fileExists(`${cwd}/${f}`));
      if (!hasMatch) {
         const detected = detectFromLockfile(cwd);
         if (detected !== 'npm') {
            logger.warn(
               `Global config is ${pm} but detected ${detected} lockfile`,
            );
         }
      }
      return pm;
   }

   return detectFromLockfile(cwd);
}

function detectFromLockfile(cwd: string): PackageManager {
   if (fileExists(`${cwd}/bun.lockb`) || fileExists(`${cwd}/bun.lock`)) return 'bun';
   if (fileExists(`${cwd}/pnpm-lock.yaml`)) return 'pnpm';
   if (fileExists(`${cwd}/yarn.lock`)) return 'yarn';
   return 'npm';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test --project unit -- -t "global config override"`
Expected: PASS

- [ ] **Step 5: Run full deps test suite to ensure no regressions**

Run: `bun run test --project unit -- deps`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/utils/deps.ts tests/unit/utils/deps.test.ts
git commit -m "feat(deps): detectPackageManager checks global config override"
```

---

### Task 4: Update CLI descriptions to reflect new capability

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Update set/unset command descriptions**

In `src/index.ts`, update the descriptions:

```typescript
program
   .command('set')
   .description('Set config values using key=value pairs (proxy, lux_package_manager)')
   .argument('[args...]', 'key=value pairs (e.g. https_proxy=http://127.0.0.1:7890, lux_package_manager=pnpm)')
   .action((args: string[]) => handleSet(args));

program
   .command('unset')
   .description('Clear stored configuration')
   .action(() => handleUnset());
```

- [ ] **Step 2: Commit**

```bash
git add src/index.ts
git commit -m "docs(cli): update set/unset descriptions for package manager config"
```

---

### Task 5: Run full test suite and lint

- [ ] **Step 1: Run all unit tests**

Run: `bun run test --project unit`
Expected: ALL PASS

- [ ] **Step 2: Run lint**

Run: `bun run lint`
Expected: no errors

- [ ] **Step 3: Build and verify**

Run: `bun run build`
Expected: successful build
