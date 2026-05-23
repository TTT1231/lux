import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { detectPackageManager, getRunPrefix, getExecPrefix, addDepsToManifest } from '../../../src/utils/deps';

vi.mock('../../../src/utils/config', () => ({
   getEnvConfig: vi.fn(),
}));

import { getEnvConfig } from '../../../src/utils/config';

const mockGetEnvConfig = vi.mocked(getEnvConfig);

function mockFetchVersion(versionMap: Record<string, string>) {
   return vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString();
      // pathname: /@scope/pkg/latest or /pkg/latest → extract everything before /latest
      const pathname = new URL(url).pathname;
      const pkgName = pathname.slice(1, -'/latest'.length);
      const version = versionMap[pkgName];
      if (!version) {
         return { ok: false, json: async () => ({}) } as Response;
      }
      return {
         ok: true,
         json: async () => ({ version }),
      } as unknown as Response;
   });
}

describe('getRunPrefix', () => {
   it('returns correct prefix for each package manager', () => {
      expect(getRunPrefix('bun')).toBe('bun run');
      expect(getRunPrefix('pnpm')).toBe('pnpm run');
      expect(getRunPrefix('yarn')).toBe('yarn run');
      expect(getRunPrefix('npm')).toBe('npm run');
   });
});

describe('getExecPrefix', () => {
   it('returns correct exec prefix for each package manager', () => {
      expect(getExecPrefix('bun')).toBe('bunx');
      expect(getExecPrefix('pnpm')).toBe('pnpx');
      expect(getExecPrefix('yarn')).toBe('yarn dlx');
      expect(getExecPrefix('npm')).toBe('npx');
   });
});

describe('detectPackageManager', () => {
   let tmpDir = '';

   beforeEach(() => {
      mockGetEnvConfig.mockReturnValue({});
   });

   afterEach(() => {
      if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   it('detects bun from bun.lockb', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-test-'));
      fs.writeFileSync(path.join(tmpDir, 'bun.lockb'), '');
      expect(detectPackageManager(tmpDir)).toBe('bun');
   });

   it('detects bun from bun.lock', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-test-'));
      fs.writeFileSync(path.join(tmpDir, 'bun.lock'), '');
      expect(detectPackageManager(tmpDir)).toBe('bun');
   });

   it('detects pnpm from pnpm-lock.yaml', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-test-'));
      fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      expect(detectPackageManager(tmpDir)).toBe('pnpm');
   });

   it('detects yarn from yarn.lock', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-test-'));
      fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '');
      expect(detectPackageManager(tmpDir)).toBe('yarn');
   });

   it('defaults to npm when no lockfile', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-test-'));
      expect(detectPackageManager(tmpDir)).toBe('npm');
   });

   it('bun takes priority over pnpm and yarn', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-test-'));
      fs.writeFileSync(path.join(tmpDir, 'bun.lockb'), '');
      fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '');
      expect(detectPackageManager(tmpDir)).toBe('bun');
   });

   it('pnpm takes priority over yarn', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-test-'));
      fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '');
      expect(detectPackageManager(tmpDir)).toBe('pnpm');
   });
});

