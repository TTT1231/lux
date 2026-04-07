import { describe, expect, it } from 'vitest';
import { fuzzyMatchPreset } from '../../src/utils/errors';

describe('fuzzyMatchPreset', () => {
   const available = ['web', 'electron', 'uniapp', 'node', 'nest'];

   it('returns exact match', () => {
      expect(fuzzyMatchPreset('web', available)).toBe('web');
   });

   it('returns close typo suggestion', () => {
      expect(fuzzyMatchPreset('webs', available)).toBe('web');
      expect(fuzzyMatchPreset('electorn', available)).toBe('electron');
   });

   it('returns null for gibberish', () => {
      expect(fuzzyMatchPreset('xyz123', available)).toBeNull();
   });

   it('returns null for empty input', () => {
      expect(fuzzyMatchPreset('', available)).toBeNull();
   });

   it('is case-insensitive', () => {
      expect(fuzzyMatchPreset('Web', available)).toBe('web');
      expect(fuzzyMatchPreset('NODE', available)).toBe('node');
   });
});
