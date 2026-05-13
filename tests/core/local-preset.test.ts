import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
   getLocalPresetDir,
   localPresetExists,
   materializeFmtPreset,
   materializeVscodePreset,
   applyLocalFmtPreset,
   applyLocalVscodePreset,
   resetLocalPreset,
   resolveLocalDeps,
} from '../../src/core/local-preset';
import type { FmtPreset, GenerateOptions } from '../../src/presets/types';

function createTempDir(): string {
   return fs.mkdtempSync(path.join(os.tmpdir(), 'lux-local-preset-test-'));
}

const baseOpts: GenerateOptions = {
   cwd: '',
   force: false,
   dryRun: false,
   noStylelint: false,
   noEditorconfig: false,
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
      stylelint: 'stylelint "src/**/*.{css,scss}"',
      'code:check': '<pm> lint && <pm> format:check',
      'code:check:all': '<pm> lint && <pm> stylelint',
   },
};

describe('getLocalPresetDir', () => {
   it('returns correct path for fmt preset', () => {
      const result = getLocalPresetDir('/project', 'fmt', 'web-vue');
      expect(result).toBe(path.join('/project', '.lux', 'preset', 'fmt', 'web-vue'));
   });

   it('returns correct path for vscode preset', () => {
      const result = getLocalPresetDir('/project', 'vscode', 'web-react');
      expect(result).toBe(path.join('/project', '.lux', 'preset', 'vscode', 'web-react'));
   });
});

describe('localPresetExists', () => {
   let tmpDir: string;

   afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   it('returns false when directory does not exist', () => {
      tmpDir = createTempDir();
      expect(localPresetExists(tmpDir, 'fmt', 'web-vue')).toBe(false);
   });

   it('returns true when directory exists', () => {
      tmpDir = createTempDir();
      const presetDir = getLocalPresetDir(tmpDir, 'fmt', 'web-vue');
      fs.mkdirSync(presetDir, { recursive: true });
      expect(localPresetExists(tmpDir, 'fmt', 'web-vue')).toBe(true);
   });
});

describe('resetLocalPreset', () => {
   let tmpDir: string;

   afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   it('deletes the local preset directory', () => {
      tmpDir = createTempDir();
      const presetDir = getLocalPresetDir(tmpDir, 'fmt', 'web-vue');
      fs.mkdirSync(presetDir, { recursive: true });
      fs.writeFileSync(path.join(presetDir, 'test.txt'), 'hello');

      resetLocalPreset(tmpDir, 'fmt', 'web-vue');

      expect(fs.existsSync(presetDir)).toBe(false);
   });

   it('does not throw when directory does not exist', () => {
      tmpDir = createTempDir();
      expect(() => resetLocalPreset(tmpDir, 'fmt', 'nonexistent')).not.toThrow();
   });
});

