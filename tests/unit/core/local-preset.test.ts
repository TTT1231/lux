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
   listCustomPresets,
   isValidCustomPreset,
   isValidPresetName,
   filterScripts,
   detectPresetCapabilities,
} from '../../../src/core/local-preset';
import { FMT_PRESETS } from '../../../src/presets/fmt';
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
   stylelint: false,
   editorconfig: false,
   cspell: false,
   husky: false,
   lintStaged: false,
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
   deps: {
      eslint: { devDependencies: { eslint: '<latest>' } },
      prettier: { devDependencies: { prettier: '<latest>' } },
      cspell: { devDependencies: { cspell: '<latest>' } },
      stylelint: {
         devDependencies: {
            stylelint: '<latest>',
            'stylelint-config-standard-scss': '<latest>',
            'postcss-html': '<latest>',
            'postcss-scss': '<latest>',
         },
      },
   },
   scripts: {
      eslint: 'eslint .',
      'eslint:fix': 'eslint . --fix',
      stylelint: 'stylelint "src/**/*.{css,scss}"',
      'stylelint:fix': 'stylelint "src/**/*.{css,scss}" --fix',
      cspell: 'cspell --gitignore "src/**/*"',
      format: 'prettier --write "src/**/*.{ts,js}"',
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
      expect(fs.readFileSync(path.join(presetDir, 'eslint.config.mjs'), 'utf-8')).toBe('export default []\n');
   });

   it('writes template package.json with scripts only and writes deps.json', () => {
      tmpDir = createTempDir();

      materializeFmtPreset('test-preset', basePreset, {
         ...baseOpts,
         cwd: tmpDir,
         stylelint: false,
         editorconfig: false,
      });

      const presetDir = getLocalPresetDir('fmt', 'test-preset');
      const pkgPath = path.join(presetDir, 'package.json');
      expect(fs.existsSync(pkgPath)).toBe(true);

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      expect(pkg.devDependencies).toBeUndefined();
      expect(pkg.scripts['eslint']).toBe('eslint .');
      expect(pkg.scripts['stylelint']).toBe('stylelint "src/**/*.{css,scss}"');

      const depsPath = path.join(presetDir, 'deps.json');
      expect(fs.existsSync(depsPath)).toBe(true);
      const deps = JSON.parse(fs.readFileSync(depsPath, 'utf-8'));
      expect(deps.eslint.devDependencies.eslint).toBe('<latest>');
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

   it('materializes .lintstagedrc.json when preset has lintStaged function', () => {
      const presetWithLintStagedFn: FmtPreset = {
         name: 'test-lint-staged',
         description: 'Test',
         eslint: () => 'export default []\n',
         lintStaged: () => JSON.stringify({ '*.{ts}': ['eslint --fix'] }, null, 2) + '\n',
      };
      tmpDir = createTempDir();

      materializeFmtPreset('test-lint-staged', presetWithLintStagedFn, {
         ...baseOpts,
         cwd: tmpDir,
      });

      const presetDir = getLocalPresetDir('fmt', 'test-lint-staged');
      expect(fs.existsSync(path.join(presetDir, '.lintstagedrc.json'))).toBe(true);
      const content = JSON.parse(fs.readFileSync(path.join(presetDir, '.lintstagedrc.json'), 'utf-8'));
      expect(content['*.{ts}']).toEqual(['eslint --fix']);
   });

   it('materializes .husky/pre-commit when preset has husky function', () => {
      const presetWithHusky: FmtPreset = {
         name: 'test-husky',
         description: 'Test',
         eslint: () => 'export default []\n',
         husky: () => '<pmx> lint-staged\n',
      };
      tmpDir = createTempDir();

      materializeFmtPreset('test-husky', presetWithHusky, {
         ...baseOpts,
         cwd: tmpDir,
      });

      const presetDir = getLocalPresetDir('fmt', 'test-husky');
      expect(fs.existsSync(path.join(presetDir, '.husky'))).toBe(true);
      expect(fs.existsSync(path.join(presetDir, '.husky', 'pre-commit'))).toBe(true);
      expect(fs.readFileSync(path.join(presetDir, '.husky', 'pre-commit'), 'utf-8')).toBe('<pmx> lint-staged\n');
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
      fs.writeFileSync(path.join(vscodeDir, 'settings.json'), JSON.stringify({ 'editor.formatOnSave': true }));
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
         'package.json': JSON.stringify({ scripts: {} }),
         'deps.json': JSON.stringify({
            eslint: { devDependencies: { eslint: '<latest>' } },
            prettier: { devDependencies: { prettier: '<latest>' } },
         }),
      });

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      expect(result.created).toContain('eslint.config.mjs');
      expect(result.created).toContain('.prettierrc');
      expect(fs.readFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'utf-8')).toBe('export default []');
   });

   it('skips existing files without --force', () => {
      tmpDir = createTempDir();
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'existing content');
      setupLocalPreset({
         'eslint.config.mjs': 'new content',
         'package.json': JSON.stringify({ scripts: {} }),
         'deps.json': '{}',
      });

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      expect(result.skipped).toContain('eslint.config.mjs');
      expect(fs.readFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'utf-8')).toBe('existing content');
   });

   it('overwrites existing files with --force', () => {
      tmpDir = createTempDir();
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'existing content');
      setupLocalPreset({
         'eslint.config.mjs': 'new content',
         'package.json': JSON.stringify({ scripts: {} }),
         'deps.json': '{}',
      });

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         force: true,
      });

      expect(result.overwritten).toContain('eslint.config.mjs');
      expect(fs.readFileSync(path.join(tmpDir, 'eslint.config.mjs'), 'utf-8')).toBe('new content');
   });

   it('merges scripts from template package.json into project', () => {
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
            scripts: { eslint: 'eslint .', format: 'prettier --write .' },
         }),
         'deps.json': JSON.stringify({
            eslint: { devDependencies: { eslint: '<latest>' } },
            prettier: { devDependencies: { prettier: '<latest>', typescript: '^5.5.0' } },
         }),
      });

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         stylelint: true,
      });

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      expect(pkg.devDependencies['eslint']).toBe('^9.0.0');
      expect(pkg.scripts['eslint']).toBe('eslint .');
      expect(pkg.scripts['format']).toBe('prettier --write .');
      expect(result.scriptsAdded).toBe(2);
   });

   it('skips scripts that already exist without --force', () => {
      tmpDir = createTempDir();
      fs.writeFileSync(
         path.join(tmpDir, 'package.json'),
         JSON.stringify({
            name: 'test',
            scripts: { eslint: 'existing eslint' },
         }),
      );
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         'package.json': JSON.stringify({
            scripts: { eslint: 'eslint .', format: 'prettier --write .' },
         }),
         'deps.json': '{}',
      });

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      expect(pkg.scripts['eslint']).toBe('existing eslint');
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
            scripts: { 'format:check': '<pm> prettier --check "src/**/*.{ts,js}"' },
         }),
         'deps.json': '{}',
      });

      applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
      });

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      expect(pkg.scripts['format:check']).toBe('bun run prettier --check "src/**/*.{ts,js}"');
   });

   it('resolves <lockfile> placeholder in config files when lockfile is provided', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': "export default [{ ignores: ['node_modules/', '<lockfile>', 'dist/'] }]\n",
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
      expect(fs.readFileSync(path.join(tmpDir, '.prettierignore'), 'utf-8')).toBe('node_modules/\nbun.lock\ndist/\n');
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

      expect(fs.readFileSync(path.join(tmpDir, '.prettierignore'), 'utf-8')).toBe('node_modules/\ndist/\n');
   });

   it('filters stylelint files and scripts when stylelint flag is false', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         'stylelint.config.mjs': 'export default {}',
         '.stylelintignore': 'node_modules/',
         'package.json': JSON.stringify({
            scripts: {
               eslint: 'eslint .',
               stylelint: 'stylelint "src/**/*.{css,scss,vue}"',
            },
         }),
         'deps.json': JSON.stringify({
            eslint: { devDependencies: { eslint: '<latest>' } },
            stylelint: { devDependencies: { stylelint: '<latest>' } },
         }),
      });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         stylelint: false,
      });

      expect(result.created).toContain('eslint.config.mjs');
      expect(result.created).not.toContain('stylelint.config.mjs');
      expect(result.created).not.toContain('.stylelintignore');

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      // deps are handled by executeLocalPath, not by applyLocalFmtPreset
      expect(pkg.scripts['stylelint']).toBeUndefined();
   });

   it('filters editorconfig file when editorconfig flag is false', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         '.editorconfig': 'root = true',
         'package.json': JSON.stringify({ scripts: {} }),
         'deps.json': '{}',
      });

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         editorconfig: false,
      });

      expect(result.created).toContain('eslint.config.mjs');
      expect(result.created).not.toContain('.editorconfig');
   });

   it('filters cspell file and cspell script when cspell flag is false', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         'cspell.json': '{"words":["test"]}',
         'package.json': JSON.stringify({
            scripts: { eslint: 'eslint .', cspell: 'cspell "src/**/*"' },
         }),
         'deps.json': JSON.stringify({
            eslint: { devDependencies: { eslint: '<latest>' } },
            cspell: { devDependencies: { cspell: '<latest>' } },
         }),
      });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));

      const result = applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         cspell: false,
      });

      expect(result.created).toContain('eslint.config.mjs');
      expect(result.created).not.toContain('cspell.json');

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      // deps are handled by executeLocalPath, not by applyLocalFmtPreset
      expect(pkg.scripts['cspell']).toBeUndefined();
   });

   it('handles incomplete preset — copies only available files', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         'package.json': JSON.stringify({ scripts: {} }),
         'deps.json': '{}',
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
         'package.json': JSON.stringify({ scripts: { eslint: 'eslint .' } }),
         'deps.json': '{}',
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

   it('filters lint-staged dep and script when lintStaged flag is false', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         'package.json': JSON.stringify({
            scripts: { 'lint-staged': 'lint-staged' },
         }),
         'deps.json': JSON.stringify({
            eslint: { devDependencies: { eslint: '<latest>' } },
            'lint-staged': { devDependencies: { 'lint-staged': '<latest>' } },
         }),
      });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));

      applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         lintStaged: false,
      });

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      // deps are handled by executeLocalPath, not by applyLocalFmtPreset
      expect(pkg.scripts['lint-staged']).toBeUndefined();
   });

   it('includes lint-staged script when lintStaged flag is true', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         'package.json': JSON.stringify({
            scripts: { 'lint-staged': 'lint-staged' },
         }),
         'deps.json': JSON.stringify({
            eslint: { devDependencies: { eslint: '<latest>' } },
            'lint-staged': { devDependencies: { 'lint-staged': '^15.0.0' } },
         }),
      });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));

      applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         lintStaged: true,
      });

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      // deps are handled by executeLocalPath, not by applyLocalFmtPreset
      expect(pkg.scripts['lint-staged']).toBe('lint-staged');
   });

   it('filters husky dep when husky flag is false', () => {
      tmpDir = createTempDir();
      setupLocalPreset({
         'eslint.config.mjs': 'export default []',
         'package.json': JSON.stringify({ scripts: {} }),
         'deps.json': JSON.stringify({
            eslint: { devDependencies: { eslint: '<latest>' } },
            husky: { devDependencies: { husky: '<latest>' } },
         }),
      });
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));

      applyLocalFmtPreset(tmpDir, 'test-preset', {
         ...baseOpts,
         cwd: tmpDir,
         husky: false,
      });

      const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8'));
      // deps are handled by executeLocalPath, not by applyLocalFmtPreset
      expect(pkg.devDependencies).toBeUndefined();
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

      const settings = JSON.parse(fs.readFileSync(path.join(tmpDir, '.vscode', 'settings.json'), 'utf-8'));
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

      const settings = JSON.parse(fs.readFileSync(path.join(tmpDir, '.vscode', 'settings.json'), 'utf-8'));
      expect(settings['editor.cursorBlinking']).toBe('smooth');
      expect(settings['editor.formatOnSave']).toBe(true);
      expect(settings['editor.tabSize']).toBe(2);
   });

   it('filters stylelint settings when stylelint flag is false', () => {
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
         stylelint: false,
      });

      expect(result.created).toContain('.vscode/settings.json');

      const settings = JSON.parse(fs.readFileSync(path.join(tmpDir, '.vscode', 'settings.json'), 'utf-8'));
      expect(settings['editor.formatOnSave']).toBe(true);
      expect(settings['stylelint.enable']).toBeUndefined();

      const extensions = JSON.parse(fs.readFileSync(path.join(tmpDir, '.vscode', 'extensions.json'), 'utf-8'));
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
   it('returns all scripts when no flags disable any tool', () => {
      const scripts = {
         eslint: 'eslint .',
         format: 'prettier --write .',
         stylelint: 'stylelint "src/**"',
         'editorconfig:check': 'editorconfig-checker',
      };
      const result = filterScripts(scripts, {
         stylelint: true,
         editorconfig: true,
         cspell: true,
         lintStaged: true,
      });
      expect(result).toEqual(scripts);
   });

   it('removes stylelint entry when stylelint flag is false', () => {
      const scripts = {
         eslint: 'eslint .',
         stylelint: 'stylelint "src/**"',
      };
      const result = filterScripts(scripts, {
         stylelint: false,
         editorconfig: true,
         cspell: true,
         lintStaged: true,
      });
      expect(result).toEqual({ eslint: 'eslint .' });
   });

   it('removes editorconfig entry when editorconfig flag is false', () => {
      const scripts = {
         eslint: 'eslint .',
         'editorconfig:check': 'editorconfig-checker',
      };
      const result = filterScripts(scripts, {
         stylelint: true,
         editorconfig: false,
         cspell: true,
         lintStaged: true,
      });
      expect(result).toEqual({ eslint: 'eslint .' });
   });

   it('removes cspell entry when cspell flag is false', () => {
      const scripts = {
         eslint: 'eslint .',
         cspell: 'cspell "src/**"',
      };
      const result = filterScripts(scripts, {
         stylelint: true,
         editorconfig: true,
         cspell: false,
         lintStaged: true,
      });
      expect(result).toEqual({ eslint: 'eslint .' });
   });

   it('handles multiple flags disabled simultaneously', () => {
      const scripts = {
         eslint: 'eslint .',
         format: 'prettier --write .',
         stylelint: 'stylelint "src/**"',
         'editorconfig:check': 'editorconfig-checker',
      };
      const result = filterScripts(scripts, {
         stylelint: false,
         editorconfig: false,
         cspell: false,
         lintStaged: false,
      });
      expect(result).toEqual({
         eslint: 'eslint .',
         format: 'prettier --write .',
      });
   });

   it('is case-sensitive for key matching', () => {
      const scripts = {
         eslint: 'eslint .',
         'Stylelint:check': 'stylelint "src/**"',
      };
      const result = filterScripts(scripts, {
         stylelint: false,
         editorconfig: true,
         cspell: true,
         lintStaged: true,
      });
      expect(result['Stylelint:check']).toBe('stylelint "src/**"');
   });

   it('returns empty object when all entries are filtered', () => {
      const scripts = {
         stylelint: 'stylelint "src/**"',
      };
      const result = filterScripts(scripts, {
         stylelint: false,
         editorconfig: true,
         cspell: true,
         lintStaged: true,
      });
      expect(result).toEqual({});
   });

   it('removes lint-staged entry when lintStaged flag is false', () => {
      const scripts = {
         eslint: 'eslint .',
         'lint-staged': 'lint-staged',
      };
      const result = filterScripts(scripts, {
         stylelint: true,
         editorconfig: true,
         cspell: true,
         lintStaged: false,
      });
      expect(result).toEqual({ eslint: 'eslint .' });
   });

   it('keeps lint-staged entry when lintStaged flag is true', () => {
      const scripts = {
         eslint: 'eslint .',
         'lint-staged': 'lint-staged',
      };
      const result = filterScripts(scripts, {
         stylelint: true,
         editorconfig: true,
         cspell: true,
         lintStaged: true,
      });
      expect(result).toEqual(scripts);
   });
});

