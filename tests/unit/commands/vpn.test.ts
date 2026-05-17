import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCommands, handleSet } from '../../../src/commands/vpn';

vi.mock('../../../src/utils/config', () => ({
   getEnvConfig: vi.fn().mockReturnValue({}),
   setEnvConfig: vi.fn(),
   clearEnvConfig: vi.fn(),
}));

vi.mock('../../../src/utils/logger', () => ({
   logger: {
      log: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
   },
}));

vi.mock('../../../src/utils/platform', () => ({
   getPlatform: vi.fn().mockReturnValue('win32'),
}));

vi.mock('node:child_process', () => ({
   spawnSync: vi.fn().mockReturnValue({ status: 0 }),
}));

describe('buildCommands', () => {
   const fullEnv = {
      https_proxy: 'http://127.0.0.1:9876/',
      http_proxy: 'http://127.0.0.1:9876/',
      all_proxy: 'socks5://127.0.0.1:9876',
   };

   it('generates single-line CMD set commands joined by &&', () => {
      const result = buildCommands('cmd', fullEnv);
      expect(result).toBe(
         'set https_proxy=http://127.0.0.1:9876/ && set http_proxy=http://127.0.0.1:9876/ && set all_proxy=socks5://127.0.0.1:9876',
      );
      expect(result).not.toContain('\n');
   });

   it('generates single-line PowerShell env commands joined by ;', () => {
      const result = buildCommands('pw', fullEnv);
      expect(result).toBe(
         '$env:https_proxy="http://127.0.0.1:9876/" ; $env:http_proxy="http://127.0.0.1:9876/" ; $env:all_proxy="socks5://127.0.0.1:9876"',
      );
      expect(result).not.toContain('\n');
   });

   it('generates single-line Bash export commands joined by &&', () => {
      const result = buildCommands('bash', fullEnv);
      expect(result).toBe(
         'export https_proxy="http://127.0.0.1:9876/" && export http_proxy="http://127.0.0.1:9876/" && export all_proxy="socks5://127.0.0.1:9876"',
      );
      expect(result).not.toContain('\n');
   });

   it('only generates commands for configured keys', () => {
      const partial = { https_proxy: 'http://127.0.0.1:7890/' };
      expect(buildCommands('cmd', partial)).toBe('set https_proxy=http://127.0.0.1:7890/');
      expect(buildCommands('pw', partial)).toBe('$env:https_proxy="http://127.0.0.1:7890/"');
      expect(buildCommands('bash', partial)).toBe('export https_proxy="http://127.0.0.1:7890/"');
   });
});

describe('handleSet lux_package_manager validation', () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   async function getMocks() {
      const config = await import('../../../src/utils/config');
      const loggerMod = await import('../../../src/utils/logger');
      return {
         setEnvConfig: vi.mocked(config.setEnvConfig),
         logger: vi.mocked(loggerMod.logger),
      };
   }

   it('accepts valid package manager value "pnpm"', async () => {
      const { setEnvConfig } = await getMocks();
      handleSet(['lux_package_manager=pnpm']);
      expect(setEnvConfig).toHaveBeenCalledWith({ lux_package_manager: 'pnpm' });
   });

   it('accepts "auto" as value', async () => {
      const { setEnvConfig } = await getMocks();
      handleSet(['lux_package_manager=auto']);
      expect(setEnvConfig).toHaveBeenCalledWith({ lux_package_manager: 'auto' });
   });

   it('rejects invalid package manager value', async () => {
      const { setEnvConfig, logger } = await getMocks();
      handleSet(['lux_package_manager=invalid']);
      expect(setEnvConfig).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
         'Invalid package manager: "invalid". Allowed values: auto, bun, pnpm, yarn, npm',
      );
   });
});

import { getPlatform } from '../../../src/utils/platform';
import { spawnSync } from 'node:child_process';

const mockGetPlatform = vi.mocked(getPlatform);
const mockSpawnSync = vi.mocked(spawnSync);

const SPAWN_SUCCESS = {
   status: 0,
   pid: 1,
   output: [null, '', ''],
   stdout: '',
   stderr: '',
   signal: null,
};
const SPAWN_FAILURE = { ...SPAWN_SUCCESS, status: 1 };

describe('copyToClipboard', () => {
   beforeEach(() => {
      vi.clearAllMocks();
      mockGetPlatform.mockReturnValue('win32');
      mockSpawnSync.mockReturnValue(SPAWN_SUCCESS);
   });

   it('uses clip on win32', async () => {
      const { copyToClipboard } = await import('../../../src/commands/vpn');
      copyToClipboard('test');
      expect(mockSpawnSync).toHaveBeenCalledWith('clip', [], expect.any(Object));
   });

   it('uses pbcopy on darwin', async () => {
      mockGetPlatform.mockReturnValue('darwin');
      const { copyToClipboard } = await import('../../../src/commands/vpn');
      copyToClipboard('test');
      expect(mockSpawnSync).toHaveBeenCalledWith('pbcopy', [], expect.any(Object));
   });

   it('uses xclip on linux', async () => {
      mockGetPlatform.mockReturnValue('linux');
      const { copyToClipboard } = await import('../../../src/commands/vpn');
      copyToClipboard('test');
      expect(mockSpawnSync).toHaveBeenCalledWith('xclip', [], expect.any(Object));
   });

   it('returns false when spawnSync fails', async () => {
      mockSpawnSync.mockReturnValue(SPAWN_FAILURE);
      const { copyToClipboard } = await import('../../../src/commands/vpn');
      expect(copyToClipboard('test')).toBe(false);
   });

   it('returns true when spawnSync succeeds', async () => {
      mockSpawnSync.mockReturnValue(SPAWN_SUCCESS);
      const { copyToClipboard } = await import('../../../src/commands/vpn');
      expect(copyToClipboard('test')).toBe(true);
   });
});
