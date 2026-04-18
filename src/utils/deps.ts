import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileExists, readJson } from './fs';

export type PackageManager = 'bun' | 'pnpm' | 'yarn' | 'npm';

/** Detect package manager from lockfile in the given directory */
export function detectPackageManager(cwd: string): PackageManager {
   if (fileExists(`${cwd}/bun.lockb`) || fileExists(`${cwd}/bun.lock`)) return 'bun';
   if (fileExists(`${cwd}/pnpm-lock.yaml`)) return 'pnpm';
   if (fileExists(`${cwd}/yarn.lock`)) return 'yarn';
   return 'npm';
}

/** Get the lockfile filename for a given package manager */
export function getLockfileName(pm: PackageManager): string {
   switch (pm) {
      case 'bun':
         return 'bun.lock';
      case 'pnpm':
         return 'pnpm-lock.yaml';
      case 'yarn':
         return 'yarn.lock';
      case 'npm':
         return 'package-lock.json';
   }
}

/** Get the run command prefix for the detected package manager */
export function getRunPrefix(pm: PackageManager): string {
   switch (pm) {
      case 'bun':
         return 'bun run';
      case 'pnpm':
         return 'pnpm run';
      case 'yarn':
         return 'yarn run';
      case 'npm':
         return 'npm run';
   }
}

/** Install devDependencies using the detected package manager (latest versions) */
export async function installDevDeps(
   packages: string[],
   cwd: string,
   pm?: PackageManager,
): Promise<void> {
   const manager = pm ?? detectPackageManager(cwd);

   const pkg = readJson<Record<string, unknown>>(path.join(cwd, 'package.json'));
   if (!pkg) {
      throw new Error('package.json not found');
   }

   const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
   const missing = packages.filter(pkg => !devDeps[pkg]);

   if (missing.length === 0) return;

   const addCmd = manager === 'npm' ? 'npm install -D' : `${manager} add -D`;

   const exitCode = await new Promise<number | null>(resolve => {
      const child = spawn(`${addCmd} ${missing.join(' ')}`, {
         cwd,
         shell: true,
         stdio: 'inherit',
      });

      const timer = setTimeout(() => {
         child.kill();
         resolve(null);
      }, 120_000);

      child.on('close', code => {
         clearTimeout(timer);
         resolve(code);
      });

      child.on('error', () => {
         clearTimeout(timer);
         resolve(1);
      });
   });

   if (exitCode === null) {
      throw new Error('Dependency installation timed out (120s)');
   }
   if (exitCode !== 0) {
      throw new Error(`Dependency installation failed (exit code ${exitCode})`);
   }
}