describe('detectPresetCapabilities', () => {
   function setupPresetDir(name: string, files: Record<string, string>, depsJson?: Record<string, unknown>): void {
      const presetDir = path.join(luxHome, 'preset', 'fmt', name);
      fs.mkdirSync(presetDir, { recursive: true });
      for (const [fileName, content] of Object.entries(files)) {
         fs.writeFileSync(path.join(presetDir, fileName), content);
      }
      if (depsJson) {
         fs.writeFileSync(path.join(presetDir, 'deps.json'), JSON.stringify(depsJson));
      }
   }

   it('detects cspell capability from cspell.json file', () => {
      setupPresetDir('cap-test', {
         'cspell.json': '{"words":[]}',
         'package.json': JSON.stringify({ scripts: {} }),
      });
      const caps = detectPresetCapabilities('cap-test');
      expect(caps.hasCspell).toBe(true);
   });

   it('detects cspell capability from deps.json', () => {
      setupPresetDir(
         'cap-test2',
         {
            'package.json': JSON.stringify({ scripts: {} }),
         },
         { cspell: { devDependencies: { cspell: '^8.0.0' } } },
      );
      const caps = detectPresetCapabilities('cap-test2');
      expect(caps.hasCspell).toBe(true);
   });

   it('returns false for cspell when neither file nor dep exists', () => {
      setupPresetDir(
         'cap-test3',
         {
            'package.json': JSON.stringify({ scripts: {} }),
         },
         { eslint: { devDependencies: { eslint: '^9.0.0' } } },
      );
      const caps = detectPresetCapabilities('cap-test3');
      expect(caps.hasCspell).toBe(false);
   });
});

