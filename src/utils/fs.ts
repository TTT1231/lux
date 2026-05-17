import fs from 'node:fs';
import path from 'node:path';
import { logger } from './logger';

/** Check if a file exists */
export function fileExists(filePath: string): boolean {
   return fs.existsSync(filePath);
}

/** Ensure directory exists, create if missing */
export function ensureDir(dirPath: string): void {
   if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
   }
}

/** Write file with directory auto-creation */
export function writeFile(filePath: string, content: string): void {
   ensureDir(path.dirname(filePath));
   fs.writeFileSync(filePath, content, 'utf-8');
}

/** Read and parse JSON file, return null if not exists. Logs parse/IO errors. */
export function readJson<T = Record<string, unknown>>(filePath: string): T | null {
   try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
   } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to read or parse ${path.basename(filePath)}: ${message}`);
      return null;
   }
}

/** Write JSON with 2-space indent + trailing newline */
export function writeJson(filePath: string, data: unknown): void {
   const content = JSON.stringify(data, null, 2) + '\n';
   writeFile(filePath, content);
}

/** Read file content as string, return null if not exists. Logs IO errors. */
export function readFile(filePath: string): string | null {
   try {
      return fs.readFileSync(filePath, 'utf-8');
   } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to read ${path.basename(filePath)}: ${message}`);
      return null;
   }
}
