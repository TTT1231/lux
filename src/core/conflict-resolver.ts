import fs from 'node:fs';
import path from 'node:path';
import type { FmtPreset } from '../presets/types';

const CONFIG_FAMILY: Record<string, string[]> = {
   'eslint.config.mjs': ['eslint.config.js', 'eslint.config.cjs', 'eslint.config.ts'],
   'stylelint.config.mjs': ['stylelint.config.js', 'stylelint.config.cjs', 'stylelint.config.ts'],
};

/** Find a conflicting sibling file in the same config family */
export function findConflictSibling(filename: string, cwd: string): string | undefined {
   const siblings = CONFIG_FAMILY[filename];
   if (!siblings) return undefined;

   for (const sibling of siblings) {
      if (fs.existsSync(path.join(cwd, sibling))) {
         return sibling;
      }
   }

   return undefined;
}

/** Resolve what action to take when a file conflict occurs */
export function resolveConflict(
   filename: string,
   exists: boolean,
   preset: FmtPreset,
   forceFlag: boolean,
   cwd?: string,
): 'create' | 'overwrite' | 'skip' {
   // Never overwrite list → always skip
   if (exists && preset.neverOverwrite?.includes(filename)) {
      return 'skip';
   }

   // Force overwrite list → always overwrite
   if (exists && preset.forceOverwrite?.includes(filename)) {
      return 'overwrite';
   }

   // Sibling exists + file doesn't exist + no force → skip
   if (!exists && !forceFlag && cwd && findConflictSibling(filename, cwd)) {
      return 'skip';
   }

   // File doesn't exist → create
   if (!exists) {
      return 'create';
   }

   // File exists + force flag → overwrite
   if (forceFlag) {
      return 'overwrite';
   }

   // File exists + no force → skip
   return 'skip';
}
