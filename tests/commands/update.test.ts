import { describe, expect, it, vi } from 'vitest';
import { detectGlobalPackageManager, fetchLatestVersion } from '../../src/commands/update';

vi.mock('../../src/utils/execFileNoThrow', () => ({
   execFileNoThrow: vi.fn(),
}));

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
      it('returns version from npm view', async () => {
         const { execFileNoThrow } = await import('../../src/utils/execFileNoThrow');
         (execFileNoThrow as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            stdout: '2.0.0',
            stderr: '',
            exitCode: 0,
         });

         const version = await fetchLatestVersion();
         expect(version).toBe('2.0.0');
      });

      it('takes last non-empty line from multi-line output', async () => {
         const { execFileNoThrow } = await import('../../src/utils/execFileNoThrow');
         (execFileNoThrow as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            stdout: '\nnpm warning ...\n2.1.0\n',
            stderr: '',
            exitCode: 0,
         });

         const version = await fetchLatestVersion();
         expect(version).toBe('2.1.0');
      });

      it('throws on non-zero exit code', async () => {
         const { execFileNoThrow } = await import('../../src/utils/execFileNoThrow');
         (execFileNoThrow as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            stdout: '',
            stderr: 'E404',
            exitCode: 1,
         });

         await expect(fetchLatestVersion()).rejects.toThrow('Failed to fetch latest version');
      });
   });
});
