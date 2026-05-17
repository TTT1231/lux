import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
   getLocalPresetDir,
   localPresetExists,
   materializeFmtPreset,
   materializeVscodePreset,
   applyLocalFmtPreset,
   applyLocalVscodePreset,
   resetLocalPreset,
   resolveLocalDeps,
   listCustomPresets,
   isValidCustomPreset,
   isValidPresetName,
   filterScripts,
   detectPresetCapabilities,
} from '../../../src/core/local-preset';
import type { FmtPreset, GenerateOptions } from '../../../src/presets/types';

function createTempDir(): string {
   return fs.mkdtempSync(path.join(os.tmpdir(), 'lux-local-preset-test-'));
}

let luxHome: string;
let savedLuxHome: string | undefined;

beforeAll(() => {
   luxHome = createTempDir();
   savedLuxHome = process.env.LUX_HOME;
   process.env.LUX_HOME = luxHome;
});

afterAll(() => {
   process.env.LUX_HOME = savedLuxHome;
   fs.rmSync(luxHome, { recursive: true, force: true });
});

beforeEach(() => {
   const presetDir = path.join(luxHome, 'preset');
   if (fs.existsSync(presetDir)) {
      fs.rmSync(presetDir, { recursive: true, force: true });
   }
});

const baseOpts: GenerateOptions = {
   cwd: '',
   force: false,
   dryRun: false,
   noStylelint: false,
   noEditorconfig: false,
   noCspell: false,
   noHusky: false,
   noLintStaged: false,
};

const basePreset: FmtPreset = {
   name: 'test-preset',
   description: 'Test preset',
   eslint: () => 'export default []\n',
   prettier: () => JSON.stringify({ semi: false }, null, 2) + '\n',
   cspell: () => JSON.stringify({ words: ['test'] }, null, 2) + '\n',
   stylelint: () => 'export default {}\n',
   stylelintIgnore: () => 'node_modules/\n',
   editorconfig: () => 'root = true\n',
   dependencies: {
      dev: [
         'eslint',
         'prettier',
         'cspell',
         'stylelint',
         'stylelint-config-standard-scss',
         'postcss-html',
         'postcss-scss',
      ],
   },
   scripts: {
      lint: 'eslint .',
      format: 'prettier --write "src/**/*.{ts,js}"',
      'format:check': '<pm> prettier --check "src/**/*.{ts,js}"',
      stylelint: 'stylelint "src/**/*.{css,scss}"',
   },
};

describe('getLocalPresetDir', () => {
   it('returns correct path for fmt preset', () => {
      const result = getLocalPresetDir('fmt', 'web-vue');
      expect(result).toBe(path.join(luxHome, 'preset', 'fmt', 'web-vue'));
   });

   it('returns correct path for vscode preset', () => {
      const result = getLocalPresetDir('vscode', 'web-react');
      expect(result).toBe(path.join(luxHome, 'preset', 'vscode', 'web-react'));
   });
});

describe('localPresetExists', () => {
   let tmpDir: string;

   afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   it('returns false when directory does not exist', () => {
      tmpDir = createTempDir();
      expect(localPresetExists('fmt', 'web-vue')).toBe(false);
   });

   it('returns true when directory exists', () => {
      tmpDir = createTempDir();
      const presetDir = getLocalPresetDir('fmt', 'web-vue');
      fs.mkdirSync(presetDir, { recursive: true });
      expect(localPresetExists('fmt', 'web-vue')).toBe(true);
   });
});

describe('resetLocalPreset', () => {
   let tmpDir: string;

   afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   it('deletes the local preset directory', () => {
      tmpDir = createTempDir();
      const presetDir = getLocalPresetDir('fmt', 'web-vue');
      fs.mkdirSync(presetDir, { recursive: true });
      fs.writeFileSync(path.join(presetDir, 'test.txt'), 'hello');

      resetLocalPreset('fmt', 'web-vue');

      expect(fs.existsSync(presetDir)).toBe(false);
   });

   it('does not throw when directory does not exist', () => {
      tmpDir = createTempDir();
      expect(() => resetLocalPreset('fmt', 'nonexistent')).not.toThrow();
   });
});

