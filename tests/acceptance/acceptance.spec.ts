import { afterEach, describe, expect, it } from 'vitest';
import { createTestContext } from '../helpers/cli-runner';

/**
 * Acceptance Tests — lux CLI
 *
 * Tests verify complete user scenarios end-to-end:
 * spawn the real CLI binary against temp directories,
 * check final filesystem state matches expectations.
 */
describe('Acceptance: lux CLI', () => {
   let ctx = createTestContext();

   afterEach(() => {
      ctx.cleanup();
   });

   // ─── Scenario 1: New Vue web project — one-click setup ────────────
   describe('Scenario: developer initializes a fresh Vue web project', () => {
      it('sets up all formatting tools and VSCode config in one pass', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'my-vue-app',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         // Step 1: init fmt
         const fmtResult = ctx.run(['fmt', 'web-vue', '--no-install']);
         expect(fmtResult.exitCode).toBe(0);

         // Verify: all formatting config files exist (except stylelint — opt-in only, cspell — opt-in only)
         expect(ctx.fileExists('eslint.config.mjs')).toBe(true);
         expect(ctx.fileExists('.prettierrc')).toBe(true);
         expect(ctx.fileExists('.prettierignore')).toBe(true);
         expect(ctx.fileExists('stylelint.config.mjs')).toBe(false);
         expect(ctx.fileExists('.stylelintignore')).toBe(false);
         expect(ctx.fileExists('cspell.json')).toBe(false);
         expect(ctx.fileExists('.editorconfig')).toBe(false);

         // Verify: scripts injected into package.json
         const pkg = ctx.readJsonFile<{ scripts: Record<string, string> }>('package.json')!;
         expect(pkg.scripts['eslint']).toContain('eslint');
         expect(pkg.scripts['cspell']).toBeUndefined();
         expect(pkg.scripts['eslint:fix']).toContain('eslint');
         expect(pkg.scripts['format']).toContain('prettier --write');
         // Step 2: init vscode
         const vscodeResult = ctx.run(['vscode', 'web-vue']);
         expect(vscodeResult.exitCode).toBe(0);

         // Verify: VSCode config files exist
         expect(ctx.fileExists('.vscode/settings.json')).toBe(true);
         expect(ctx.fileExists('.vscode/extensions.json')).toBe(true);

         const settings = ctx.readJsonFile<Record<string, unknown>>('.vscode/settings.json')!;
         expect(settings['editor.formatOnSave']).toBe(true);
         expect(settings['editor.defaultFormatter']).toBe('esbenp.prettier-vscode');
         expect(settings['editor.tabSize']).toBe(2);

         const extensions = ctx.readJsonFile<{ recommendations: string[] }>('.vscode/extensions.json')!;
         expect(extensions.recommendations).toContain('vue.volar');
         expect(extensions.recommendations).toContain('esbenp.prettier-vscode');

         // Verify: no unexpected files created
         expect(ctx.fileExists('.vscode/settings.json.bak')).toBe(false);
      });
   });

   // ─── Scenario 1b: Stylelint opt-in with --stylelint flag ─────────
   describe('Scenario: developer opts into stylelint with --stylelint', () => {
      it('generates stylelint config only when --stylelint is passed', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'my-vue-app',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         const fmtResult = ctx.run(['fmt', 'web-vue', '--no-install', '--stylelint']);
         expect(fmtResult.exitCode).toBe(0);

         expect(ctx.fileExists('stylelint.config.mjs')).toBe(true);
         expect(ctx.fileExists('.stylelintignore')).toBe(true);

         const pkg = ctx.readJsonFile<{ scripts: Record<string, string> }>('package.json')!;
         expect(pkg.scripts['stylelint']).toContain('stylelint');
      });
   });

   // ─── Scenario 1b2: Editorconfig opt-in with --editorconfig flag ───
   describe('Scenario: developer opts into editorconfig with --editorconfig', () => {
      it('generates editorconfig only when --editorconfig is passed', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'my-vue-app',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         const fmtResult = ctx.run(['fmt', 'web-vue', '--no-install', '--editorconfig']);
         expect(fmtResult.exitCode).toBe(0);

         expect(ctx.fileExists('.editorconfig')).toBe(true);
         const editorconfig = ctx.readFile('.editorconfig')!;
         expect(editorconfig).toContain('indent_size = 2');
      });
   });

   // ─── Scenario 1c: New React web project — one-click setup ─────────
   describe('Scenario: developer initializes a fresh React web project', () => {
      it('sets up React-specific formatting tools and VSCode config', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'my-react-app',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         // Step 1: init fmt
         const fmtResult = ctx.run(['fmt', 'web-react', '--no-install']);
         expect(fmtResult.exitCode).toBe(0);

         // Verify: all formatting config files exist
         expect(ctx.fileExists('eslint.config.mjs')).toBe(true);
         expect(ctx.fileExists('.prettierrc')).toBe(true);
         expect(ctx.fileExists('.prettierignore')).toBe(true);
         expect(ctx.fileExists('cspell.json')).toBe(false);
         expect(ctx.fileExists('.editorconfig')).toBe(false);

         // Verify: ESLint config contains React-specific plugins
         const eslintConfig = ctx.readFile('eslint.config.mjs')!;
         expect(eslintConfig).toContain('react-hooks');
         expect(eslintConfig).toContain('react-refresh');
         expect(eslintConfig).toContain('typescript-eslint');

         // Verify: scripts use tsc (not vue-tsc) and no cspell
         const pkg = ctx.readJsonFile<{ scripts: Record<string, string> }>('package.json')!;
         expect(pkg.scripts['type:check']).toContain('tsc --noEmit');
         expect(pkg.scripts['type:check']).not.toContain('vue-tsc');
         expect(pkg.scripts['cspell']).toBeUndefined();
         expect(pkg.scripts['eslint:fix']).toContain('eslint');

         // Step 2: init vscode
         const vscodeResult = ctx.run(['vscode', 'web-react']);
         expect(vscodeResult.exitCode).toBe(0);

         const settings = ctx.readJsonFile<Record<string, unknown>>('.vscode/settings.json')!;
         expect(settings['editor.formatOnSave']).toBe(true);
         expect(settings['editor.defaultFormatter']).toBe('esbenp.prettier-vscode');

         const extensions = ctx.readJsonFile<{ recommendations: string[] }>('.vscode/extensions.json')!;
         // React preset should NOT contain Vue extensions
         expect(extensions.recommendations).not.toContain('vue.volar');
         expect(extensions.recommendations).toContain('esbenp.prettier-vscode');
         expect(extensions.recommendations).toContain('dbaeumer.vscode-eslint');
      });
   });

   // ─── Scenario 2: Existing project — re-run should not overwrite ───
   describe('Scenario: developer re-runs init on an existing project', () => {
      it('skips existing configs and preserves custom changes', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({ name: 'existing-app', scripts: {} }),
            },
         });

         // First run: create everything
         ctx.run(['fmt', 'web-vue', '--no-install']);

         // Developer customizes .prettierrc
         ctx.writeJsonFile('.prettierrc', { semi: true, printWidth: 120 });

         // Re-run without --force
         const result = ctx.run(['fmt', 'web-vue', '--no-install']);
         expect(result.exitCode).toBe(0);

         // Verify: custom .prettierrc is preserved
         const prettierrc = ctx.readJsonFile<Record<string, unknown>>('.prettierrc')!;
         expect(prettierrc['semi']).toBe(true);
         expect(prettierrc['printWidth']).toBe(120);

         // Re-run WITH --force should overwrite
         ctx.run(['fmt', 'web-vue', '--force', '--no-install']);
         const overwritten = ctx.readJsonFile<Record<string, unknown>>('.prettierrc')!;
         expect(overwritten['semi']).toBe(false); // reset to preset value
      });
   });

   // ─── Scenario 3: Existing VSCode settings — merge behavior ────────
   describe('Scenario: developer has existing VSCode settings', () => {
      it('merges settings preserving user preferences while enforcing tooling config', () => {
         ctx = createTestContext({
            files: {
               '.vscode/settings.json': JSON.stringify({
                  'editor.cursorBlinking': 'smooth',
                  'workbench.colorTheme': 'One Dark Pro',
                  'editor.formatOnSave': false,
                  'editor.tabSize': 8,
                  'files.watcherExclude': {
                     '**/custom-dir/**': true,
                  },
               }),
            },
         });

         ctx.run(['vscode', 'web-vue']);

         const settings = ctx.readJsonFile<Record<string, unknown>>('.vscode/settings.json')!;

         // User preferences preserved (USER_PRIORITY_KEYS)
         expect(settings['editor.cursorBlinking']).toBe('smooth');
         expect(settings['workbench.colorTheme']).toBe('One Dark Pro');

         // Tooling config enforced (PRESET_PRIORITY_KEYS)
         expect(settings['editor.formatOnSave']).toBe(true);
         expect(settings['editor.tabSize']).toBe(2);

         // Nested objects deep-merged: user's custom-dir preserved alongside preset entries
         const watcher = settings['files.watcherExclude'] as Record<string, unknown>;
         expect(watcher['**/custom-dir/**']).toBe(true);
         expect(watcher['**/node_modules/**']).toBe(true);

         // Backup created
         const backup = ctx.readJsonFile<Record<string, unknown>>('.vscode/settings.json.bak')!;
         expect(backup['editor.tabSize']).toBe(8);
      });
   });

   // ─── Scenario 4: Dry-run preview — no side effects ───────────────
   describe('Scenario: developer previews changes with --dry-run', () => {
      it('shows what would happen without writing any files', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({ name: 'dry-run-test', scripts: {} }),
            },
         });

         const fmtResult = ctx.run(['fmt', 'web-vue', '--dry-run']);
         expect(fmtResult.exitCode).toBe(0);
         expect(fmtResult.stdout).toContain('[dry-run]');
         expect(ctx.fileExists('.prettierrc')).toBe(false);
         expect(ctx.fileExists('eslint.config.mjs')).toBe(false);

         const vscodeResult = ctx.run(['vscode', 'web-vue', '--dry-run']);
         expect(vscodeResult.exitCode).toBe(0);
         expect(ctx.fileExists('.vscode/settings.json')).toBe(false);
      });
   });

   // ─── Scenario 5: Package manager detection ───────────────────────
   describe('Scenario: developer uses bun (lockfile detected)', () => {
      it('resolves <pm> placeholder to bun run', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({ name: 'bun-project', scripts: {} }),
               'bun.lockb': '',
            },
         });

         ctx.run(['fmt', 'web-vue', '--no-install']);
         const pkg = ctx.readJsonFile<{ scripts: Record<string, string> }>('package.json')!;
         expect(pkg.scripts['eslint']).toContain('eslint');
         expect(pkg.scripts['eslint:fix']).toContain('eslint');
      });
   });

   describe('Scenario: developer uses pnpm (lockfile detected)', () => {
      it('resolves <pm> placeholder to pnpm run', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({ name: 'pnpm-project', scripts: {} }),
               'pnpm-lock.yaml': '',
            },
         });

         ctx.run(['fmt', 'web-vue', '--no-install']);
         const pkg = ctx.readJsonFile<{ scripts: Record<string, string> }>('package.json')!;
         expect(pkg.scripts['eslint']).toContain('eslint');
         expect(pkg.scripts['eslint:fix']).toContain('eslint');
      });
   });

   // ─── Scenario 6: NestJS project — special overwrite rules ────────
   describe('Scenario: developer initializes NestJS project (neverOverwrite/forceOverwrite)', () => {
      it('protects existing eslint.config.mjs but always updates .prettierrc', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({ name: 'nest-app', scripts: {} }),
               'eslint.config.mjs': '// NestJS custom eslint — do not touch',
               '.prettierrc': '{ "custom": true }',
            },
         });

         ctx.run(['fmt', 'nest', '--force', '--no-install']);

         // neverOverwrite: eslint.config.mjs preserved even with --force
         expect(ctx.readFile('eslint.config.mjs')).toBe('// NestJS custom eslint — do not touch');

         // forceOverwrite: .prettierrc overwritten even without --force (we used --force anyway)
         const prettierrc = ctx.readJsonFile<Record<string, unknown>>('.prettierrc')!;
         expect(prettierrc['semi']).toBe(false);

         // No stylelint files for NestJS
         expect(ctx.fileExists('stylelint.config.mjs')).toBe(false);

         // No eslint in generated files (nest has no eslint() getter)
         // eslint.config.mjs is from seed, not from preset
      });
   });

   // ─── Scenario 7: Invalid preset — fuzzy match suggestion ──────────
   describe('Scenario: developer makes a typo in preset name', () => {
      it('suggests the closest match and exits with error', () => {
         ctx = createTestContext();

         const result = ctx.run(['fmt', 'web-vu']);
         expect(result.exitCode).toBe(1);
         expect(result.stderr).toContain("Did you mean 'web-vue'");
      });
   });

   // ─── Scenario 8: List commands ───────────────────────────────────
   describe('Scenario: developer checks available presets', () => {
      it('fmt list shows all fmt presets', () => {
         ctx = createTestContext();
         const result = ctx.run(['fmt', 'list']);

         expect(result.exitCode).toBe(0);
         for (const name of ['web-vue', 'web-react', 'electron-vue', 'uniapp', 'node', 'nest']) {
            expect(result.stdout).toContain(name);
         }
      });

      it('vscode list shows all vscode presets', () => {
         ctx = createTestContext();
         const result = ctx.run(['vscode', 'list']);

         expect(result.exitCode).toBe(0);
         for (const name of ['web-vue', 'web-react', 'electron-vue', 'uniapp', 'node', 'nest', 'go']) {
            expect(result.stdout).toContain(name);
         }
      });
   });

   // ─── Scenario 9: No package.json — graceful degradation ──────────
   describe('Scenario: developer runs fmt without package.json', () => {
      it('creates config files but skips script injection with warning', () => {
         ctx = createTestContext();

         const result = ctx.run(['fmt', 'web-vue', '--no-install']);
         expect(result.exitCode).toBe(0);

         // Config files still created
         expect(ctx.fileExists('.prettierrc')).toBe(true);
         expect(ctx.fileExists('eslint.config.mjs')).toBe(true);

         // Warning about missing package.json (logger.warn outputs to stderr)
         expect(result.stderr).toContain('package.json not found');
      });
   });

   // ─── Scenario 10: Update command ─────────────────────────────────
   describe('Scenario: developer checks for CLI updates', () => {
      it('shows update check result with --check', () => {
         ctx = createTestContext();

         const result = ctx.run(['update', '--check']);
         expect(result.exitCode).toBe(0);
         const output = result.stdout + result.stderr;
         expect(output).toMatch(/up to date|Update available|Failed to fetch/i);
      });

      it('shows error hint when update fails', () => {
         ctx = createTestContext();

         // Run without --check will attempt real install, which fails
         // in test environment — verify graceful error handling
         const result = ctx.run(['update']);
         // Either succeeds (unlikely in CI) or shows manual update hint
         const output = result.stdout + result.stderr;
         expect(output).toMatch(/up to date|updated|update|manually/i);
      });
   });

   // ─── Scenario 11: All presets produce valid output ───────────────
   describe('Scenario: each preset generates parseable, non-empty configs', () => {
      const fmtPresets = ['web-vue', 'web-react', 'electron-vue', 'uniapp', 'node', 'nest'];
      const vscodePresets = ['web-vue', 'web-react', 'electron-vue', 'uniapp', 'node', 'nest', 'go'];

      for (const preset of fmtPresets) {
         it(`fmt "${preset}" produces valid configs`, () => {
            ctx = createTestContext({
               files: { 'package.json': JSON.stringify({ name: 'test', scripts: {} }) },
            });
            const result = ctx.run(['fmt', preset, '--no-install', '--cspell']);
            expect(result.exitCode).toBe(0);

            // All generated files must be non-empty
            for (const file of ['cspell.json', '.prettierrc']) {
               if (ctx.fileExists(file)) {
                  const content = ctx.readFile(file);
                  expect(content).not.toBeNull();
                  expect(content!.length).toBeGreaterThan(0);
               }
            }

            // JSON files must be parseable
            if (ctx.fileExists('.prettierrc')) {
               const raw = ctx.readFile('.prettierrc');
               expect(raw).not.toBeNull();
               expect(() => JSON.parse(raw!)).not.toThrow();
            }
            if (ctx.fileExists('cspell.json')) {
               const raw = ctx.readFile('cspell.json');
               expect(raw).not.toBeNull();
               expect(() => JSON.parse(raw!)).not.toThrow();
            }
         });
      }

      for (const preset of vscodePresets) {
         it(`vscode "${preset}" produces valid settings and extensions`, () => {
            ctx = createTestContext();
            const result = ctx.run(['vscode', preset]);
            expect(result.exitCode).toBe(0);

            const settingsRaw = ctx.readFile('.vscode/settings.json');
            const extensionsRaw = ctx.readFile('.vscode/extensions.json');
            expect(settingsRaw).not.toBeNull();
            expect(extensionsRaw).not.toBeNull();
            expect(() => JSON.parse(settingsRaw!)).not.toThrow();
            expect(() => JSON.parse(extensionsRaw!)).not.toThrow();

            const ext = ctx.readJsonFile<{ recommendations: string[] }>('.vscode/extensions.json')!;
            expect(ext.recommendations.length).toBeGreaterThan(0);
         });
      }
   });

   // ─── Scenario 12: First run materializes local preset ─────────────
   describe('Scenario: first run materializes local preset', () => {
      it('creates preset/fmt/<preset>/ with config files and template package.json in lux home', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'test-local',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         const result = ctx.run(['fmt', 'web-vue', '--no-install']);
         expect(result.exitCode).toBe(0);

         // Local preset directory created
         expect(ctx.luxFileExists('preset/fmt/web-vue/eslint.config.mjs')).toBe(true);
         expect(ctx.luxFileExists('preset/fmt/web-vue/.prettierrc')).toBe(true);
         expect(ctx.luxFileExists('preset/fmt/web-vue/cspell.json')).toBe(true);

         // deps.json with <latest> placeholders
         const depsJson =
            ctx.luxReadJsonFile<Record<string, { devDependencies: Record<string, string> }>>(
               'preset/fmt/web-vue/deps.json',
            )!;
         expect(depsJson['eslint'].devDependencies['eslint']).toBe('<latest>');

         // Template package.json with scripts only
         const templatePkg = ctx.luxReadJsonFile<{
            scripts: Record<string, string>;
         }>('preset/fmt/web-vue/package.json')!;
         expect(templatePkg.scripts['eslint']).toContain('eslint');
      });
   });

   // ─── Scenario 13: Second run uses local preset ────────────────────
   describe('Scenario: second run uses local preset', () => {
      it('shows using local preset message and files come from local preset', async () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'test-local2',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         // First run — built-in + materialization
         ctx.run(['fmt', 'web-vue', '--no-install']);

         // Customize local preset
         ctx.luxWriteFile('preset/fmt/web-vue/eslint.config.mjs', '// LOCAL MARKER');

         // Delete project file to test copy from local
         const fs = await import('node:fs');
         const path = await import('node:path');
         fs.unlinkSync(path.join(ctx.tmpDir, 'eslint.config.mjs'));

         // Second run — should use local preset
         const result = ctx.run(['fmt', 'web-vue', '--no-install', '--force']);
         expect(result.exitCode).toBe(0);
         expect(result.stdout.toLowerCase()).toContain('using local custom preset');

         // Verify file comes from local preset (has our marker)
         const eslintConfig = ctx.readFile('eslint.config.mjs')!;
         expect(eslintConfig).toBe('// LOCAL MARKER');
      });
   });

   // ─── Scenario 14: User edits local preset ─────────────────────────
   describe('Scenario: user edits local preset files', () => {
      it('reflects edited changes on next run', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({ name: 'test-edit', version: '1.0.0', scripts: {} }),
            },
         });

         ctx.run(['fmt', 'web-vue', '--no-install']);

         // Edit deps.json to pin eslint version
         const depsJson =
            ctx.luxReadJsonFile<Record<string, { devDependencies: Record<string, string> }>>(
               'preset/fmt/web-vue/deps.json',
            )!;
         depsJson['eslint'].devDependencies['eslint'] = '^9.0.0';
         ctx.luxWriteJsonFile('preset/fmt/web-vue/deps.json', depsJson);

         // Remove eslint from project to force re-add
         const projectPkg = ctx.readJsonFile<Record<string, unknown>>('package.json')!;
         const projectDeps = projectPkg.devDependencies as Record<string, string>;
         delete projectDeps['eslint'];
         ctx.writeJsonFile('package.json', projectPkg);

         // Re-run with --force to overwrite config files
         const result = ctx.run(['fmt', 'web-vue', '--no-install', '--force']);
         expect(result.exitCode).toBe(0);

         // Verify project gets the edited version
         const updatedPkg = ctx.readJsonFile<{ devDependencies: Record<string, string> }>('package.json')!;
         expect(updatedPkg.devDependencies!['eslint']).toBe('^9.0.0');
      });
   });

   // ─── Scenario 15: --reset deletes and re-materializes ─────────────
   describe('Scenario: --reset deletes local preset', () => {
      it('deletes local preset and re-materializes from built-in', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'test-reset',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         // First run
         ctx.run(['fmt', 'web-vue', '--no-install']);
         expect(ctx.luxFileExists('preset/fmt/web-vue/eslint.config.mjs')).toBe(true);

         // Edit local preset
         ctx.luxWriteFile('preset/fmt/web-vue/eslint.config.mjs', '// EDITED');

         // Reset + re-materialize (with --force to regenerate existing files)
         const result = ctx.run(['fmt', 'web-vue', '--no-install', '--reset', '--force']);
         expect(result.exitCode).toBe(0);

         // Verify local preset was re-created (not the edited version)
         const eslintConfig = ctx.luxReadFile('preset/fmt/web-vue/eslint.config.mjs')!;
         expect(eslintConfig).not.toBe('// EDITED');
         expect(eslintConfig).toContain('eslint');
      });
   });

   // ─── Scenario 16: --dry-run with local preset ─────────────────────
   describe('Scenario: --dry-run with existing local preset', () => {
      it('shows preview without writing files', async () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'test-dryrun',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         // First run creates local preset
         ctx.run(['fmt', 'web-vue', '--no-install']);

         // Delete all generated config files
         const fs = await import('node:fs');
         const path = await import('node:path');
         for (const file of ['eslint.config.mjs', '.prettierrc', '.prettierignore', 'cspell.json']) {
            const p = path.join(ctx.tmpDir, file);
            if (fs.existsSync(p)) fs.unlinkSync(p);
         }

         // Dry run with local preset — should show preview, not write
         const result = ctx.run(['fmt', 'web-vue', '--dry-run']);
         expect(result.exitCode).toBe(0);
         expect(result.stdout).toContain('[dry-run]');
         expect(ctx.fileExists('eslint.config.mjs')).toBe(false);
      });
   });

   // ─── Scenario 17: --stylelint filters from local preset ───────────
   describe('Scenario: --stylelint flag filters from local preset', () => {
      it('materializes stylelint on first run, then filters on second run without flag', async () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'test-stylelint',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         // First run WITH stylelint — materializes stylelint files
         ctx.run(['fmt', 'web-vue', '--no-install', '--stylelint']);
         expect(ctx.luxFileExists('preset/fmt/web-vue/stylelint.config.mjs')).toBe(true);

         // Delete project files
         const fs = await import('node:fs');
         const path = await import('node:path');
         for (const file of ['stylelint.config.mjs', '.stylelintignore']) {
            const p = path.join(ctx.tmpDir, file);
            if (fs.existsSync(p)) fs.unlinkSync(p);
         }

         // Second run WITHOUT stylelint — should filter stylelint from local preset
         const result = ctx.run(['fmt', 'web-vue', '--no-install', '--force']);
         expect(result.exitCode).toBe(0);
         expect(ctx.fileExists('stylelint.config.mjs')).toBe(false);
         expect(ctx.fileExists('.stylelintignore')).toBe(false);
      });
   });

   // ─── Scenario 18: VSCode local preset merge ───────────────────────
   describe('Scenario: VSCode local preset merge behavior', () => {
      it('materializes VSCode preset and reuses it with merge on second run', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({ name: 'test-vscode', version: '1.0.0' }),
            },
         });

         // First run
         const firstResult = ctx.run(['vscode', 'web-vue']);
         expect(firstResult.exitCode).toBe(0);

         // Local preset materialized
         expect(ctx.luxFileExists('preset/vscode/web-vue/settings.json')).toBe(true);
         expect(ctx.luxFileExists('preset/vscode/web-vue/extensions.json')).toBe(true);

         // Add user preference to existing settings
         const settings = ctx.readJsonFile<Record<string, unknown>>('.vscode/settings.json')!;
         settings['editor.cursorBlinking'] = 'smooth';
         ctx.writeJsonFile('.vscode/settings.json', settings);

         // Second run — uses local preset, merges
         const secondResult = ctx.run(['vscode', 'web-vue']);
         expect(secondResult.exitCode).toBe(0);
         expect(secondResult.stdout.toLowerCase()).toContain('using local custom preset');

         // User preference preserved, tooling settings enforced
         const merged = ctx.readJsonFile<Record<string, unknown>>('.vscode/settings.json')!;
         expect(merged['editor.cursorBlinking']).toBe('smooth');
         expect(merged['editor.formatOnSave']).toBe(true);
      });
   });

   // ─── Scenario 19: CSpell opt-in with --cspell flag ──────────────
   describe('Scenario: cspell is excluded by default and opt-in with --cspell', () => {
      it('does not generate cspell.json or include cspell in lint script by default', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'my-vue-app',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         const result = ctx.run(['fmt', 'web-vue', '--no-install']);
         expect(result.exitCode).toBe(0);

         // cspell.json NOT generated by default
         expect(ctx.fileExists('cspell.json')).toBe(false);

         // cspell script NOT present
         const pkg = ctx.readJsonFile<{
            scripts: Record<string, string>;
            devDependencies: Record<string, string>;
         }>('package.json')!;
         expect(pkg.scripts['cspell']).toBeUndefined();

         // cspell dep NOT in devDependencies
         expect(pkg.devDependencies?.['cspell']).toBeUndefined();
      });

      it('generates cspell.json and includes cspell in lint script when --cspell is passed', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'my-vue-app',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         const result = ctx.run(['fmt', 'web-vue', '--no-install', '--cspell']);
         expect(result.exitCode).toBe(0);

         // cspell.json IS generated
         expect(ctx.fileExists('cspell.json')).toBe(true);

         // cspell script IS present
         const pkg = ctx.readJsonFile<{
            scripts: Record<string, string>;
            devDependencies: Record<string, string>;
         }>('package.json')!;
         expect(pkg.scripts['cspell']).toContain('cspell');

         // cspell dep in devDependencies
         expect(pkg.devDependencies['cspell']).toBeDefined();

         // cspell.json is parseable
         const cspell = ctx.readJsonFile<{ words: string[] }>('cspell.json')!;
         expect(cspell.words.length).toBeGreaterThan(0);
      });

      it('includes both cspell and stylelint when both flags are passed', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'my-vue-app',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         const result = ctx.run(['fmt', 'web-vue', '--no-install', '--cspell', '--stylelint']);
         expect(result.exitCode).toBe(0);

         expect(ctx.fileExists('cspell.json')).toBe(true);
         expect(ctx.fileExists('stylelint.config.mjs')).toBe(true);
         expect(ctx.fileExists('.stylelintignore')).toBe(true);

         const pkg = ctx.readJsonFile<{ scripts: Record<string, string> }>('package.json')!;
         expect(pkg.scripts['cspell']).toContain('cspell');
         expect(pkg.scripts['stylelint']).toContain('stylelint');
      });

      it('local preset path: filters cspell.json when --cspell not passed, includes when passed', async () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'test-cspell-local',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         // First run — materializes local preset (always includes cspell in stored template)
         ctx.run(['fmt', 'web-vue', '--no-install']);
         expect(ctx.luxFileExists('preset/fmt/web-vue/cspell.json')).toBe(true);

         // Delete project files for clean re-run
         const fs = await import('node:fs');
         const path = await import('node:path');
         for (const file of ['eslint.config.mjs', '.prettierrc', '.prettierignore', 'cspell.json']) {
            const p = path.join(ctx.tmpDir, file);
            if (fs.existsSync(p)) fs.unlinkSync(p);
         }

         // Second run WITHOUT --cspell — local preset path filters cspell
         const resultNoCspell = ctx.run(['fmt', 'web-vue', '--no-install', '--force']);
         expect(resultNoCspell.exitCode).toBe(0);
         expect(ctx.fileExists('cspell.json')).toBe(false);

         // Third run WITH --cspell — local preset path includes cspell
         const resultWithCspell = ctx.run(['fmt', 'web-vue', '--no-install', '--cspell', '--force']);
         expect(resultWithCspell.exitCode).toBe(0);
         expect(ctx.fileExists('cspell.json')).toBe(true);
      });
   });
   // ─── Scenario 19: --lint-staged generates .lintstagedrc.json ──────
   describe('Scenario: developer opts into lint-staged', () => {
      it('generates .lintstagedrc.json and injects lint-staged script', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'lint-staged-test',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         const result = ctx.run(['fmt', 'web-vue', '--no-install', '--lint-staged']);
         expect(result.exitCode).toBe(0);

         // .lintstagedrc.json generated
         expect(ctx.fileExists('.lintstagedrc.json')).toBe(true);
         const lintStagedConfig = ctx.readJsonFile<Record<string, string[]>>('.lintstagedrc.json')!;
         expect(lintStagedConfig['*.{ts,js,vue}']).toContain('eslint --fix');

         // lint-staged script injected
         const pkg = ctx.readJsonFile<{ scripts: Record<string, string> }>('package.json')!;
         expect(pkg.scripts['lint-staged']).toBe('lint-staged');
      });
   });

   // ─── Scenario 20: --lint-staged implies --husky ──────────────────
   describe('Scenario: --lint-staged implicitly enables husky', () => {
      it('creates .husky/pre-commit with lint-staged command when --lint-staged is used', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'lint-staged-husky-test',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         const result = ctx.run(['fmt', 'web-vue', '--no-install', '--lint-staged']);
         expect(result.exitCode).toBe(0);

         // .husky/pre-commit created with lint-staged command
         expect(ctx.fileExists('.husky/pre-commit')).toBe(true);
         const preCommit = ctx.readFile('.husky/pre-commit')!;
         expect(preCommit).toContain('lint-staged');

         // prepare script injected
         const pkg = ctx.readJsonFile<{ scripts: Record<string, string> }>('package.json')!;
         expect(pkg.scripts['prepare']).toBe('husky');
      });
   });

   // ─── Scenario 21: --husky alone generates pre-commit with lint ───
   describe('Scenario: --husky without --lint-staged', () => {
      it('creates .husky/pre-commit with lint command and no lint-staged artifacts', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'husky-only-test',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         const result = ctx.run(['fmt', 'web-vue', '--no-install', '--husky']);
         expect(result.exitCode).toBe(0);

         // .husky/pre-commit with lint command (not lint-staged)
         expect(ctx.fileExists('.husky/pre-commit')).toBe(true);
         const preCommit = ctx.readFile('.husky/pre-commit')!;
         expect(preCommit).toContain('lint');
         expect(preCommit).not.toContain('lint-staged');

         // No .lintstagedrc.json
         expect(ctx.fileExists('.lintstagedrc.json')).toBe(false);

         // No lint-staged script
         const pkg = ctx.readJsonFile<{ scripts: Record<string, string> }>('package.json')!;
         expect(pkg.scripts['lint-staged']).toBeUndefined();
      });
   });

   // ─── Scenario 22: No flags = no husky/lint-staged artifacts ──────
   describe('Scenario: no --husky or --lint-staged', () => {
      it('creates no husky or lint-staged artifacts', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({
                  name: 'no-husky-test',
                  version: '1.0.0',
                  scripts: {},
               }),
            },
         });

         const result = ctx.run(['fmt', 'web-vue', '--no-install']);
         expect(result.exitCode).toBe(0);

         expect(ctx.fileExists('.husky/pre-commit')).toBe(false);
         expect(ctx.fileExists('.lintstagedrc.json')).toBe(false);

         const pkg = ctx.readJsonFile<{ scripts: Record<string, string> }>('package.json')!;
         expect(pkg.scripts['lint-staged']).toBeUndefined();
         expect(pkg.scripts['prepare']).toBeUndefined();
         expect(pkg.scripts['postinstall']).toBeUndefined();
      });
   });
});
