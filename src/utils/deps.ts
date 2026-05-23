import { homedir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileExists, readJson, writeJson, readFile } from './fs';
import { getEnvConfig } from './config';
import { logger } from './logger';

export type PackageManager = 'bun' | 'pnpm' | 'yarn' | 'npm';

const PM_LOCKFILE_MAP: Record<PackageManager, string[]> = {
   bun: ['bun.lockb', 'bun.lock'],
   pnpm: ['pnpm-lock.yaml'],
   yarn: ['yarn.lock'],
   npm: ['package-lock.json'],
};

function detectFromLockfile(cwd: string): PackageManager {
   if (fileExists(`${cwd}/bun.lockb`) || fileExists(`${cwd}/bun.lock`)) return 'bun';
   if (fileExists(`${cwd}/pnpm-lock.yaml`)) return 'pnpm';
   if (fileExists(`${cwd}/yarn.lock`)) return 'yarn';
   return 'npm';
}

/** Detect package manager from global config or lockfile in the given directory */
export function detectPackageManager(cwd: string): PackageManager {
   const env = getEnvConfig();
   const configured = env.lux_package_manager;

   if (configured && configured !== 'auto') {
      const pm = configured as PackageManager;
      const lockfiles = PM_LOCKFILE_MAP[pm] ?? [];
      const hasMatch = lockfiles.some(f => fileExists(`${cwd}/${f}`));
      if (!hasMatch) {
         const detected = detectFromLockfile(cwd);
         if (detected !== 'npm') {
            logger.warn(`Global config is ${pm} but detected ${detected} lockfile`);
         }
      }
      return pm;
   }

   return detectFromLockfile(cwd);
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

/** Get the exec command prefix for the detected package manager (npx/bunx/pnpx) */
export function getExecPrefix(pm: PackageManager): string {
   switch (pm) {
      case 'bun':
         return 'bunx';
      case 'pnpm':
         return 'pnpx';
      case 'yarn':
         return 'yarn dlx';
      case 'npm':
         return 'npx';
   }
}

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

function readRegistryFromNpmrc(dir: string): string | null {
   const content = readFile(path.join(dir, '.npmrc'));
   if (!content) return null;

   for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
      const match = /^registry\s*=\s*(.+)$/.exec(trimmed);
      if (match) return match[1]!.trim().replace(/\/+$/, '');
   }
   return null;
}

function resolveRegistry(cwd: string): string {
   return readRegistryFromNpmrc(cwd) ?? readRegistryFromNpmrc(homedir()) ?? DEFAULT_REGISTRY;
}

async function fetchPackageVersion(pkg: string, registry: string): Promise<string> {
   const res = await fetch(`${registry}/${pkg}/latest`, {
      signal: AbortSignal.timeout(15_000),
   });

   if (!res.ok) {
      throw new Error(`Failed to fetch version for "${pkg}" from ${registry}.`);
   }

   const data = (await res.json()) as { version?: string };
   if (!data.version) {
      throw new Error(`Unexpected response for "${pkg}": missing version field`);
   }
   return data.version;
}

/**
 * Add devDependencies to package.json with latest version (e.g. "^9.25.0")
 * without actually installing them to node_modules.
 * Returns the list of packages that were actually added.
 */
export async function addDepsToManifest(
   packages: string[],
   cwd: string,
   pinnedVersions?: Record<string, string>,
): Promise<string[]> {
   const pkgPath = path.join(cwd, 'package.json');
   const pkg = readJson<Record<string, unknown>>(pkgPath);
   if (!pkg) {
      throw new Error('package.json not found');
   }

   const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
   const missing = packages.filter(p => !devDeps[p]);

   if (missing.length === 0) return [];

   const registry = resolveRegistry(cwd);
   const results = await Promise.all(
      missing.map(async pkgName => {
         const pinned = pinnedVersions?.[pkgName];
         if (pinned && pinned !== '<latest>') {
            return { pkgName, version: pinned.replace(/^[\^~]/, '') };
         }
         const version = await fetchPackageVersion(pkgName, registry);
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
export async function installDevDeps(packages: string[], cwd: string, pm?: PackageManager): Promise<void> {
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
