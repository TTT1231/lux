# ESLint Flat Config Ignores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `ignores` blocks with `node_modules/`, `<lockfile>`, and `dist/` to all 5 preset ESLint config templates.

**Architecture:** Modify ESLint template strings in each preset file. The `<lockfile>` placeholder is already replaced by `generateConfigFile` in `generators/fmt.ts:24-26` — no generator changes needed.

**Tech Stack:** TypeScript, Vitest

**Spec:** `docs/superpowers/specs/2026-05-18-eslint-ignores-design.md`

---

### Task 1: Write failing test for ESLint ignores in preset templates

**Files:**
- Create: `tests/unit/presets/eslint-ignores.test.ts`

- [ ] **Step 1: Write the test**

```typescript
import { describe, expect, it } from 'vitest';
import { webVueFmt } from '../../../src/presets/fmt/web-vue';
import { webReactFmt } from '../../../src/presets/fmt/web-react';
import { nodeFmt } from '../../../src/presets/fmt/node';
import { uniappFmt } from '../../../src/presets/fmt/uniapp';
import { electronVueFmt } from '../../../src/presets/fmt/electron-vue';

const PRESETS_WITH_ESLINT = [
  { name: 'web-vue', preset: webVueFmt },
  { name: 'web-react', preset: webReactFmt },
  { name: 'node', preset: nodeFmt },
  { name: 'uniapp', preset: uniappFmt },
  { name: 'electron-vue', preset: electronVueFmt },
] as const;

describe('ESLint preset ignores', () => {
  it.each(PRESETS_WITH_ESLINT)('$name: includes node_modules/ and <lockfile> in ignores', ({ preset }) => {
    const config = preset.eslint!();

    expect(config).toContain('node_modules/');
    expect(config).toContain('<lockfile>');
  });

  it.each(PRESETS_WITH_ESLINT)('$name: includes dist/ in ignores', ({ preset }) => {
    const config = preset.eslint!();
    expect(config).toContain('dist/');
  });

  it('node preset includes eslint.config.mjs in ignores', () => {
    const config = nodeFmt.eslint!();
    expect(config).toContain('eslint.config.mjs');
  });

  it('uniapp preset includes unpackage/ in ignores', () => {
    const config = uniappFmt.eslint!();
    expect(config).toContain('unpackage/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test --project unit --reporter=verbose tests/unit/presets/eslint-ignores.test.ts`
Expected: FAIL — current templates do not have `node_modules/` or `<lockfile>` in ESLint ignores.

---

### Task 2: Add ignores to web-vue, web-react, electron-vue, uniapp presets

**Files:**
- Modify: `src/presets/fmt/web-vue.ts:14-25` (eslint template string)
- Modify: `src/presets/fmt/web-react.ts:18` (eslint template string, update existing ignores)
- Modify: `src/presets/fmt/electron-vue.ts:14-25` (eslint template string)
- Modify: `src/presets/fmt/uniapp.ts:14-25` (eslint template string)

- [ ] **Step 1: Update web-vue ESLint template**

In `src/presets/fmt/web-vue.ts`, change the eslint template from:

```js
export default [
  ...pluginVue.configs['flat/recommended'],
```

to:

```js
export default [
  {
    ignores: ['node_modules/', '<lockfile>', 'dist/'],
  },
  ...pluginVue.configs['flat/recommended'],
```

- [ ] **Step 2: Update web-react ESLint template**

In `src/presets/fmt/web-react.ts`, change:

```js
  { ignores: ['dist'] },
```

to:

```js
  { ignores: ['node_modules/', '<lockfile>', 'dist/'] },
```

- [ ] **Step 3: Update electron-vue ESLint template**

In `src/presets/fmt/electron-vue.ts`, change the eslint template from:

```js
export default [
  ...pluginVue.configs['flat/recommended'],
```

to:

```js
export default [
  {
    ignores: ['node_modules/', '<lockfile>', 'dist/'],
  },
  ...pluginVue.configs['flat/recommended'],
```

- [ ] **Step 4: Update uniapp ESLint template**

In `src/presets/fmt/uniapp.ts`, change the eslint template from:

```js
export default [
  ...pluginVue.configs['flat/recommended'],
```

to:

```js
export default [
  {
    ignores: ['node_modules/', '<lockfile>', 'dist/', 'unpackage/'],
  },
  ...pluginVue.configs['flat/recommended'],
```

---

### Task 3: Update node preset ignores

**Files:**
- Modify: `src/presets/fmt/node.ts:18` (eslint template string, update existing ignores)

- [ ] **Step 1: Update node ESLint template ignores**

In `src/presets/fmt/node.ts`, change:

```js
    ignores: ['eslint.config.mjs', 'dist/'],
```

to:

```js
    ignores: ['node_modules/', '<lockfile>', 'eslint.config.mjs', 'dist/'],
```

---

### Task 4: Verify tests pass and commit

- [ ] **Step 1: Run the unit test**

Run: `bun run test --project unit --reporter=verbose tests/unit/presets/eslint-ignores.test.ts`
Expected: ALL PASS

- [ ] **Step 2: Run existing tests to verify no regressions**

Run: `bun run test --project unit`
Expected: ALL PASS

- [ ] **Step 3: Run type check**

Run: `bun run type:check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/presets/fmt/web-vue.ts src/presets/fmt/web-react.ts src/presets/fmt/node.ts src/presets/fmt/uniapp.ts src/presets/fmt/electron-vue.ts tests/unit/presets/eslint-ignores.test.ts docs/superpowers/specs/2026-05-18-eslint-ignores-design.md docs/superpowers/plans/2026-05-18-eslint-ignores.md
git commit -m "fix(eslint): add ignores with lockfile support for flat config"
```
