import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGE_NAME = '@lux/cli';

let cachedVersion: string | undefined;

/**
 * Read current CLI version from package.json (cached after first call).
 * Works both in the bundled dist/ output and when running tests from src/.
 */
export function getCurrentVersion(): string {
   if (cachedVersion) return cachedVersion;

   const __dirname = dirname(fileURLToPath(import.meta.url));

   // Bundled: dist/index.js → ../package.json
   // Source:  src/utils/version.ts → ../../package.json
   const candidates = [
      join(__dirname, '..', 'package.json'),
      join(__dirname, '..', '..', 'package.json'),
   ];

   const pkgPath = candidates.find(p => existsSync(p));
   if (!pkgPath) {
      throw new Error('Cannot locate package.json for version reading');
   }

   const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };
   cachedVersion = pkg.version;
   return cachedVersion;
}
