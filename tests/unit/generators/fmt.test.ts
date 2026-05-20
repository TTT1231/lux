import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generateAllFmt } from '../../../src/generators/fmt';
import type { FmtPreset, GenerateOptions } from '../../../src/presets/types';

function createTempDir(): string {
   return fs.mkdtempSync(path.join(os.tmpdir(), 'lux-fmt-gen-test-'));
}

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

const presetWithLintStaged: FmtPreset = {
   name: 'test-preset',
   description: 'Test',
   eslint: () => 'export default []\n',
   lintStagedFragments: {
      eslint: {
         '*.{ts,js}': ['eslint --fix', 'prettier --write'],
      },
   },
   lintStaged: ({ stylelint }) => {
      const config: Record<string, string[]> = {
         '*.{ts,js}': ['eslint --fix', 'prettier --write'],
      };
      if (stylelint) {
         config['*.{css,scss}'] = ['stylelint --fix'];
      }
      return JSON.stringify(config, null, 2) + '\n';
   },
};

describe('generateAllFmt', () => {
   let tmpDir: string;

   afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   it('generates .lintstagedrc.json when preset has lintStagedFragments and lintStaged flag is true', () => {
      tmpDir = createTempDir();

      const result = generateAllFmt(presetWithLintStaged, {
         ...baseOpts,
         cwd: tmpDir,
         lintStaged: true,
      });

      const filePath = path.join(tmpDir, '.lintstagedrc.json');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(result.created).toContain('.lintstagedrc.json');

      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content['*.{ts,js}']).toEqual(['eslint --fix', 'prettier --write']);
   });

   it('generates .lintstagedrc.json using lintStaged function when available', () => {
      tmpDir = createTempDir();

      const result = generateAllFmt(presetWithLintStaged, {
         ...baseOpts,
         cwd: tmpDir,
         lintStaged: true,
      });

      const filePath = path.join(tmpDir, '.lintstagedrc.json');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(result.created).toContain('.lintstagedrc.json');

      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content['*.{ts,js}']).toEqual(['eslint --fix', 'prettier --write']);
   });

   it('skips .lintstagedrc.json when lintStaged flag is false', () => {
      tmpDir = createTempDir();

      const result = generateAllFmt(presetWithLintStaged, {
         ...baseOpts,
         cwd: tmpDir,
         lintStaged: false,
      });

      expect(fs.existsSync(path.join(tmpDir, '.lintstagedrc.json'))).toBe(false);
      expect(result.created).not.toContain('.lintstagedrc.json');
   });

   it('skips .lintstagedrc.json when preset has no lintStagedFragments field', () => {
      tmpDir = createTempDir();

      const presetNoLintStaged: FmtPreset = {
         name: 'no-lint-staged',
         description: 'No lint-staged',
         eslint: () => 'export default []\n',
      };

      const result = generateAllFmt(presetNoLintStaged, {
         ...baseOpts,
         cwd: tmpDir,
         lintStaged: true,
      });

      expect(fs.existsSync(path.join(tmpDir, '.lintstagedrc.json'))).toBe(false);
      expect(result.created).not.toContain('.lintstagedrc.json');
   });

   it('generates fallback tsconfig files when project has none', () => {
      tmpDir = createTempDir();

      const presetWithTsconfig: FmtPreset = {
         name: 'tsconfig-preset',
         description: 'TS config',
         tsconfig: () => ({
            'tsconfig.json': '{"compilerOptions":{}}\n',
            'tsconfig.app.json': '{"extends":"./tsconfig.json"}\n',
         }),
      };

      const result = generateAllFmt(presetWithTsconfig, {
         ...baseOpts,
         cwd: tmpDir,
      });

      expect(result.created).toContain('tsconfig.json');
      expect(result.created).toContain('tsconfig.app.json');
      expect(fs.existsSync(path.join(tmpDir, 'tsconfig.json'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'tsconfig.app.json'))).toBe(true);
   });

   it('skips all fallback tsconfig files when project already has any tsconfig', () => {
      tmpDir = createTempDir();
      fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{"compilerOptions":{"strict":false}}\n');

      const presetWithTsconfig: FmtPreset = {
         name: 'tsconfig-preset',
         description: 'TS config',
         tsconfig: () => ({
            'tsconfig.json': '{"compilerOptions":{"strict":true}}\n',
            'tsconfig.app.json': '{"extends":"./tsconfig.json"}\n',
         }),
      };

      const result = generateAllFmt(presetWithTsconfig, {
         ...baseOpts,
         cwd: tmpDir,
         force: true,
      });

      expect(result.skipped).toContain('tsconfig.json');
      expect(result.skipped).toContain('tsconfig.app.json');
      expect(fs.existsSync(path.join(tmpDir, 'tsconfig.app.json'))).toBe(false);
      expect(fs.readFileSync(path.join(tmpDir, 'tsconfig.json'), 'utf-8')).toBe(
         '{"compilerOptions":{"strict":false}}\n',
      );
   });
});