describe('materializeFmtPreset', () => {
   let tmpDir: string;

   afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   it('generates all config files from preset getters', () => {
      tmpDir = createTempDir();

      materializeFmtPreset('test-preset', basePreset, {
         ...baseOpts,
         cwd: tmpDir,
      });

      const presetDir = getLocalPresetDir('fmt', 'test-preset');
      expect(fs.existsSync(path.join(presetDir, 'eslint.config.mjs'))).toBe(true);
      expect(fs.existsSync(path.join(presetDir, '.prettierrc'))).toBe(true);
      expect(fs.existsSync(path.join(presetDir, '.prettierignore'))).toBe(false);
      expect(fs.existsSync(path.join(presetDir, 'cspell.json'))).toBe(true);
      expect(fs.existsSync(path.join(presetDir, 'stylelint.config.mjs'))).toBe(true);
      expect(fs.existsSync(path.join(presetDir, '.stylelintignore'))).toBe(true);
      expect(fs.existsSync(path.join(presetDir, '.editorconfig'))).toBe(true);
      expect(fs.readFileSync(path.join(presetDir, 'eslint.config.mjs'), 'utf-8')).toBe(
         'export default []\n',
      );
   });

   it('writes template package.json with ALL deps and scripts regardless of flags', () => {
      tmpDir = createTempDir();

      materializeFmtPreset('test-preset', basePreset, {
         ...baseOpts,
         cwd: tmpDir,
         noStylelint: true,
         noEditorconfig: true,
      });

      const presetDir = getLocalPresetDir('fmt', 'test-preset');
      const pkgPath = path.join(presetDir, 'package.json');
      expect(fs.existsSync(pkgPath)).toBe(true);

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      expect(pkg.devDependencies['eslint']).toBe('<latest>');
      expect(pkg.devDependencies['prettier']).toBe('<latest>');
      expect(pkg.devDependencies['stylelint']).toBe('<latest>');
      expect(pkg.devDependencies['postcss-html']).toBe('<latest>');
      expect(pkg.scripts['stylelint']).toBe('stylelint "src/**/*.{css,scss}"');
      expect(pkg.scripts['format:check']).toBe('<pm> prettier --check "src/**/*.{ts,js}"');
   });

   it('resolves <lockfile> placeholders in generated files', () => {
      const presetWithLockfile: FmtPreset = {
         name: 'test-preset',
         description: 'Test',
         prettierIgnore: () => 'node_modules/\n<lockfile>\ndist/\n',
      };
      tmpDir = createTempDir();

      materializeFmtPreset('test-preset', presetWithLockfile, {
         ...baseOpts,
         cwd: tmpDir,
         lockfile: 'bun.lock',
      });

      const presetDir = getLocalPresetDir('fmt', 'test-preset');
      expect(fs.readFileSync(path.join(presetDir, '.prettierignore'), 'utf-8')).toBe(
         'node_modules/\nbun.lock\ndist/\n',
      );
   });

   it('does not write files in dry-run mode', () => {
      tmpDir = createTempDir();

      materializeFmtPreset('test-preset', basePreset, {
         ...baseOpts,
         cwd: tmpDir,
         dryRun: true,
      });

      const presetDir = getLocalPresetDir('fmt', 'test-preset');
      expect(fs.existsSync(presetDir)).toBe(false);
   });
});

describe('materializeVscodePreset', () => {
   let tmpDir: string;

   afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   it('copies .vscode/settings.json and extensions.json to local preset dir', () => {
      tmpDir = createTempDir();
      const vscodeDir = path.join(tmpDir, '.vscode');
      fs.mkdirSync(vscodeDir, { recursive: true });
      fs.writeFileSync(
         path.join(vscodeDir, 'settings.json'),
         JSON.stringify({ 'editor.formatOnSave': true }),
      );
      fs.writeFileSync(
         path.join(vscodeDir, 'extensions.json'),
         JSON.stringify({ recommendations: ['esbenp.prettier-vscode'] }),
      );

      materializeVscodePreset(tmpDir, 'test-preset');

      const presetDir = getLocalPresetDir('vscode', 'test-preset');
      expect(fs.existsSync(path.join(presetDir, 'settings.json'))).toBe(true);
      expect(fs.existsSync(path.join(presetDir, 'extensions.json'))).toBe(true);

      const settings = JSON.parse(fs.readFileSync(path.join(presetDir, 'settings.json'), 'utf-8'));
      expect(settings['editor.formatOnSave']).toBe(true);
   });
});

