import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeFile } from './fs';

const CONFIG_DIR = '.lux';
const ENV_FILE = 'env.txt';

export function getEnvConfigPath(): string {
   return path.join(os.homedir(), CONFIG_DIR, ENV_FILE);
}

export function getEnvConfig(): Record<string, string> {
   let content: string;
   try {
      content = fs.readFileSync(getEnvConfigPath(), 'utf-8');
   } catch {
      return {};
   }

   const result: Record<string, string> = {};
   for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key) result[key] = value;
   }

   return result;
}

export function setEnvConfig(data: Record<string, string>): void {
   const lines = Object.entries(data)
      .filter(([, v]) => v !== '')
      .map(([k, v]) => `${k}=${v}`);
   writeFile(getEnvConfigPath(), lines.join('\n') + '\n');
}

export function clearEnvConfig(): void {
   try {
      fs.unlinkSync(getEnvConfigPath());
   } catch {
      // file doesn't exist — already clean
   }
}
