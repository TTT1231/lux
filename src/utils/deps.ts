import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileExists, readJson, writeJson } from './fs';
import { execFileNoThrow } from './execFileNoThrow';

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

/**
 * Fetch the latest version of a package from npm registry.
 * Takes the last non-empty line of stdout to handle npm warnings.
 */
async function fetchPackageVersion(pkg: string): Promise<string> {
   const { stdout, exitCode } = await execFileNoThrow('npm', ['view', pkg, 'version']);

   if (exitCode !== 0 || !stdout) {
      throw new Error(`Failed to fetch version for "${pkg}" from npm registry.`);
   }

   const lines = stdout.split('\n').filter(line => line.trim().length > 0);
   return lines[lines.length - 1]!.trim();
}

/**
 * Add devDependencies to package.json with latest version (e.g. "^9.25.0")
 * without actually installing them to node_modules.
 * Returns the list of packages that were actually added.
 */
export async function addDepsToManifest(packages: string[], cwd: string): Promise<string[]> {
   const pkgPath = path.join(cwd, 'package.json');
   const pkg = readJson<Record<string, unknown>>(pkgPath);
   if (!pkg) {
      throw new Error('package.json not found');
   }

   const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
   const missing = packages.filter(p => !devDeps[p]);

   if (missing.length === 0) return [];

   const results = await Promise.all(
      missing.map(async pkgName => {
         const version = await fetchPackageVersion(pkgName);
         return { pkgName, version };
      }),
   );

   const updatedDevDeps = { ...devDeps };
   for (const { pkgName, version } of results) {
      updatedDevDeps[pkgName] = `^${version}`;
   }

   pkg.devDependencies = updatedDevDeps;
   writeJson(pkgPath, pkg);

   return results.map(r => r.pkgName);
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