describe('applyLocalFmtPreset', () => {
   let tmpDir: string;

   afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   function setupLocalPreset(files: Record<string, string>): void {
      const presetDir = getLocalPresetDir('fmt', 'test-preset');
      fs.mkdirSync(presetDir, { recursive: true });
      for (const [name, content] of Object.entries(files)) {
         fs.writeFileSync(path.join(presetDir, name), content);
      }
   }

   it('copies config files from local preset to project root', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         '.prettierrc': '{"semi": false}',
      });

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      expect(result.created).toContain('eslint.config.mjs');
      expect(result.created).toContain('.prettierrc');
      expect(fs.readFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'utf-8')).toBe(
         'export default []',
      );
   });

   it('skips existing files without --force', () => {
      tmpDir = createTempDir();
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'existing content');
      setupLocalPreset({
         'eslint.config.mjs': 'new content',
      });

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      expect(result.skipped).toContain('eslint.config.mjs');
      expect(fs.readFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'utf-8')).toBe(
         'existing content',
      );
   });

   it('overwrites existing files with --force', () => {
      tmpDir = createTempDir();
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'existing content');
      setupLocalPreset({
         'eslint.config.mjs': 'new content',
      });

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         force: true,
      });

      expect(result.overwritten).toContain('eslint.config.mjs');
      expect(fs.readFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'utf-8')).toBe('new content');
   });

   it('merges template package.json deps into project (dedup)', () => {
      tmpDir = createTempDir();
      fs.writeFileSync(
         path.join(tmpDir, 'package.json'),
         JSON.stringify({
            name: 'test',
            devDependencies: { eslint: '^9.0.0' },
            scripts: {},
         }),
      );
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         'package.json': JSON.stringify({
            devDependencies: { eslint: '<latest>', prettier: '<latest>', typescript: '^5.5.0' },
            scripts: { lint: 'eslint .' },
         }),
      });

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      expect(pkg.devDependencies['eslint']).toBe('^9.0.0');
      expect(pkg.devDependencies['prettier']).toBeUndefined();
      expect(pkg.devDependencies['typescript']).toBe('^5.5.0');
      expect(pkg.scripts['lint']).toBe('eslint .');
      expect(result.scriptsAdded).toBe(1);
   });

   it('skips scripts that already exist without --force', () => {
      tmpDir = createTempDir();
      fs.writeFileSync(
         path.join(tmpDir, 'package.json'),
         JSON.stringify({
            name: 'test',
            scripts: { lint: 'existing lint' },
         }),
      );
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         'package.json': JSON.stringify({
            devDependencies: {},
            scripts: { lint: 'eslint .', format: 'prettier --write .' },
         }),
      });

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      expect(pkg.scripts['lint']).toBe('existing lint');
      expect(pkg.scripts['format']).toBe('prettier --write .');
      expect(result.scriptsSkipped).toBe(1);
      expect(result.scriptsAdded).toBe(1);
   });

   it('resolves <pm> placeholder in scripts', () => {
      tmpDir = createTempDir();
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
      fs.writeFileSync(path.join(tmpDir, 'bun.lockb'), '');
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         'package.json': JSON.stringify({
            devDependencies: {},
            scripts: { 'format:check': '<pm> prettier --check "src/**/*.{ts,js}"' },
         }),
      });

      applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      expect(pkg.scripts['format:check']).toBe('bun run prettier --check "src/**/*.{ts,js}"');
   });

   it('filters stylelint files and inline stylelint segments when noStylelint is true', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         'stylelint.config.mjs': 'export default {}',
         '.stylelintignore': 'node_modules/',
         'package.json': JSON.stringify({
            devDependencies: { eslint: '<latest>', stylelint: '<latest>' },
            scripts: {
               lint: 'eslint . && stylelint "src/**/*.{css,scss,vue}" --cache',
               'lint:fix': 'eslint . --fix && stylelint "src/**/*.{css,scss,vue}" --fix',
            },
         }),
      });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         noStylelint: true,
      });

      expect(result.created).toContain('eslint.config.mjs');
      expect(result.created).not.toContain('stylelint.config.mjs');
      expect(result.created).not.toContain('.stylelintignore');

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      expect(pkg.devDependencies['stylelint']).toBeUndefined();
      expect(pkg.scripts['lint']).toBe('eslint .');
      expect(pkg.scripts['lint:fix']).toBe('eslint . --fix');
   });

   it('filters editorconfig file when noEditorconfig is true', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         '.editorconfig': 'root = true',
      });

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         noEditorconfig: true,
      });

      expect(result.created).toContain('eslint.config.mjs');
      expect(result.created).not.toContain('.editorconfig');
   });

   it('filters cspell file and inline cspell segments when noCspell is true', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         'cspell.json': '{"words":["test"]}',
         'package.json': JSON.stringify({
            devDependencies: { eslint: '<latest>', cspell: '<latest>' },
            scripts: {
               lint: 'eslint . && cspell --cache --cache-location node_modules/.cache/cspell --gitignore "src/**/*"',
            },
         }),
      });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         noCspell: true,
      });

      expect(result.created).toContain('eslint.config.mjs');
      expect(result.created).not.toContain('cspell.json');

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      expect(pkg.devDependencies['cspell']).toBeUndefined();
      expect(pkg.scripts['lint']).toBe('eslint .');
   });

   it('handles incomplete preset — copies only available files', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
      });

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      expect(result.created).toContain('eslint.config.mjs');
      expect(result.created).not.toContain('cspell.json');
   });

   it('does not write files in dry-run mode', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         'package.json': JSON.stringify({
            devDependencies: { eslint: '<latest>' },
            scripts: { lint: 'eslint .' },
         }),
      });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         dryRun: true,
      });

      expect(result.created).toContain('eslint.config.mjs');
      expect(fs.existsSync(path.join(tmpDir, 'eslint.config.mjs'))).toBe(false);

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      expect(pkg.scripts).toBeUndefined();
   });

   it('returns empty result when preset dir does not exist', () => {
      tmpDir = createTempDir();
      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      expect(result.created).toEqual([]);
      expect(result.overwritten).toEqual([]);
      expect(result.skipped).toEqual([]);
   });

   it('filters .lintstagedrc.json when noLintStaged is true', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         '.lintstagedrc.json': JSON.stringify({ '*.{ts,js}': ['eslint --fix'] }),
         'package.json': JSON.stringify({
            devDependencies: { eslint: '<latest>', 'lint-staged': '<latest>' },
            scripts: { 'lint-staged': 'lint-staged' },
         }),
      });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         noLintStaged: true,
      });

      expect(result.created).toContain('eslint.config.mjs');
      expect(result.created).not.toContain('.lintstagedrc.json');

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      expect(pkg.devDependencies['lint-staged']).toBeUndefined();
      expect(pkg.scripts['lint-staged']).toBeUndefined();
   });

   it('includes .lintstagedrc.json when noLintStaged is false', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         '.lintstagedrc.json': JSON.stringify({ '*.{ts,js}': ['eslint --fix'] }),
         'package.json': JSON.stringify({
            devDependencies: { eslint: '<latest>', 'lint-staged': '^15.0.0' },
            scripts: { 'lint-staged': 'lint-staged' },
         }),
      });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         noLintStaged: false,
      });

      expect(result.created).toContain('.lintstagedrc.json');

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      expect(pkg.devDependencies['lint-staged']).toBe('^15.0.0');
      expect(pkg.scripts['lint-staged']).toBe('lint-staged');
   });

   it('filters husky dep when noHusky is true', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         'package.json': JSON.stringify({
            devDependencies: { eslint: '<latest>', husky: '<latest>' },
            scripts: {},
         }),
      });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));

      applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         noHusky: true,
      });

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      expect(pkg.devDependencies['husky']).toBeUndefined();
   });
});