describe('detectPackageManager — global config override', () => {
   let tmpDir = '';

   beforeEach(() => {
      mockGetEnvConfig.mockReturnValue({});
   });

   afterEach(() => {
      mockGetEnvConfig.mockReturnValue({});
      vi.restoreAllMocks();
      if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   it('uses global config when set', () => {
      mockGetEnvConfig.mockReturnValue({ lux_package_manager: 'pnpm' });
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-config-'));
      // No lockfiles — but global config says pnpm
      expect(detectPackageManager(tmpDir)).toBe('pnpm');
   });

   it('falls back to lockfile when config is auto', () => {
      mockGetEnvConfig.mockReturnValue({ lux_package_manager: 'auto' });
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-config-'));
      fs.writeFileSync(path.join(tmpDir, 'bun.lock'), '');
      expect(detectPackageManager(tmpDir)).toBe('bun');
   });

   it('falls back to lockfile when config is unset', () => {
      mockGetEnvConfig.mockReturnValue({});
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-config-'));
      fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      expect(detectPackageManager(tmpDir)).toBe('pnpm');
   });

   it('warns when global PM mismatches lockfile', () => {
      mockGetEnvConfig.mockReturnValue({ lux_package_manager: 'pnpm' });
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-config-'));
      fs.writeFileSync(path.join(tmpDir, 'bun.lock'), '');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(detectPackageManager(tmpDir)).toBe('pnpm');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Global config is pnpm but detected bun lockfile'));
      warnSpy.mockRestore();
   });
});

describe('addDepsToManifest', () => {
   let tmpDir = '';

   afterEach(() => {
      vi.restoreAllMocks();
      if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
   });

   function createPkgJson(dir: string, devDeps?: Record<string, string>) {
      const content = JSON.stringify({ name: 'test-project', devDependencies: devDeps ?? {} }, null, 2);
      fs.writeFileSync(path.join(dir, 'package.json'), content);
   }

   function readDevDeps(dir: string): Record<string, string> {
      const raw = fs.readFileSync(path.join(dir, 'package.json'), 'utf-8');
      return JSON.parse(raw).devDependencies ?? {};
   }

   it('adds missing deps with ^version format', async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-manifest-'));
      createPkgJson(tmpDir);

      vi.spyOn(globalThis, 'fetch').mockImplementation(mockFetchVersion({ eslint: '9.25.0', prettier: '3.3.0' }));

      const added = await addDepsToManifest(['eslint', 'prettier'], tmpDir);

      expect(added).toEqual(['eslint', 'prettier']);
      const deps = readDevDeps(tmpDir);
      expect(deps['eslint']).toBe('^9.25.0');
      expect(deps['prettier']).toBe('^3.3.0');
   });

   it('skips already-installed deps', async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-manifest-'));
      createPkgJson(tmpDir, { eslint: '^9.0.0' });

      vi.spyOn(globalThis, 'fetch').mockImplementation(mockFetchVersion({ prettier: '3.3.0' }));

      const added = await addDepsToManifest(['eslint', 'prettier'], tmpDir);

      expect(added).toEqual(['prettier']);
      const deps = readDevDeps(tmpDir);
      expect(deps['eslint']).toBe('^9.0.0');
      expect(deps['prettier']).toBe('^3.3.0');
   });

   it('returns empty array when all deps already present', async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-manifest-'));
      createPkgJson(tmpDir, { eslint: '^9.0.0', prettier: '^3.0.0' });

      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const added = await addDepsToManifest(['eslint', 'prettier'], tmpDir);

      expect(added).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
   });

   it('throws when package.json not found', async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-manifest-'));

      await expect(addDepsToManifest(['eslint'], tmpDir)).rejects.toThrow('package.json not found');
   });

   it('throws when fetch fails', async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-manifest-'));
      createPkgJson(tmpDir);

      vi.spyOn(globalThis, 'fetch').mockImplementation(mockFetchVersion({}));

      await expect(addDepsToManifest(['nonexistent-pkg'], tmpDir)).rejects.toThrow(
         'Failed to fetch version for "nonexistent-pkg"',
      );
   });

   it('uses pinned versions when provided', async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-manifest-'));
      createPkgJson(tmpDir);

      vi.spyOn(globalThis, 'fetch');

      const added = await addDepsToManifest(['eslint', 'prettier'], tmpDir, {
         eslint: '^9.25.0',
         prettier: '^3.3.0',
      });

      expect(added).toEqual(['eslint', 'prettier']);
      const deps = readDevDeps(tmpDir);
      expect(deps['eslint']).toBe('^9.25.0');
      expect(deps['prettier']).toBe('^3.3.0');
      // Should NOT have fetched from registry
      expect(globalThis.fetch).not.toHaveBeenCalled();
   });

   it('resolves <latest> placeholder from registry', async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-manifest-'));
      createPkgJson(tmpDir);

      vi.spyOn(globalThis, 'fetch').mockImplementation(mockFetchVersion({ prettier: '3.3.0' }));

      const added = await addDepsToManifest(['eslint', 'prettier'], tmpDir, {
         eslint: '^9.25.0',
         prettier: '<latest>',
      });

      expect(added).toEqual(['eslint', 'prettier']);
      const deps = readDevDeps(tmpDir);
      expect(deps['eslint']).toBe('^9.25.0');
      expect(deps['prettier']).toBe('^3.3.0');
      // Only prettier should have been fetched (eslint was pinned)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
   });
});
