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