describe('applyLocalVscodePreset', () => {
   let tmpDir: string;

   afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   function setupLocalVscodePreset(files: Record<string, string>): void {
      const presetDir = getLocalPresetDir('vscode', 'test-preset');
      fs.mkdirSync(presetDir, { recursive: true });
      for (const [name, content] of Object.entries(files)) {
         fs.writeFileSync(path.join(presetDir, name), content);
      }
   }

   it('creates .vscode/settings.json from local preset when none exists', () => {
      tmpDir = createTempDir();
      setupLocalVscodePreset({
         'settings.json': JSON.stringify({
            'editor.formatOnSave': true,
            'editor.defaultFormatter': 'esbenp.prettier-vscode',
         }),
         'extensions.json': JSON.stringify({
            recommendations: ['esbenp.prettier-vscode'],
         }),
      });

      const result = applyLocalVscodePreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      expect(result.created).toContain('.vscode/settings.json');
      expect(result.created).toContain('.vscode/extensions.json');

      const settings = JSON.parse(
         fs.readFileSync(path.join(tmpDir, '.vscode', 'settings.json'), 'utf-8'),
      );
      expect(settings['editor.formatOnSave']).toBe(true);
   });

   it('merges with existing .vscode/settings.json using priority rules', () => {
      tmpDir = createTempDir();
      const vscodeDir = path.join(tmpDir, '.vscode');
      fs.mkdirSync(vscodeDir, { recursive: true });
      fs.writeFileSync(
         path.join(vscodeDir, 'settings.json'),
         JSON.stringify({
            'editor.cursorBlinking': 'smooth',
            'editor.formatOnSave': false,
            'editor.tabSize': 8,
         }),
      );

      setupLocalVscodePreset({
         'settings.json': JSON.stringify({
            'editor.formatOnSave': true,
            'editor.tabSize': 2,
            'editor.defaultFormatter': 'esbenp.prettier-vscode',
         }),
         'extensions.json': JSON.stringify({
            recommendations: ['esbenp.prettier-vscode'],
         }),
      });

      const result = applyLocalVscodePreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      expect(result.overwritten).toContain('.vscode/settings.json');

      const settings = JSON.parse(
         fs.readFileSync(path.join(tmpDir, '.vscode', 'settings.json'), 'utf-8'),
      );
      expect(settings['editor.cursorBlinking']).toBe('smooth');
      expect(settings['editor.formatOnSave']).toBe(true);
      expect(settings['editor.tabSize']).toBe(2);
   });

   it('filters stylelint settings when noStylelint is true', () => {
      tmpDir = createTempDir();
      setupLocalVscodePreset({
         'settings.json': JSON.stringify({
            'editor.formatOnSave': true,
            'stylelint.enable': true,
            'stylelint.validate': ['css'],
         }),
         'extensions.json': JSON.stringify({
            recommendations: ['esbenp.prettier-vscode', 'stylelint.vscode-stylelint'],
         }),
      });

      const result = applyLocalVscodePreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         noStylelint: true,
      });

      expect(result.created).toContain('.vscode/settings.json');

      const settings = JSON.parse(
         fs.readFileSync(path.join(tmpDir, '.vscode', 'settings.json'), 'utf-8'),
      );
      expect(settings['editor.formatOnSave']).toBe(true);
      expect(settings['stylelint.enable']).toBeUndefined();

      const extensions = JSON.parse(
         fs.readFileSync(path.join(tmpDir, '.vscode', 'extensions.json'), 'utf-8'),
      );
      expect(extensions.recommendations).not.toContain('stylelint.vscode-stylelint');
   });

   it('does not write files in dry-run mode', () => {
      tmpDir = createTempDir();
      setupLocalVscodePreset({
         'settings.json': JSON.stringify({ 'editor.formatOnSave': true }),
         'extensions.json': JSON.stringify({ recommendations: [] }),
      });

      const result = applyLocalVscodePreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         dryRun: true,
      });

      expect(result.created).toContain('.vscode/settings.json');
      expect(fs.existsSync(path.join(tmpDir, '.vscode', 'settings.json'))).toBe(false);
   });
});

