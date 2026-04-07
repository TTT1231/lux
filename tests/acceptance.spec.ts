import { afterEach, describe, expect, it } from 'vitest';
import { createTestContext } from './helpers/cli-runner';

/**
 * Acceptance Tests — trw1 CLI
 *
 * Tests verify complete user scenarios end-to-end:
 * spawn the real CLI binary against temp directories,
 * check final filesystem state matches expectations.
 */
describe('Acceptance: trw1 CLI', () => {
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
         const fmtResult = ctx.run(['fmt', 'init', 'web', '--no-install']);
         expect(fmtResult.exitCode).toBe(0);

         // Verify: all formatting config files exist
         expect(ctx.fileExists('eslint.config.mjs')).toBe(true);
         expect(ctx.fileExists('.prettierrc')).toBe(true);
         expect(ctx.fileExists('.prettierignore')).toBe(true);
         expect(ctx.fileExists('stylelint.config.mjs')).toBe(true);
         expect(ctx.fileExists('.stylelintignore')).toBe(true);
         expect(ctx.fileExists('cspell.json')).toBe(true);
         expect(ctx.fileExists('.editorconfig')).toBe(true);

         // Verify: scripts injected into package.json
         const pkg = ctx.readJsonFile<{ scripts: Record<string, string> }>('package.json')!;
         expect(pkg.scripts['lint']).toBe('eslint .');
         expect(pkg.scripts['format']).toBeDefined();
         expect(pkg.scripts['code:check']).toContain('npm run lint && npm run format:check');

         // Verify: config contents are valid (spot checks)
         const prettierrc = ctx.readJsonFile<Record<string, unknown>>('.prettierrc')!;
         expect(prettierrc['semi']).toBe(false);
         expect(prettierrc['singleQuote']).toBe(true);

         const editorconfig = ctx.readFile('.editorconfig')!;
         expect(editorconfig).toContain('indent_size = 2');

         // Step 2: init vscode
         const vscodeResult = ctx.run(['vscode', 'init', 'web']);
         expect(vscodeResult.exitCode).toBe(0);

         // Verify: VSCode config files exist
         expect(ctx.fileExists('.vscode/settings.json')).toBe(true);
         expect(ctx.fileExists('.vscode/extensions.json')).toBe(true);

         const settings = ctx.readJsonFile<Record<string, unknown>>('.vscode/settings.json')!;
         expect(settings['editor.formatOnSave']).toBe(true);
         expect(settings['editor.defaultFormatter']).toBe('esbenp.prettier-vscode');
         expect(settings['editor.tabSize']).toBe(2);

         const extensions = ctx.readJsonFile<{ recommendations: string[] }>(
            '.vscode/extensions.json',
         )!;
         expect(extensions.recommendations).toContain('vue.volar');
         expect(extensions.recommendations).toContain('esbenp.prettier-vscode');

         // Verify: no unexpected files created
         expect(ctx.fileExists('.vscode/settings.json.bak')).toBe(false);
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
         ctx.run(['fmt', 'init', 'web', '--no-install']);

         // Developer customizes .prettierrc
         ctx.writeJsonFile('.prettierrc', { semi: true, printWidth: 120 });

         // Re-run without --force
         const result = ctx.run(['fmt', 'init', 'web', '--no-install']);
         expect(result.exitCode).toBe(0);

         // Verify: custom .prettierrc is preserved
         const prettierrc = ctx.readJsonFile<Record<string, unknown>>('.prettierrc')!;
         expect(prettierrc['semi']).toBe(true);
         expect(prettierrc['printWidth']).toBe(120);

         // Re-run WITH --force should overwrite
         ctx.run(['fmt', 'init', 'web', '--force', '--no-install']);
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

         ctx.run(['vscode', 'init', 'web']);

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

         const fmtResult = ctx.run(['fmt', 'init', 'web', '--dry-run']);
         expect(fmtResult.exitCode).toBe(0);
         expect(fmtResult.stdout).toContain('[dry-run]');
         expect(ctx.fileExists('.prettierrc')).toBe(false);
         expect(ctx.fileExists('eslint.config.mjs')).toBe(false);

         const vscodeResult = ctx.run(['vscode', 'init', 'web', '--dry-run']);
         expect(vscodeResult.exitCode).toBe(0);
         expect(ctx.fileExists('.vscode/settings.json')).toBe(false);
      });
   });

   // ─── Scenario 5: Package manager detection ───────────────────────
   describe('Scenario: developer uses pnpm (lockfile detected)', () => {
      it('resolves <pm> placeholder to pnpm run', () => {
         ctx = createTestContext({
            files: {
               'package.json': JSON.stringify({ name: 'pnpm-project', scripts: {} }),
               'pnpm-lock.yaml': '',
            },
         });

         ctx.run(['fmt', 'init', 'web', '--no-install']);
         const pkg = ctx.readJsonFile<{ scripts: Record<string, string> }>('package.json')!;
         expect(pkg.scripts['code:check']).toBe('pnpm run lint && pnpm run format:check');
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

         ctx.run(['fmt', 'init', 'nest', '--force', '--no-install']);

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

         const result = ctx.run(['fmt', 'init', 'webs']);
         expect(result.exitCode).toBe(1);
         expect(result.stderr).toContain("Did you mean 'web'");
      });
   });

   // ─── Scenario 8: List commands ───────────────────────────────────
   describe('Scenario: developer checks available presets', () => {
      it('fmt list shows all fmt presets', () => {
         ctx = createTestContext();
         const result = ctx.run(['fmt', 'list']);

         expect(result.exitCode).toBe(0);
         for (const name of ['web', 'electron', 'uniapp', 'node', 'nest']) {
            expect(result.stdout).toContain(name);
         }
      });

      it('vscode list shows all vscode presets', () => {
         ctx = createTestContext();
         const result = ctx.run(['vscode', 'list']);

         expect(result.exitCode).toBe(0);
         for (const name of ['web', 'electron', 'uniapp', 'node', 'nest', 'go']) {
            expect(result.stdout).toContain(name);
         }
      });
   });

   // ─── Scenario 9: No package.json — graceful degradation ──────────
   describe('Scenario: developer runs fmt init without package.json', () => {
      it('creates config files but skips script injection with warning', () => {
         ctx = createTestContext();

         const result = ctx.run(['fmt', 'init', 'web', '--no-install']);
         expect(result.exitCode).toBe(0);

         // Config files still created
         expect(ctx.fileExists('.prettierrc')).toBe(true);
         expect(ctx.fileExists('eslint.config.mjs')).toBe(true);

         // Warning about missing package.json
         expect(result.stdout).toContain('package.json not found');
      });
   });

   // ─── Scenario 10: All presets produce valid output ───────────────
   describe('Scenario: each preset generates parseable, non-empty configs', () => {
      const fmtPresets = ['web', 'electron', 'uniapp', 'node', 'nest'];
      const vscodePresets = ['web', 'electron', 'uniapp', 'node', 'nest', 'go'];

      for (const preset of fmtPresets) {
         it(`fmt "${preset}" produces valid configs`, () => {
            ctx = createTestContext({
               files: { 'package.json': JSON.stringify({ name: 'test', scripts: {} }) },
            });
            const result = ctx.run(['fmt', 'init', preset, '--no-install']);
            expect(result.exitCode).toBe(0);

            // All generated files must be non-empty
            for (const file of ['cspell.json', '.editorconfig', '.prettierrc']) {
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
            const result = ctx.run(['vscode', 'init', preset]);
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
});
