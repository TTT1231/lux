import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadDepsJson, collectDepsFromRegistry, composeLintStaged } from '../../../src/core/shared';
import type { DepsRegistry } from '../../../src/presets/types';

type DepsGroup = { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

function getGroup(registry: DepsRegistry, tool: string): DepsGroup {
   return registry[tool] as DepsGroup;
}

function createTempDir(): string {
   return fs.mkdtempSync(path.join(os.tmpdir(), 'lux-deps-registry-test-'));
}

describe('loadDepsJson', () => {
   let tmpDir: string;

   afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   it('loads valid deps.json and returns correct structure', () => {
      tmpDir = createTempDir();
      fs.writeFileSync(
         path.join(tmpDir, 'deps.json'),
         JSON.stringify({
            eslint: { devDependencies: { eslint: '^9.0.0', 'typescript-eslint': '^8.0.0' } },
            stylelint: { devDependencies: { stylelint: '^16.0.0' } },
         }),
      );

      const result = loadDepsJson(tmpDir);

      expect(getGroup(result, 'eslint').devDependencies!['eslint']).toBe('^9.0.0');
      expect(getGroup(result, 'eslint').devDependencies!['typescript-eslint']).toBe('^8.0.0');
      expect(getGroup(result, 'stylelint').devDependencies!['stylelint']).toBe('^16.0.0');
   });

   it('throws clear error when JSON is malformed', () => {
      tmpDir = createTempDir();
      fs.writeFileSync(path.join(tmpDir, 'deps.json'), '{ invalid json }');

      expect(() => loadDepsJson(tmpDir)).toThrow('not valid JSON');
   });

   it('throws clear error when deps.json is missing', () => {
      tmpDir = createTempDir();

      expect(() => loadDepsJson(tmpDir)).toThrow('deps.json not found');
   });

   it('preserves <latest> placeholders in version fields', () => {
      tmpDir = createTempDir();
      fs.writeFileSync(
         path.join(tmpDir, 'deps.json'),
         JSON.stringify({
            eslint: { devDependencies: { eslint: '<latest>', prettier: '<latest>' } },
         }),
      );

      const result = loadDepsJson(tmpDir);

      expect(getGroup(result, 'eslint').devDependencies!['eslint']).toBe('<latest>');
      expect(getGroup(result, 'eslint').devDependencies!['prettier']).toBe('<latest>');
   });
});

describe('collectDepsFromRegistry', () => {
   const registry: DepsRegistry = {
      eslint: { devDependencies: { eslint: '<latest>', 'typescript-eslint': '<latest>' } },
      prettier: { devDependencies: { prettier: '<latest>' } },
      stylelint: {
         devDependencies: {
            stylelint: '<latest>',
            'postcss-html': '<latest>',
         },
      },
      cspell: { devDependencies: { cspell: '<latest>' } },
      husky: { devDependencies: { husky: '<latest>' } },
      'lint-staged': { devDependencies: { 'lint-staged': '<latest>' } },
   };

   it('returns deps for all active tools specified by flags', () => {
      const result = collectDepsFromRegistry(registry, {
         stylelint: true,
         cspell: true,
         editorconfig: false,
         husky: true,
         lintStaged: true,
      });

      expect(result).toHaveProperty('eslint');
      expect(result).toHaveProperty('typescript-eslint');
      expect(result).toHaveProperty('prettier');
      expect(result).toHaveProperty('stylelint');
      expect(result).toHaveProperty('postcss-html');
      expect(result).toHaveProperty('cspell');
      expect(result).toHaveProperty('husky');
      expect(result).toHaveProperty('lint-staged');
   });

   it('always returns eslint and prettier deps (always-included tools)', () => {
      const result = collectDepsFromRegistry(registry, {
         stylelint: false,
         cspell: false,
         editorconfig: false,
         husky: false,
         lintStaged: false,
      });

      expect(Object.keys(result)).toContain('eslint');
      expect(Object.keys(result)).toContain('prettier');
      expect(Object.keys(result)).not.toContain('stylelint');
      expect(Object.keys(result)).not.toContain('cspell');
   });

   it('deduplicates packages across tool groups', () => {
      const registryWithOverlap: DepsRegistry = {
         eslint: { devDependencies: { eslint: '<latest>', prettier: '<latest>' } },
         prettier: { devDependencies: { prettier: '<latest>' } },
      };

      const result = collectDepsFromRegistry(registryWithOverlap, {
         stylelint: false,
         cspell: false,
         editorconfig: false,
         husky: false,
         lintStaged: false,
      });

      const prettierEntries = Object.entries(result).filter(([k]) => k === 'prettier');
      expect(prettierEntries.length).toBe(1);
      expect(result['prettier']).toBe('<latest>');
   });

   it('always collects top-level devDependencies regardless of flags', () => {
      const registryWithCustom = {
         devDependencies: { 'my-custom-pkg': '^1.0.0' },
         eslint: { devDependencies: { eslint: '<latest>' } },
         prettier: { devDependencies: { prettier: '<latest>' } },
      } as DepsRegistry;

      const result = collectDepsFromRegistry(registryWithCustom, {
         stylelint: false,
         cspell: false,
         editorconfig: false,
         husky: false,
         lintStaged: false,
      });

      expect(result['my-custom-pkg']).toBe('^1.0.0');
      expect(result['eslint']).toBe('<latest>');
      expect(result['prettier']).toBe('<latest>');
   });

   it('always collects top-level dependencies regardless of flags', () => {
      const registryWithRuntimeDeps = {
         dependencies: { 'lodash-es': '^4.17.0' },
         eslint: { devDependencies: { eslint: '<latest>' } },
         prettier: { devDependencies: { prettier: '<latest>' } },
      } as DepsRegistry;

      const result = collectDepsFromRegistry(registryWithRuntimeDeps, {
         stylelint: false,
         cspell: false,
         editorconfig: false,
         husky: false,
         lintStaged: false,
      });

      expect(result['lodash-es']).toBe('^4.17.0');
   });

   it('resolves <latest> in top-level custom deps', () => {
      const registryWithLatest = {
         devDependencies: { 'some-pkg': '<latest>' },
         eslint: { devDependencies: { eslint: '<latest>' } },
         prettier: { devDependencies: { prettier: '<latest>' } },
      } as DepsRegistry;

      const result = collectDepsFromRegistry(registryWithLatest, {
         stylelint: false,
         cspell: false,
         editorconfig: false,
         husky: false,
         lintStaged: false,
      });

      expect(result['some-pkg']).toBe('<latest>');
   });
});

describe('composeLintStaged', () => {
   it('merges all tool fragments when all flags active', () => {
      const fragments = {
         eslint: { '*.{ts,js,vue}': ['eslint --fix'] },
         prettier: {
            '*.{ts,js,vue}': ['prettier --write'],
            '*.{css,scss,vue}': ['prettier --write'],
         },
         stylelint: { '*.{css,scss,vue}': ['stylelint --fix'] },
      };

      const result = composeLintStaged(fragments, { stylelint: true });

      expect(result['*.{ts,js,vue}']).toEqual(['eslint --fix', 'prettier --write']);
      expect(result['*.{css,scss,vue}']).toEqual(['prettier --write', 'stylelint --fix']);
   });

   it('excludes stylelint fragment when stylelint flag is false', () => {
      const fragments = {
         eslint: { '*.{ts,js}': ['eslint --fix'] },
         prettier: { '*.{ts,js}': ['prettier --write'] },
         stylelint: { '*.{css,scss}': ['stylelint --fix'] },
      };

      const result = composeLintStaged(fragments, { stylelint: false });

      expect(result['*.{ts,js}']).toEqual(['eslint --fix', 'prettier --write']);
      expect(result['*.{css,scss}']).toBeUndefined();
   });

   it('removes empty glob keys after fragment exclusion', () => {
      const fragments = {
         eslint: { '*.{ts,js}': ['eslint --fix'] },
         stylelint: { '*.vue': ['stylelint --fix'] },
      };

      const result = composeLintStaged(fragments, { stylelint: false });

      expect(result['*.{ts,js}']).toEqual(['eslint --fix']);
      expect(result['*.vue']).toBeUndefined();
   });

   it('merges commands from multiple tools for the same glob pattern', () => {
      const fragments = {
         eslint: { '*.{ts,js}': ['eslint --fix'] },
         prettier: { '*.{ts,js}': ['prettier --write'] },
      };

      const result = composeLintStaged(fragments, { stylelint: false });

      expect(result['*.{ts,js}']).toEqual(['eslint --fix', 'prettier --write']);
   });
});
