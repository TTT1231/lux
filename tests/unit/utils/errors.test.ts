import { describe, expect, it } from 'vitest';
import { fuzzyMatchPreset } from '../../../src/utils/errors';

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
