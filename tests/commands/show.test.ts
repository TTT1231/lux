import { afterEach, describe, expect, it } from 'vitest';
import {
   getEnvConfig,
   getEnvConfigPath,
   setEnvConfig,
   clearEnvConfig,
} from '../../src/utils/config';
import fs from 'node:fs';

describe('config utilities', () => {
   const configPath = getEnvConfigPath();

   afterEach(() => {
      clearEnvConfig();
   });

   it('reads empty config when file does not exist', () => {
      const config = getEnvConfig();
      expect(config).toEqual({});
   });

   it('writes and reads key=value config', () => {
      setEnvConfig({
         https_proxy: 'http://127.0.0.1:7890/',
         http_proxy: 'http://127.0.0.1:7890/',
         all_proxy: 'socks5://127.0.0.1:7890',
      });

      const config = getEnvConfig();
      expect(config.https_proxy).toBe('http://127.0.0.1:7890/');
      expect(config.http_proxy).toBe('http://127.0.0.1:7890/');
      expect(config.all_proxy).toBe('socks5://127.0.0.1:7890');
   });

   it('clears config by deleting the file', () => {
      setEnvConfig({ https_proxy: 'http://test:1234/' });
      expect(fs.existsSync(configPath)).toBe(true);

      clearEnvConfig();
      expect(fs.existsSync(configPath)).toBe(false);
   });

   it('skips blank lines and comments when reading', () => {
      fs.writeFileSync(
         configPath,
         '# comment\nhttps_proxy=http://test:9999\n\nhttp_proxy=http://test:9999\n',
         'utf-8',
      );

      const config = getEnvConfig();
      expect(config).toEqual({
         https_proxy: 'http://test:9999',
         http_proxy: 'http://test:9999',
      });
   });

   it('excludes empty values when writing', () => {
      setEnvConfig({ https_proxy: 'http://test:9999/', all_proxy: '' });

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).not.toContain('all_proxy=');
      expect(content).toContain('https_proxy=http://test:9999/');
   });
});
