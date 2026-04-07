import { describe, expect, it } from 'vitest';
import { resolveConflict } from '../../src/core/conflict-resolver';
import type { FmtPreset } from '../../src/presets/types';

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
