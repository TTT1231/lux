import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { findConflictSibling, resolveConflict } from '../../../src/core/conflict-resolver';
import type { FmtPreset } from '../../../src/presets/types';

const basePreset: FmtPreset = {
   name: 'test',
   description: 'test preset',
};

describe('resolveConflict', () => {
   it('returns "create" when file does not exist', () => {
      expect(resolveConflict('any.txt', false, basePreset, false)).toBe('create');
   });

   it('returns "skip" when file exists without --force', () => {
      expect(resolveConflict('any.txt', true, basePreset, false)).toBe('skip');
   });

   it('returns "overwrite" when file exists with --force', () => {
      expect(resolveConflict('any.txt', true, basePreset, true)).toBe('overwrite');
   });

   it('returns "skip" for neverOverwrite even with --force', () => {
      const preset: FmtPreset = {
         ...basePreset,
         neverOverwrite: ['protected.config'],
      };
      expect(resolveConflict('protected.config', true, preset, true)).toBe('skip');
   });

   it('returns "overwrite" for forceOverwrite even without --force', () => {
      const preset: FmtPreset = {
         ...basePreset,
         forceOverwrite: ['.prettierrc'],
      };
      expect(resolveConflict('.prettierrc', true, preset, false)).toBe('overwrite');
   });

   it('neverOverwrite takes priority over forceOverwrite', () => {
      const preset: FmtPreset = {
         ...basePreset,
         neverOverwrite: ['eslint.config.mjs'],
         forceOverwrite: ['eslint.config.mjs'],
      };
      expect(resolveConflict('eslint.config.mjs', true, preset, true)).toBe('skip');
   });
});

describe('findConflictSibling', () => {
   const tmpDir = path.join(os.tmpdir(), 'sibling-test-' + process.pid);

   beforeAll(() => {
      fs.mkdirSync(tmpDir, { recursive: true });
   });

   afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   afterEach(() => {
      for (const f of fs.readdirSync(tmpDir)) {
         fs.unlinkSync(path.join(tmpDir, f));
      }
   });

   it('returns undefined when no siblings exist', () => {
      expect(findConflictSibling('eslint.config.mjs', tmpDir)).toBeUndefined();
   });

   it('returns undefined for files without a family mapping', () => {
      expect(findConflictSibling('.prettierrc', tmpDir)).toBeUndefined();
   });

   it('returns sibling filename when eslint.config.js exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.js'), '');
      expect(findConflictSibling('eslint.config.mjs', tmpDir)).toBe('eslint.config.js');
   });

   it('returns first found sibling when multiple siblings exist', () => {
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.cjs'), '');
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.ts'), '');
      const result = findConflictSibling('eslint.config.mjs', tmpDir);
      expect(result).toBeDefined();
      expect(['eslint.config.cjs', 'eslint.config.ts']).toContain(result);
   });

   it('detects stylelint config siblings', () => {
      fs.writeFileSync(path.join(tmpDir, 'stylelint.config.js'), '');
      expect(findConflictSibling('stylelint.config.mjs', tmpDir)).toBe('stylelint.config.js');
   });

   it('returns undefined when only the target file itself exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.mjs'), '');
      expect(findConflictSibling('eslint.config.mjs', tmpDir)).toBeUndefined();
   });
});

describe('resolveConflict with sibling detection', () => {
   const tmpDir = path.join(os.tmpdir(), 'resolve-sibling-' + process.pid);

   beforeAll(() => {
      fs.mkdirSync(tmpDir, { recursive: true });
   });

   afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   afterEach(() => {
      for (const f of fs.readdirSync(tmpDir)) {
         fs.unlinkSync(path.join(tmpDir, f));
      }
   });

   it('returns "skip" when sibling exists and file does not', () => {
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.js'), '');
      expect(resolveConflict('eslint.config.mjs', false, basePreset, false, tmpDir)).toBe('skip');
   });

   it('returns "create" when no sibling exists and file does not', () => {
      expect(resolveConflict('eslint.config.mjs', false, basePreset, false, tmpDir)).toBe('create');
   });

   it('returns "create" when sibling exists but --force is set', () => {
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.js'), '');
      expect(resolveConflict('eslint.config.mjs', false, basePreset, true, tmpDir)).toBe('create');
   });

   it('returns "skip" for neverOverwrite even when sibling does not exist', () => {
      const preset: FmtPreset = {
         ...basePreset,
         neverOverwrite: ['eslint.config.mjs'],
      };
      expect(resolveConflict('eslint.config.mjs', true, preset, true, tmpDir)).toBe('skip');
   });

   it('returns "overwrite" for forceOverwrite even when sibling exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'eslint.config.js'), '');
      const preset: FmtPreset = {
         ...basePreset,
         forceOverwrite: ['eslint.config.mjs'],
      };
      expect(resolveConflict('eslint.config.mjs', true, preset, false, tmpDir)).toBe('overwrite');
   });

   it('returns "skip" for stylelint sibling', () => {
      fs.writeFileSync(path.join(tmpDir, 'stylelint.config.ts'), '');
      expect(resolveConflict('stylelint.config.mjs', false, basePreset, false, tmpDir)).toBe('skip');
   });

   it('ignores siblings for files not in CONFIG_FAMILY', () => {
      expect(resolveConflict('.prettierrc', false, basePreset, false, tmpDir)).toBe('create');
   });
});