describe('materializeAllPresets — custom preset protection', () => {
   it('does not touch custom preset directories when materializing built-in presets', () => {
      const fmtDir = path.join(luxHome, 'preset', 'fmt');

      // 1. Create a custom preset with user content
      const customDir = path.join(fmtDir, 'my-team');
      fs.mkdirSync(customDir, { recursive: true });
      const customEslint = '// my custom eslint rules\nexport default []\n';
      const customPkg = JSON.stringify({ name: 'my-team', scripts: { lint: 'eslint .' } });
      fs.writeFileSync(path.join(customDir, 'eslint.config.mjs'), customEslint);
      fs.writeFileSync(path.join(customDir, 'package.json'), customPkg);

      // 2. Simulate materializeAllPresets: iterate all built-in presets
      for (const preset of FMT_PRESETS) {
         materializeFmtPreset(preset.name, preset, { ...baseOpts, cwd: '' });
      }

      // 3. Custom preset should be untouched
      expect(fs.existsSync(customDir)).toBe(true);
      expect(fs.readFileSync(path.join(customDir, 'eslint.config.mjs'), 'utf-8')).toBe(customEslint);
      expect(fs.readFileSync(path.join(customDir, 'package.json'), 'utf-8')).toBe(customPkg);

      // 4. Built-in presets should have been materialized
      for (const preset of FMT_PRESETS) {
         const builtinDir = path.join(fmtDir, preset.name);
         expect(fs.existsSync(builtinDir)).toBe(true);
      }
   });
});
