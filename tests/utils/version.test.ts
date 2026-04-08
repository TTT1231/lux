import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME, getCurrentVersion } from '../../src/utils/version';

describe('getCurrentVersion', () => {
   it('returns a semver string', () => {
      const version = getCurrentVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
   });

   it('caches the result', () => {
      const a = getCurrentVersion();
      const b = getCurrentVersion();
      expect(a).toBe(b);
   });
});

describe('PACKAGE_NAME', () => {
   it('is the scoped package name', () => {
      expect(PACKAGE_NAME).toBe('@luxkit/cli');
   });
});