describe('resolveLocalDeps', () => {
   it('resolves <latest> to bare package name', () => {
      const result = resolveLocalDeps({ eslint: '<latest>', prettier: '<latest>' });
      expect(result).toEqual(['eslint', 'prettier']);
   });

   it('passes through pinned versions', () => {
      const result = resolveLocalDeps({ eslint: '^9.0.0', prettier: '<latest>' });
      expect(result).toEqual(['eslint@^9.0.0', 'prettier']);
   });

   it('returns empty array for empty deps', () => {
      const result = resolveLocalDeps({});
      expect(result).toEqual([]);
   });
});

describe('isValidPresetName', () => {
   it('accepts valid names', () => {
      expect(isValidPresetName('web-vue')).toBe(true);
      expect(isValidPresetName('my-custom')).toBe(true);
      expect(isValidPresetName('abc')).toBe(true);
   });

   it('rejects empty string', () => {
      expect(isValidPresetName('')).toBe(false);
   });

   it('rejects path traversal attempts', () => {
      expect(isValidPresetName('../escape')).toBe(false);
      expect(isValidPresetName('..')).toBe(false);
      expect(isValidPresetName('path\\traversal')).toBe(false);
      expect(isValidPresetName('a/b')).toBe(false);
   });
});

describe('listCustomPresets', () => {
   it('returns empty array when fmt directory does not exist', () => {
      expect(listCustomPresets()).toEqual([]);
   });

   it('returns directories with package.json', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, 'my-custom'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'my-custom', 'package.json'), '{}');
      fs.mkdirSync(path.join(fmtDir, 'team-libs'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'team-libs', 'package.json'), '{}');

      const result = listCustomPresets();
      expect(result).toContain('my-custom');
      expect(result).toContain('team-libs');
   });

   it('excludes directories without package.json', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, 'my-custom'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'my-custom', 'package.json'), '{}');
      fs.mkdirSync(path.join(fmtDir, 'temp'), { recursive: true });

      const result = listCustomPresets();
      expect(result).toContain('my-custom');
      expect(result).not.toContain('temp');
   });

   it('excludes names failing isValidPresetName', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, '../escape'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, '../escape', 'package.json'), '{}');

      const result = listCustomPresets();
      expect(result).not.toContain('../escape');
   });

   it('ignores files (non-directories) in fmt directory', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(fmtDir, { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'readme.txt'), 'hello');

      const result = listCustomPresets();
      expect(result).toEqual([]);
   });
});

describe('isValidCustomPreset', () => {
   it('returns true for valid custom preset', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, 'my-custom'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'my-custom', 'package.json'), '{}');

      expect(isValidCustomPreset('my-custom')).toBe(true);
   });

   it('returns false when directory does not exist', () => {
      expect(isValidCustomPreset('nonexistent')).toBe(false);
   });

   it('returns false when package.json is missing', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, 'incomplete'), { recursive: true });

      expect(isValidCustomPreset('incomplete')).toBe(false);
   });

   it('returns false for invalid preset name', () => {
      expect(isValidCustomPreset('../escape')).toBe(false);
      expect(isValidCustomPreset('path\\traversal')).toBe(false);
      expect(isValidCustomPreset('')).toBe(false);
   });
});

