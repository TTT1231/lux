import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CLI_PATH = path.resolve(import.meta.dirname, '../../dist/index.js');

/** Strip ANSI escape codes for clean assertions */
function stripAnsi(str: string): string {
   // eslint-disable-next-line no-control-regex
   return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export interface RunResult {
   stdout: string;
   stderr: string;
   exitCode: number | null;
}

export interface TestContext {
   tmpDir: string;
   luxHomeDir: string;
   run(args: string[]): RunResult;
   fileExists(relativePath: string): boolean;
   readFile(relativePath: string): string | null;
   readJsonFile<T = Record<string, unknown>>(relativePath: string): T | null;
   writeFile(relativePath: string, content: string): void;
   writeJsonFile(relativePath: string, data: unknown): void;
   luxFileExists(relativePath: string): boolean;
   luxReadFile(relativePath: string): string | null;
   luxReadJsonFile<T = Record<string, unknown>>(relativePath: string): T | null;
   luxWriteFile(relativePath: string, content: string): void;
   luxWriteJsonFile(relativePath: string, data: unknown): void;
   cleanup(): void;
}

export function createTestContext(seed?: { files?: Record<string, string> }): TestContext {
   const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trw-test-'));
   const luxHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lux-home-test-'));

   const resolve = (relativePath: string) => path.join(tmpDir, ...relativePath.split('/'));
   const resolveLux = (relativePath: string) => path.join(luxHomeDir, ...relativePath.split('/'));

   if (seed?.files) {
      for (const [relativePath, content] of Object.entries(seed.files)) {
         const fullPath = resolve(relativePath);
         fs.mkdirSync(path.dirname(fullPath), { recursive: true });
         fs.writeFileSync(fullPath, content, 'utf-8');
      }
   }

   return {
      tmpDir,
      luxHomeDir,

      run(args: string[]): RunResult {
         const result = spawnSync('node', [CLI_PATH, ...args], {
            cwd: tmpDir,
            env: { ...process.env, LUX_HOME: luxHomeDir },
            encoding: 'utf-8',
            timeout: 15_000,
         });
         return {
            stdout: stripAnsi(result.stdout ?? ''),
            stderr: stripAnsi(result.stderr ?? ''),
            exitCode: result.status,
         };
      },

      fileExists(relativePath: string): boolean {
         return fs.existsSync(resolve(relativePath));
      },

      readFile(relativePath: string): string | null {
         try {
            return fs.readFileSync(resolve(relativePath), 'utf-8');
         } catch {
            return null;
         }
      },

      readJsonFile<T = Record<string, unknown>>(relativePath: string): T | null {
         try {
            const raw = fs.readFileSync(resolve(relativePath), 'utf-8');
            return JSON.parse(raw) as T;
         } catch {
            return null;
         }
      },

      writeFile(relativePath: string, content: string): void {
         const fullPath = resolve(relativePath);
         fs.mkdirSync(path.dirname(fullPath), { recursive: true });
         fs.writeFileSync(fullPath, content, 'utf-8');
      },

      writeJsonFile(relativePath: string, data: unknown): void {
         const content = JSON.stringify(data, null, 2) + '\n';
         const fullPath = resolve(relativePath);
         fs.mkdirSync(path.dirname(fullPath), { recursive: true });
         fs.writeFileSync(fullPath, content, 'utf-8');
      },

      luxFileExists(relativePath: string): boolean {
         return fs.existsSync(resolveLux(relativePath));
      },

      luxReadFile(relativePath: string): string | null {
         try {
            return fs.readFileSync(resolveLux(relativePath), 'utf-8');
         } catch {
            return null;
         }
      },

      luxReadJsonFile<T = Record<string, unknown>>(relativePath: string): T | null {
         try {
            const raw = fs.readFileSync(resolveLux(relativePath), 'utf-8');
            return JSON.parse(raw) as T;
         } catch {
            return null;
         }
      },

      luxWriteFile(relativePath: string, content: string): void {
         const fullPath = resolveLux(relativePath);
         fs.mkdirSync(path.dirname(fullPath), { recursive: true });
         fs.writeFileSync(fullPath, content, 'utf-8');
      },

      luxWriteJsonFile(relativePath: string, data: unknown): void {
         const content = JSON.stringify(data, null, 2) + '\n';
         const fullPath = resolveLux(relativePath);
         fs.mkdirSync(path.dirname(fullPath), { recursive: true });
         fs.writeFileSync(fullPath, content, 'utf-8');
      },

      cleanup(): void {
         fs.rmSync(tmpDir, { recursive: true, force: true });
         fs.rmSync(luxHomeDir, { recursive: true, force: true });
      },
   };
}
