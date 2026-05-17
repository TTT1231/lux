# Cross-Platform Clipboard Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `lux vpn` 的剪贴板功能在 macOS/Linux 上正常工作，不再只有 Windows 的 `clip` 命令。

**Architecture:** 新增 `src/utils/platform.ts` 封装平台检测，改写 `vpn.ts` 的 `copyToClipboard` 根据平台分发到 `clip` / `pbcopy` / `xclip`。现有降级逻辑（失败时打印到终端）保持不变。

**Tech Stack:** TypeScript (ESM), Node.js 18+, bun, vitest

---

### Task 1: 创建 `platform.ts` 并编写单元测试

**Files:**
- Create: `src/utils/platform.ts`
- Create: `tests/unit/utils/platform.test.ts`

- [ ] **Step 1: 写 platform.ts**

创建 `src/utils/platform.ts`：

```typescript
import { platform } from 'node:os';

export type Platform = 'win32' | 'darwin' | 'linux';

export function getPlatform(): Platform {
  return platform() as Platform;
}
```

- [ ] **Step 2: 写单元测试**

创建 `tests/unit/utils/platform.test.ts`：

```typescript
import os from 'node:os';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlatform, type Platform } from '../../../src/utils/platform';

describe('getPlatform', () => {
  const originalPlatform = os.platform;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns win32 on Windows', () => {
    vi.spyOn(os, 'platform').mockReturnValue('win32');
    expect(getPlatform()).toBe<Platform>('win32');
  });

  it('returns darwin on macOS', () => {
    vi.spyOn(os, 'platform').mockReturnValue('darwin');
    expect(getPlatform()).toBe<Platform>('darwin');
  });

  it('returns linux on Linux', () => {
    vi.spyOn(os, 'platform').mockReturnValue('linux');
    expect(getPlatform()).toBe<Platform>('linux');
  });
});
```

- [ ] **Step 3: 运行测试确认通过**

```bash
bun run test --project unit -- tests/unit/utils/platform.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 4: 提交**

```bash
git add src/utils/platform.ts tests/unit/utils/platform.test.ts
git commit -m "feat(utils): add getPlatform utility for OS detection"
```

---

### Task 2: 改写 `copyToClipboard` 并补充测试

**Files:**
- Modify: `src/commands/vpn.ts`
- Modify: `tests/unit/commands/vpn.test.ts`

- [ ] **Step 1: 写 `copyToClipboard` 跨平台行为的失败测试**

在 `tests/unit/commands/vpn.test.ts` 顶部新增 mock 并添加测试：

在现有 `vi.mock` 块之后，新增：

```typescript
vi.mock('../../../src/utils/platform', () => ({
  getPlatform: vi.fn().mockReturnValue('win32'),
}));

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn().mockReturnValue({ status: 0 }),
}));
```

在文件末尾添加新的 describe 块：

```typescript
import { getPlatform } from '../../../src/utils/platform';
import { spawnSync } from 'node:child_process';

const mockGetPlatform = vi.mocked(getPlatform);
const mockSpawnSync = vi.mocked(spawnSync);

describe('copyToClipboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlatform.mockReturnValue('win32');
    mockSpawnSync.mockReturnValue({ status: 0 });
  });

  it('uses clip on win32', async () => {
    const { copyToClipboard } = await import('../../../src/commands/vpn');
    copyToClipboard('test');
    expect(mockSpawnSync).toHaveBeenCalledWith('clip', expect.any(Object));
  });

  it('uses pbcopy on darwin', async () => {
    mockGetPlatform.mockReturnValue('darwin');
    const { copyToClipboard } = await import('../../../src/commands/vpn');
    copyToClipboard('test');
    expect(mockSpawnSync).toHaveBeenCalledWith('pbcopy', expect.any(Object));
  });

  it('uses xclip on linux', async () => {
    mockGetPlatform.mockReturnValue('linux');
    const { copyToClipboard } = await import('../../../src/commands/vpn');
    copyToClipboard('test');
    expect(mockSpawnSync).toHaveBeenCalledWith('xclip', expect.any(Object));
  });

  it('returns false when spawnSync fails', async () => {
    mockSpawnSync.mockReturnValue({ status: 1 });
    const { copyToClipboard } = await import('../../../src/commands/vpn');
    expect(copyToClipboard('test')).toBe(false);
  });

  it('returns true when spawnSync succeeds', async () => {
    mockSpawnSync.mockReturnValue({ status: 0 });
    const { copyToClipboard } = await import('../../../src/commands/vpn');
    expect(copyToClipboard('test')).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
bun run test --project unit -- tests/unit/commands/vpn.test.ts
```

Expected: 新增的 `copyToClipboard` 测试 FAIL（因为 `copyToClipboard` 还没有被导出，且还是硬编码 `clip`）

- [ ] **Step 3: 改写 vpn.ts 的 copyToClipboard**

修改 `src/commands/vpn.ts`：

替换 import 部分，在 `spawnSync` import 下方添加：

```typescript
import { getPlatform, type Platform } from '../utils/platform';
```

替换 `copyToClipboard` 函数（第 26-29 行）为：

```typescript
const CLIPBOARD_COMMANDS: Record<Platform, string> = {
  win32: 'clip',
  darwin: 'pbcopy',
  linux: 'xclip',
};

export function copyToClipboard(text: string): boolean {
  const cmd = CLIPBOARD_COMMANDS[getPlatform()];
  const result = spawnSync(cmd, [], { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
  return result.status === 0;
}
```

注意：函数需要加 `export` 以便测试导入。

- [ ] **Step 4: 运行测试确认通过**

```bash
bun run test --project unit -- tests/unit/commands/vpn.test.ts
```

Expected: 所有测试 PASS

- [ ] **Step 5: 运行全量单元测试确认无回归**

```bash
bun run test --project unit
```

Expected: 所有测试 PASS，无回归

- [ ] **Step 6: 运行 lint 确认无问题**

```bash
bun run lint
```

Expected: 无错误

- [ ] **Step 7: 提交**

```bash
git add src/commands/vpn.ts tests/unit/commands/vpn.test.ts
git commit -m "feat(vpn): support cross-platform clipboard (macOS/Linux)"
```