describe('filterScripts', () => {
   it('returns all scripts when no flags are set', () => {
      const scripts = {
         lint: 'eslint .',
         format: 'prettier --write .',
         'stylelint:check': 'stylelint "src/**"',
         'editorconfig:check': 'editorconfig-checker',
      };
      const result = filterScripts(scripts, false, false, false);
      expect(result).toEqual(scripts);
   });

   it('removes entire entry when key contains stylelint and noStylelint is true', () => {
      const scripts = {
         lint: 'eslint .',
         'stylelint:check': 'stylelint "src/**"',
      };
      const result = filterScripts(scripts, true, false, false);
      expect(result).toEqual({ lint: 'eslint .' });
   });

   it('removes entire entry when key contains editorconfig and noEditorconfig is true', () => {
      const scripts = {
         lint: 'eslint .',
         'editorconfig:check': 'editorconfig-checker',
      };
      const result = filterScripts(scripts, false, true, false);
      expect(result).toEqual({ lint: 'eslint .' });
   });

   it('strips inline stylelint fragments from remaining entries when noStylelint is true', () => {
      const scripts = {
         lint: 'eslint . && stylelint "src/**/*.{css,scss,vue}" --cache',
         'lint:fix': 'eslint . --fix && stylelint "src/**/*.{css,scss,vue}" --fix',
      };
      const result = filterScripts(scripts, true, false, false);
      expect(result).toEqual({
         lint: 'eslint .',
         'lint:fix': 'eslint . --fix',
      });
   });

   it('handles both flags simultaneously', () => {
      const scripts = {
         lint: 'eslint . && stylelint "src/**"',
         format: 'prettier --write .',
         'stylelint:check': 'stylelint "src/**"',
         'editorconfig:check': 'editorconfig-checker',
      };
      const result = filterScripts(scripts, true, true, false);
      expect(result).toEqual({
         lint: 'eslint .',
         format: 'prettier --write .',
      });
   });

   it('is case-sensitive for stylelint key matching', () => {
      const scripts = {
         lint: 'eslint .',
         'Stylelint:check': 'stylelint "src/**"',
      };
      const result = filterScripts(scripts, true, false, false);
      expect(result['Stylelint:check']).toBe('stylelint "src/**"');
   });

   it('is case-sensitive for editorconfig key matching', () => {
      const scripts = {
         lint: 'eslint .',
         'Editorconfig:check': 'editorconfig-checker',
      };
      const result = filterScripts(scripts, false, true, false);
      expect(result['Editorconfig:check']).toBe('editorconfig-checker');
   });

   it('returns empty object when all entries are filtered', () => {
      const scripts = {
         'stylelint:check': 'stylelint "src/**"',
      };
      const result = filterScripts(scripts, true, false, false);
      expect(result).toEqual({});
   });

   // ─── CSpell filtering ────────────────────────────────────────────

   it('removes entire entry when key contains cspell and noCspell is true', () => {
      const scripts = {
         lint: 'eslint .',
         'cspell:check': 'cspell --gitignore "src/**/*"',
      };
      const result = filterScripts(scripts, false, false, true);
      expect(result).toEqual({ lint: 'eslint .' });
   });

   it('strips inline cspell fragments from remaining entries when noCspell is true', () => {
      const scripts = {
         lint: 'eslint . && cspell --cache --cache-location node_modules/.cache/cspell --gitignore "src/**/*" && tsc --noEmit',
         'lint:fix':
            'eslint . --fix && cspell --cache --cache-location node_modules/.cache/cspell --gitignore "src/**/*"',
      };
      const result = filterScripts(scripts, false, false, true);
      expect(result).toEqual({
         lint: 'eslint . && tsc --noEmit',
         'lint:fix': 'eslint . --fix',
      });
   });

   it('is case-sensitive for cspell key matching', () => {
      const scripts = {
         lint: 'eslint .',
         'Cspell:check': 'cspell "src/**"',
      };
      const result = filterScripts(scripts, false, false, true);
      expect(result['Cspell:check']).toBe('cspell "src/**"');
   });

   it('handles noCspell combined with other flags', () => {
      const scripts = {
         lint: 'eslint . && stylelint "src/**" && cspell --cache "src/**/*"',
         'stylelint:check': 'stylelint "src/**"',
         'cspell:check': 'cspell "src/**/*"',
         'editorconfig:check': 'editorconfig-checker',
      };
      const result = filterScripts(scripts, true, true, true);
      expect(result).toEqual({
         lint: 'eslint .',
      });
   });

   // ─── Lint-staged filtering ─────────────────────────────────────

   it('removes lint-staged entry when noLintStaged is true', () => {
      const scripts = {
         lint: 'eslint .',
         'lint-staged': 'lint-staged',
      };
      const result = filterScripts(scripts, false, false, false, true);
      expect(result).toEqual({ lint: 'eslint .' });
   });

   it('keeps lint-staged entry when noLintStaged is false', () => {
      const scripts = {
         lint: 'eslint .',
         'lint-staged': 'lint-staged',
      };
      const result = filterScripts(scripts, false, false, false, false);
      expect(result).toEqual(scripts);
   });

   it('handles all flags simultaneously including noLintStaged', () => {
      const scripts = {
         lint: 'eslint . && stylelint "src/**"',
         format: 'prettier --write .',
         'stylelint:check': 'stylelint "src/**"',
         'editorconfig:check': 'editorconfig-checker',
         'lint-staged': 'lint-staged',
      };
      const result = filterScripts(scripts, true, true, false, true);
      expect(result).toEqual({
         lint: 'eslint .',
         format: 'prettier --write .',
      });
   });
});