describe('materializeFmtPreset', () => {
   let tmpDir: string;

   afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   it('copies generated config files to local preset dir', () => {
      tmpDir = createTempDir();

      fs.writeFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'export default []');
      fs.writeFileSync(path.join(tmpDir, '.prettierrc'), '{"semi": false}');

      const generatedFiles = ['eslint.config.mjs', '.prettierrc'];
      materializeFmtPreset(tmpDir, 'test-preset', generatedFiles, basePreset, {
         ...baseOpts,
         cwd: tmpDir,
      });

      const presetDir = getLocalPresetDir(tmpDir, 'fmt', 'test-preset');
      expect(fs.existsSync(path.join(presetDir, 'eslint.config.mjs'))).toBe(true);
      expect(fs.existsSync(path.join(presetDir, '.prettierrc'))).toBe(true);
      expect(fs.readFileSync(path.join(presetDir, 'eslint.config.mjs'), 'utf-8')).toBe(
         'export default []',
      );
   });

   it('writes template package.json with <latest> deps and <pm> scripts', () => {
      tmpDir = createTempDir();
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'export default []');

      materializeFmtPreset(tmpDir, 'test-preset', ['eslint.config.mjs'], basePreset, {
         ...baseOpts,
         cwd: tmpDir,
      });

      const presetDir = getLocalPresetDir(tmpDir, 'fmt', 'test-preset');
      const pkgPath = path.join(presetDir, 'package.json');
      expect(fs.existsSync(pkgPath)).toBe(true);

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      expect(pkg.devDependencies['eslint']).toBe('<latest>');
      expect(pkg.devDependencies['prettier']).toBe('<latest>');
      expect(pkg.devDependencies['stylelint']).toBe('<latest>');
      expect(pkg.scripts['code:check']).toBe('<pm> lint && <pm> format:check');
   });

   it('respects noStylelint flag — excludes stylelint deps and scripts', () => {
      tmpDir = createTempDir();
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'export default []');

      materializeFmtPreset(tmpDir, 'test-preset', ['eslint.config.mjs'], basePreset, {
         ...baseOpts,
         cwd: tmpDir,
         noStylelint: true,
      });

      const presetDir = getLocalPresetDir(tmpDir, 'fmt', 'test-preset');
      const pkg = JSON.parse(fs.readFileSync(path.join(presetDir, 'package.json'), 'utf-8'));
      expect(pkg.devDependencies['stylelint']).toBeUndefined();
      expect(pkg.devDependencies['postcss-html']).toBeUndefined();
      expect(pkg.scripts['stylelint']).toBeUndefined();
   });

   it('respects noEditorconfig flag — excludes editorconfig deps', () => {
      tmpDir = createTempDir();
      const presetWithEditorconfig: FmtPreset = {
         ...basePreset,
         dependencies: {
            dev: ['eslint', 'editorconfig'],
         },
      };
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'export default []');

      materializeFmtPreset(tmpDir, 'test-preset', ['eslint.config.mjs'], presetWithEditorconfig, {
         ...baseOpts,
         cwd: tmpDir,
         noEditorconfig: true,
      });

      const presetDir = getLocalPresetDir(tmpDir, 'fmt', 'test-preset');
      const pkg = JSON.parse(fs.readFileSync(path.join(presetDir, 'package.json'), 'utf-8'));
      expect(pkg.devDependencies['editorconfig']).toBeUndefined();
      expect(pkg.devDependencies['eslint']).toBe('<latest>');
   });

   it('does not write files in dry-run mode', () => {
      tmpDir = createTempDir();
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'export default []');

      materializeFmtPreset(tmpDir, 'test-preset', ['eslint.config.mjs'], basePreset, {
         ...baseOpts,
         cwd: tmpDir,
         dryRun: true,
      });

      const presetDir = getLocalPresetDir(tmpDir, 'fmt', 'test-preset');
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

      const presetDir = getLocalPresetDir(tmpDir, 'vscode', 'test-preset');
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
      const presetDir = getLocalPresetDir(tmpDir, 'fmt', 'test-preset');
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

      expect(result.created).toContain('eslint.config.mjs');
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
            devDependencies: { eslint: '<latest>', prettier: '<latest>' },
            scripts: { lint: 'eslint .' },
         }),
      });

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      expect(pkg.devDependencies['eslint']).toBe('^9.0.0');
      expect(pkg.devDependencies['prettier']).toBe('<latest>');
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
            scripts: { 'code:check': '<pm> lint && <pm> format:check' },
         }),
      });

      applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      expect(pkg.scripts['code:check']).toBe('bun run lint && bun run format:check');
   });

   it('filters stylelint files when noStylelint is true', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         'stylelint.config.mjs': 'export default {}',
         '.stylelintignore': 'node_modules/',
         'package.json': JSON.stringify({
            devDependencies: { eslint: '<latest>', stylelint: '<latest>' },
            scripts: { lint: 'eslint .', stylelint: 'stylelint .' },
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
      expect(pkg.scripts['stylelint']).toBeUndefined();
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
});

describe('applyLocalVscodePreset', () => {
   let tmpDir: string;

   afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   function setupLocalVscodePreset(files: Record<string, string>): void {
      const presetDir = getLocalPresetDir(tmpDir, 'vscode', 'test-preset');
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
