import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestContext } from '../helpers/cli-runner';

function initGit(cwd: string): void {
   const result = spawnSync('git', ['init'], { cwd, encoding: 'utf-8' });
   expect(result.status).toBe(0);
}

describe('Acceptance: fmt bug fixes', () => {
   let ctx = createTestContext();

   afterEach(() => {
      ctx.cleanup();
   });

   // 7.2: --dry-run --reset does not delete local preset directory
   it('--dry-run --reset does not delete local preset directory', () => {
      ctx = createTestContext({
         files: {
            'package.json': JSON.stringify({ name: 'test', version: '1.0.0', scripts: {} }),
         },
      });

      // First run to materialize the preset
      const firstRun = ctx.run(['fmt', 'web-vue', '--no-install']);
      expect(firstRun.exitCode).toBe(0);
      expect(ctx.luxFileExists('preset/fmt/web-vue/package.json')).toBe(true);

      // Run with --dry-run --reset — should NOT delete the preset
      const dryRunReset = ctx.run(['fmt', 'web-vue', '--dry-run', '--reset', '--no-install']);
      expect(dryRunReset.exitCode).toBe(0);
      expect(ctx.luxFileExists('preset/fmt/web-vue/package.json')).toBe(true);
      expect(dryRunReset.stdout).toContain('Would reset');
   });

   // 7.3: Invalid package.json returns exitCode 1
   it('invalid package.json returns exitCode 1', () => {
      ctx = createTestContext({
         files: {
            'package.json': '{ invalid json !!!',
         },
      });

      const result = ctx.run(['fmt', 'web-vue', '--no-install']);
      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain('not valid JSON');
   });

   // 7.4: Scripts merge with non-object scripts field succeeds safely
   it('scripts merge with non-object scripts field succeeds safely', () => {
      ctx = createTestContext({
         files: {
            'package.json': JSON.stringify({ name: 'test', version: '1.0.0', scripts: 'echo hello' }),
         },
      });

      const result = ctx.run(['fmt', 'web-vue', '--no-install']);
      expect(result.exitCode).toBe(0);

      const pkg = ctx.readJsonFile<{ scripts: Record<string, string> }>('package.json')!;
      expect(pkg.scripts).toBeDefined();
      expect(typeof pkg.scripts).toBe('object');
      expect(pkg.scripts['eslint']).toBeDefined();
   });

   // 7.5: --force controls husky pre-commit overwrite
   it('--force controls husky pre-commit overwrite', () => {
      ctx = createTestContext({
         files: {
            'package.json': JSON.stringify({ name: 'test', version: '1.0.0', scripts: {} }),
         },
      });
      initGit(ctx.tmpDir);

      // First run with husky
      ctx.run(['fmt', 'web-vue', '--husky', '--no-install']);
      expect(ctx.fileExists('.husky/pre-commit')).toBe(true);
      const originalContent = ctx.readFile('.husky/pre-commit');

      // Second run without --force — pre-commit should be skipped
      ctx.writeFile('.husky/pre-commit', 'custom content');
      const noForce = ctx.run(['fmt', 'web-vue', '--husky', '--no-install']);
      expect(noForce.stdout).toContain('Skipped .husky/pre-commit');
      expect(ctx.readFile('.husky/pre-commit')).toBe('custom content');

      // Third run with --force — pre-commit should be overwritten
      const withForce = ctx.run(['fmt', 'web-vue', '--husky', '--no-install', '--force']);
      expect(withForce.stdout).toContain('Overwrote .husky/pre-commit');
      expect(ctx.readFile('.husky/pre-commit')).toBe(originalContent);
   });

   // 7.6: Dep versions from deps.json are preserved in package.json
   it('dep versions from deps.json are preserved in package.json', () => {
      ctx = createTestContext({
         files: {
            'package.json': JSON.stringify({ name: 'test', version: '1.0.0', scripts: {} }),
         },
      });

      // First run to materialize
      ctx.run(['fmt', 'web-vue', '--no-install']);

      // Modify deps.json in local preset to pin a version
      const depsPath = 'preset/fmt/web-vue/deps.json';
      const deps = ctx.luxReadJsonFile<Record<string, unknown>>(depsPath)!;
      const topLevelDeps = deps.devDependencies as Record<string, string> | undefined;
      // Pin typescript (top-level dep) to a specific version
      if (topLevelDeps) {
         topLevelDeps.typescript = '^5.5.0';
         deps.devDependencies = topLevelDeps;
      }
      ctx.luxWriteJsonFile(depsPath, deps);

      // Remove typescript from project so it needs to be re-added
      const pkg = ctx.readJsonFile<Record<string, unknown>>('package.json')!;
      const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
      delete devDeps.typescript;
      pkg.devDependencies = devDeps;
      ctx.writeJsonFile('package.json', pkg);

      // Re-run — should use pinned version for typescript
      const result = ctx.run(['fmt', 'web-vue', '--no-install']);
      expect(result.exitCode).toBe(0);

      const updatedPkg = ctx.readJsonFile<{ devDependencies: Record<string, string> }>('package.json')!;
      expect(updatedPkg.devDependencies?.typescript).toBe('^5.5.0');
   });

   // 7.7: --force suggestion shown when all files skipped
   it('--force suggestion shown when all files skipped', () => {
      ctx = createTestContext({
         files: {
            'package.json': JSON.stringify({ name: 'test', version: '1.0.0', scripts: {} }),
         },
      });

      // First run to create all files
      ctx.run(['fmt', 'web-vue', '--no-install']);

      // Second run without --force — all files should be skipped
      const result = ctx.run(['fmt', 'web-vue', '--no-install']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('--force');
   });

   // 7.8: Builtin dry-run distinguishes create vs overwrite
   it('builtin dry-run distinguishes create vs overwrite', () => {
      ctx = createTestContext({
         files: {
            'package.json': JSON.stringify({ name: 'test', version: '1.0.0', scripts: {} }),
         },
      });

      // Dry run on empty project — should show "Would create"
      const createResult = ctx.run(['fmt', 'web-vue', '--dry-run', '--no-install']);
      expect(createResult.exitCode).toBe(0);
      expect(createResult.stdout).toContain('Would create');

      // Actually create files
      ctx.run(['fmt', 'web-vue', '--no-install']);

      // Dry run with --force on existing project — should show "Would overwrite"
      const overwriteResult = ctx.run(['fmt', 'web-vue', '--dry-run', '--no-install', '--force']);
      expect(overwriteResult.exitCode).toBe(0);
      expect(overwriteResult.stdout).toContain('Would overwrite');
   });
});