describe('detectPresetCapabilities', () => {
   function setupPresetDir(name: string, files: Record<string, string>): void {
      const presetDir = path.join(luxHome, 'preset', 'fmt', name);
      fs.mkdirSync(presetDir, { recursive: true });
      for (const [fileName, content] of Object.entries(files)) {
         fs.writeFileSync(path.join(presetDir, fileName), content);
      }
   }

   it('detects cspell capability from cspell.json file', () => {
      setupPresetDir('cap-test', {
         'cspell.json': '{"words":[]}',
         'package.json': JSON.stringify({ devDependencies: {} }),
      });
      const caps = detectPresetCapabilities('cap-test');
      expect(caps.hasCspell).toBe(true);
   });

   it('detects cspell capability from cspell dependency', () => {
      setupPresetDir('cap-test2', {
         'package.json': JSON.stringify({ devDependencies: { cspell: '^8.0.0' } }),
      });
      const caps = detectPresetCapabilities('cap-test2');
      expect(caps.hasCspell).toBe(true);
   });

   it('returns false for cspell when neither file nor dep exists', () => {
      setupPresetDir('cap-test3', {
         'package.json': JSON.stringify({ devDependencies: { eslint: '^9.0.0' } }),
      });
      const caps = detectPresetCapabilities('cap-test3');
      expect(caps.hasCspell).toBe(false);
   });
});

describe('applyLocalVscodePreset', () => {
   let tmpDir: string;

   afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   function setupLocalVscodePreset(files: Record<string, string>): void {
      const presetDir = getLocalPresetDir('vscode', 'test-preset');
      fs.mkdirSync(presetDir, { recursive: true });
      for (const [name, content] of Object.entries(files)) {
         fs.writeFileSync(path.join(presetDir, name), content);
      }
   }

   it('creates .vscode/settings.json from local preset when none exists', () => {
      tmpDir = createTempDir();
      setupLocalVscodePreset({
         'settings.json': JSON.stringify({
            'editor.formatOnSave': true,
            'editor.defaultFormatter': 'esbenp.prettier-vscode',
         }),
         'extensions.json': JSON.stringify({
            recommendations: ['esbenp.prettier-vscode'],
         }),
      });

      const result = applyLocalVscodePreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      expect(result.created).toContain('.vscode/settings.json');
      expect(result.created).toContain('.vscode/extensions.json');

      const settings = JSON.parse(
         fs.readFileSync(path.join(tmpDir, '.vscode', 'settings.json'), 'utf-8'),
      );
      expect(settings['editor.formatOnSave']).toBe(true);
   });

   it('merges with existing .vscode/settings.json using priority rules', () => {
      tmpDir = createTempDir();
      const vscodeDir = path.join(tmpDir, '.vscode');
      fs.mkdirSync(vscodeDir, { recursive: true });
      fs.writeFileSync(
         path.join(vscodeDir, 'settings.json'),
         JSON.stringify({
            'editor.cursorBlinking': 'smooth',
            'editor.formatOnSave': false,
            'editor.tabSize': 8,
         }),
      );

      setupLocalVscodePreset({
         'settings.json': JSON.stringify({
            'editor.formatOnSave': true,
            'editor.tabSize': 2,
            'editor.defaultFormatter': 'esbenp.prettier-vscode',
         }),
         'extensions.json': JSON.stringify({
            recommendations: ['esbenp.prettier-vscode'],
         }),
      });

      const result = applyLocalVscodePreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      expect(result.overwritten).toContain('.vscode/settings.json');

      const settings = JSON.parse(
         fs.readFileSync(path.join(tmpDir, '.vscode', 'settings.json'), 'utf-8'),
      );
      expect(settings['editor.cursorBlinking']).toBe('smooth');
      expect(settings['editor.formatOnSave']).toBe(true);
      expect(settings['editor.tabSize']).toBe(2);
   });

   it('filters stylelint settings when noStylelint is true', () => {
      tmpDir = createTempDir();
      setupLocalVscodePreset({
         'settings.json': JSON.stringify({
            'editor.formatOnSave': true,
            'stylelint.enable': true,
            'stylelint.validate': ['css'],
         }),
         'extensions.json': JSON.stringify({
            recommendations: ['esbenp.prettier-vscode', 'stylelint.vscode-stylelint'],
         }),
      });

      const result = applyLocalVscodePreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         noStylelint: true,
      });

      expect(result.created).toContain('.vscode/settings.json');

      const settings = JSON.parse(
         fs.readFileSync(path.join(tmpDir, '.vscode', 'settings.json'), 'utf-8'),
      );
      expect(settings['editor.formatOnSave']).toBe(true);
      expect(settings['stylelint.enable']).toBeUndefined();

      const extensions = JSON.parse(
         fs.readFileSync(path.join(tmpDir, '.vscode', 'extensions.json'), 'utf-8'),
      );
      expect(extensions.recommendations).not.toContain('stylelint.vscode-stylelint');
   });

   it('does not write files in dry-run mode', () => {
      tmpDir = createTempDir();
      setupLocalVscodePreset({
         'settings.json': JSON.stringify({ 'editor.formatOnSave': true }),
         'extensions.json': JSON.stringify({ recommendations: [] }),
      });

      const result = applyLocalVscodePreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         dryRun: true,
      });

      expect(result.created).toContain('.vscode/settings.json');
      expect(fs.existsSync(path.join(tmpDir, '.vscode', 'settings.json'))).toBe(false);
   });
});

