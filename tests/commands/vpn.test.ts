import { describe, expect, it } from 'vitest';
import { buildCommands } from '../../src/commands/vpn';

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
