import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectGlobalPackageManager, fetchLatestVersion } from '../../../src/commands/update';

describe('update command internals', () => {
   describe('detectGlobalPackageManager', () => {
      it('detects bun from process.execPath', () => {
         const original = process.execPath;
         try {
            Object.defineProperty(process, 'execPath', {
               value: '/home/user/.bun/bin/bun',
               configurable: true,
            });
            expect(detectGlobalPackageManager()).toBe('bun');
         } finally {
            Object.defineProperty(process, 'execPath', {
               value: original,
               configurable: true,
            });
         }
      });

      it('defaults to npm for node runtime', () => {
         const original = process.execPath;
         try {
            Object.defineProperty(process, 'execPath', {
               value: '/usr/local/bin/node',
               configurable: true,
            });
            expect(detectGlobalPackageManager()).toBe('npm');
         } finally {
            Object.defineProperty(process, 'execPath', {
               value: original,
               configurable: true,
            });
         }
      });
   });

   describe('fetchLatestVersion', () => {
      afterEach(() => {
         vi.restoreAllMocks();
      });

      it('returns version from registry', async () => {
         vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ version: '2.0.0' }),
         } as unknown as Response);

         const version = await fetchLatestVersion();
         expect(version).toBe('2.0.0');
      });

      it('throws when response is not ok', async () => {
         vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: false,
            json: async () => ({}),
         } as unknown as Response);

         await expect(fetchLatestVersion()).rejects.toThrow('Failed to fetch latest version');
      });

      it('throws when version field is missing', async () => {
         vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ name: '@luxkit/cli' }),
         } as unknown as Response);

         await expect(fetchLatestVersion()).rejects.toThrow('missing version field');
      });
   });
});
