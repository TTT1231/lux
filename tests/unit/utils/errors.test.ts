import { describe, expect, it } from 'vitest';
import { fuzzyMatchPreset, resolvePreset } from '../../../src/utils/errors';

describe('fuzzyMatchPreset', () => {
   const available = ['web-vue', 'electron-vue', 'uniapp', 'node', 'nest'];

   it('returns exact match', () => {
      expect(fuzzyMatchPreset('web-vue', available)).toBe('web-vue');
   });

   it('returns close typo suggestion', () => {
      expect(fuzzyMatchPreset('web-vu', available)).toBe('web-vue');
      expect(fuzzyMatchPreset('electron-vu', available)).toBe('electron-vue');
   });

   it('returns null for gibberish', () => {
      expect(fuzzyMatchPreset('xyz123', available)).toBeNull();
   });

   it('returns null for empty input', () => {
      expect(fuzzyMatchPreset('', available)).toBeNull();
   });

   it('is case-insensitive', () => {
      expect(fuzzyMatchPreset('Web-vue', available)).toBe('web-vue');
      expect(fuzzyMatchPreset('NODE', available)).toBe('node');
   });
});

describe('resolvePreset', () => {
   const presets = [
      { name: 'web-vue', description: 'Vue 3' },
      { name: 'node', description: 'Node.js' },
   ];

   it('returns matching preset', () => {
      const result = resolvePreset(presets, 'web-vue');
      expect(result).toEqual({ name: 'web-vue', description: 'Vue 3' });
   });

   it('returns undefined for unknown preset (no process.exit)', () => {
      const result = resolvePreset(presets, 'nonexistent');
      expect(result).toBeUndefined();
   });

   it('returns undefined for empty presets array', () => {
      const result = resolvePreset([], 'anything');
      expect(result).toBeUndefined();
   });
});
