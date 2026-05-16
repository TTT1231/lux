import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { getEnvConfig, getEnvConfigPath } from '../../../src/utils/config';

describe('getEnvConfig', () => {
   const envPath = getEnvConfigPath();
   const configDir = path.dirname(envPath);

   let savedContent: string | null = null;
   let savedExisted = false;

   beforeAll(() => {
      savedExisted = fs.existsSync(envPath);
      if (savedExisted) {
         savedContent = fs.readFileSync(envPath, 'utf-8');
      }
   });

   afterEach(() => {
      removeEnvFile();
   });

   afterAll(() => {
      if (savedExisted && savedContent !== null) {
         fs.writeFileSync(envPath, savedContent, 'utf-8');
      } else if (!savedExisted) {
         try {
            fs.unlinkSync(envPath);
         } catch {
            // already gone
         }
      }
   });

   function writeEnvFile(content: string): void {
      if (!fs.existsSync(configDir)) {
         fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(envPath, content, 'utf-8');
   }

   function removeEnvFile(): void {
      try {
         fs.unlinkSync(envPath);
      } catch {
         // already gone
      }
   }

   it('parses lux_package_manager="pnpm" from env.txt', () => {
      writeEnvFile('lux_package_manager="pnpm"\n');

      const config = getEnvConfig();

      expect(config).toEqual({ lux_package_manager: 'pnpm' });
   });

   it('returns empty object when file is missing', () => {
      removeEnvFile();

      const config = getEnvConfig();

      expect(config).toEqual({});
   });

   it('coexists with proxy keys in same file', () => {
      writeEnvFile('https_proxy="http://127.0.0.1:7890"\nlux_package_manager="pnpm"\n');

      const config = getEnvConfig();

      expect(config).toEqual({
         https_proxy: 'http://127.0.0.1:7890',
         lux_package_manager: 'pnpm',
      });
   });
});