describe('resolveLocalDeps', () => {
   it('resolves <latest> to bare package name', () => {
      const result = resolveLocalDeps({ eslint: '<latest>', prettier: '<latest>' });
      expect(result).toEqual(['eslint', 'prettier']);
   });

   it('passes through pinned versions', () => {
      const result = resolveLocalDeps({ eslint: '^9.0.0', prettier: '<latest>' });
      expect(result).toEqual(['eslint@^9.0.0', 'prettier']);
   });

   it('returns empty array for empty deps', () => {
      const result = resolveLocalDeps({});
      expect(result).toEqual([]);
   });
});

describe('isValidPresetName', () => {
   it('accepts valid names', () => {
      expect(isValidPresetName('web-vue')).toBe(true);
      expect(isValidPresetName('my-custom')).toBe(true);
      expect(isValidPresetName('abc')).toBe(true);
   });

   it('rejects empty string', () => {
      expect(isValidPresetName('')).toBe(false);
   });

   it('rejects path traversal attempts', () => {
      expect(isValidPresetName('../escape')).toBe(false);
      expect(isValidPresetName('..')).toBe(false);
      expect(isValidPresetName('path\\traversal')).toBe(false);
      expect(isValidPresetName('a/b')).toBe(false);
   });
});

describe('listCustomPresets', () => {
   it('returns empty array when fmt directory does not exist', () => {
      expect(listCustomPresets()).toEqual([]);
   });

   it('returns directories with package.json', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, 'my-custom'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'my-custom', 'package.json'), '{}');
      fs.mkdirSync(path.join(fmtDir, 'team-libs'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'team-libs', 'package.json'), '{}');

      const result = listCustomPresets();
      expect(result).toContain('my-custom');
      expect(result).toContain('team-libs');
   });

   it('excludes directories without package.json', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, 'my-custom'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'my-custom', 'package.json'), '{}');
      fs.mkdirSync(path.join(fmtDir, 'temp'), { recursive: true });

      const result = listCustomPresets();
      expect(result).toContain('my-custom');
      expect(result).not.toContain('temp');
   });

   it('excludes names failing isValidPresetName', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, '../escape'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, '../escape', 'package.json'), '{}');

      const result = listCustomPresets();
      expect(result).not.toContain('../escape');
   });

   it('ignores files (non-directories) in fmt directory', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(fmtDir, { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'readme.txt'), 'hello');

      const result = listCustomPresets();
      expect(result).toEqual([]);
   });
});

describe('isValidCustomPreset', () => {
   it('returns true for valid custom preset', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, 'my-custom'), { recursive: true });
      fs.writeFileSync(path.join(fmtDir, 'my-custom', 'package.json'), '{}');

      expect(isValidCustomPreset('my-custom')).toBe(true);
   });

   it('returns false when directory does not exist', () => {
      expect(isValidCustomPreset('nonexistent')).toBe(false);
   });

   it('returns false when package.json is missing', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');
      fs.mkdirSync(path.join(fmtDir, 'incomplete'), { recursive: true });

      expect(isValidCustomPreset('incomplete')).toBe(false);
   });

   it('returns false for invalid preset name', () => {
      expect(isValidCustomPreset('../escape')).toBe(false);
      expect(isValidCustomPreset('path\\traversal')).toBe(false);
      expect(isValidCustomPreset('')).toBe(false);
   });
});
