# Custom Preset Lockfile Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make custom presets replace `<lockfile>` placeholders in config files, matching built-in preset behavior.

**Architecture:** Two small changes: (1) detect PM earlier in `executeLocalPath` to populate `opts.lockfile`, (2) apply `<lockfile>` replacement in `applyLocalFmtPreset` when copying files to project root.

**Tech Stack:** TypeScript, Vitest

---

### Task 1: Add failing tests for `<lockfile>` replacement in `applyLocalFmtPreset`

**Files:**
- Modify: `tests/unit/core/local-preset.test.ts` (inside the `applyLocalFmtPreset` describe block, after the existing `<pm>` placeholder test at ~line 415)

- [ ] **Step 1: Write the failing tests**

Add these two tests inside the existing `describe('applyLocalFmtPreset', ...)` block, after the `it('resolves <pm> placeholder in scripts', ...)` test (around line 415):

```typescript
	it('resolves <lockfile> placeholder in config files when lockfile is provided', () => {
		tmpDir = createTempDir();
		setupLocalPreset({
			'eslint.config.mjs':
				"export default [{ ignores: ['node_modules/', '<lockfile>', 'dist/'] }]\n",
			'.prettierignore': 'node_modules/\n<lockfile>\ndist/\n',
			'package.json': JSON.stringify({ scripts: {} }),
			'deps.json': '{}',
		});

		const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
			...baseOpts,
			cwd: tmpDir,
			lockfile: 'bun.lock',
		});

		expect(result.created).toContain('eslint.config.mjs');
		expect(result.created).toContain('.prettierignore');
		expect(fs.readFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'utf-8')).toBe(
			"export default [{ ignores: ['node_modules/', 'bun.lock', 'dist/'] }]\n",
		);
		expect(fs.readFileSync(path.join(tmpDir, '.prettierignore'), 'utf-8')).toBe(
			'node_modules/\nbun.lock\ndist/\n',
		);
	});

	it('removes <lockfile> placeholder when lockfile is not provided', () => {
		tmpDir = createTempDir();
		setupLocalPreset({
			'.prettierignore': 'node_modules/\n<lockfile>\ndist/\n',
			'package.json': JSON.stringify({ scripts: {} }),
			'deps.json': '{}',
		});

		applyLocalFmtPreset(tmpDir, 'test-preset', {
			...baseOpts,
			cwd: tmpDir,
		});

		expect(fs.readFileSync(path.join(tmpDir, '.prettierignore'), 'utf-8')).toBe(
			'node_modules/\ndist/\n',
		);
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test --project unit -- -t "resolves <lockfile> placeholder"`
Expected: Both tests FAIL — `applyLocalFmtPreset` currently copies files as-is without `<lockfile>` replacement.

---

### Task 2: Implement `<lockfile>` replacement in `applyLocalFmtPreset`

**Files:**
- Modify: `src/core/local-preset.ts:208-212` (the file-copying loop inside `applyLocalFmtPreset`)

- [ ] **Step 1: Add `<lockfile>` replacement logic**

In `src/core/local-preset.ts`, find the exact block in `applyLocalFmtPreset` (around line 208-212):

```typescript
const content = readFile(path.join(presetDir, filename));
if (content !== null) {
   writeFile(destPath, content);
   (exists ? result.overwritten : result.created).push(filename);
}
```

Replace with:

```typescript
const content = readFile(path.join(presetDir, filename));
if (content !== null) {
   const resolved = opts.lockfile
      ? content.replace(/<lockfile>/g, opts.lockfile)
      : content.replace(/<lockfile>\n?/g, '');
   writeFile(destPath, resolved);
   (exists ? result.overwritten : result.created).push(filename);
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `bun run test --project unit -- -t "resolves <lockfile> placeholder"`
Expected: Both tests from Task 1 now PASS.

- [ ] **Step 3: Commit**

```bash
git add src/core/local-preset.ts tests/unit/core/local-preset.test.ts
git commit -m "fix(fmt): replace lockfile placeholder in custom preset files"
```

---

### Task 3: Move PM detection earlier in `executeLocalPath` and set `opts.lockfile`

**Files:**
- Modify: `src/commands/fmt.ts:113-166` (the `executeLocalPath` function)

- [ ] **Step 1: Move PM detection before opts construction**

In `src/commands/fmt.ts`, find the `executeLocalPath` function. The current code at lines 130-142 is:

```typescript
const husky = options.husky === true || options.lintStaged === true;
const lintStaged = options.lintStaged === true;

const opts: GenerateOptions = {
   cwd,
   force: options.force ?? false,
   dryRun: options.dryRun ?? false,
   stylelint: options.stylelint === true,
   editorconfig: options.editorconfig === true,
   cspell: options.cspell === true,
   husky,
   lintStaged,
};
```

Replace with:

```typescript
const husky = options.husky === true || options.lintStaged === true;
const lintStaged = options.lintStaged === true;

const pm = fileExists(path.join(cwd, 'package.json'))
   ? detectPackageManager(cwd)
   : undefined;

const opts: GenerateOptions = {
   cwd,
   force: options.force ?? false,
   dryRun: options.dryRun ?? false,
   stylelint: options.stylelint === true,
   editorconfig: options.editorconfig === true,
   cspell: options.cspell === true,
   husky,
   lintStaged,
   lockfile: pm ? getLockfileName(pm) : undefined,
};
```

- [ ] **Step 2: Remove the duplicate PM detection**

Further down in `executeLocalPath`, around line 166, find:

```typescript
const pm = fileExists(path.join(cwd, 'package.json')) ? detectPackageManager(cwd) : undefined;
```

Delete this line (it's now redundant since `pm` was detected earlier).

- [ ] **Step 3: Verify `getLockfileName` is already imported**

Check the imports at the top of `src/commands/fmt.ts`. The file already imports `{ ..., getLockfileName, ... }` from `../utils/deps` (line 10). If not, add it to the import.

- [ ] **Step 4: Run all unit tests**

Run: `bun run test --project unit`
Expected: All tests PASS (including the new lockfile tests and existing fmt dispatch/list tests).

- [ ] **Step 5: Commit**

```bash
git add src/commands/fmt.ts
git commit -m "fix(fmt): detect lockfile in custom preset path"
```

---

### Task 4: Final verification

- [ ] **Step 1: Run full unit test suite**

Run: `bun run test --project unit`
Expected: All tests PASS.

- [ ] **Step 2: Run build**

Run: `bun run build` (or the equivalent build command from CLAUDE.md)
Expected: Build succeeds without type errors.

- [ ] **Step 3: Run type check**

Run: `bun run type:check`
Expected: No type errors.
