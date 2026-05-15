import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generateAllFmt } from '../../src/generators/fmt';
import type { FmtPreset, GenerateOptions } from '../../src/presets/types';

function createTempDir(): string {
   return fs.mkdtempSync(path.join(os.tmpdir(), 'lux-fmt-gen-test-'));
}

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

const presetWithLintStaged: FmtPreset = {
   name: 'test-preset',
   description: 'Test',
   eslint: () => 'export default []\n',
   lintStaged: () =>
      JSON.stringify(
         {
            '*.{ts,js}': ['eslint --fix', 'prettier --write'],
         },
         null,
         2,
      ) + '\n',
};

describe('generateAllFmt', () => {
   let tmpDir: string;

   afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   it('generates .lintstagedrc.json when preset has lintStaged and flag is active', () => {
      tmpDir = createTempDir();

      const result = generateAllFmt(presetWithLintStaged, {
         ...baseOpts,
         cwd: tmpDir,
         noLintStaged: false,
      });

      const filePath = path.join(tmpDir, '.lintstagedrc.json');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(result.created).toContain('.lintstagedrc.json');

      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content['*.{ts,js}']).toEqual(['eslint --fix', 'prettier --write']);
   });

   it('skips .lintstagedrc.json when noLintStaged is true', () => {
      tmpDir = createTempDir();

      const result = generateAllFmt(presetWithLintStaged, {
         ...baseOpts,
         cwd: tmpDir,
         noLintStaged: true,
      });

      expect(fs.existsSync(path.join(tmpDir, '.lintstagedrc.json'))).toBe(false);
      expect(result.created).not.toContain('.lintstagedrc.json');
   });

   it('skips .lintstagedrc.json when preset has no lintStaged field', () => {
      tmpDir = createTempDir();

      const presetNoLintStaged: FmtPreset = {
         name: 'no-lint-staged',
         description: 'No lint-staged',
         eslint: () => 'export default []\n',
      };

      const result = generateAllFmt(presetNoLintStaged, {
         ...baseOpts,
         cwd: tmpDir,
         noLintStaged: false,
      });

      expect(fs.existsSync(path.join(tmpDir, '.lintstagedrc.json'))).toBe(false);
      expect(result.created).not.toContain('.lintstagedrc.json');
   });
});
