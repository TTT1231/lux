import { fileExists } from './fs';
import { resolveVersions } from '../presets/versions';
import { execFileNoThrow } from './execFileNoThrow';

export type PackageManager = 'bun' | 'pnpm' | 'yarn' | 'npm';

/** Detect package manager from lockfile in the given directory */
export function detectPackageManager(cwd: string): PackageManager {
   if (fileExists(`${cwd}/bun.lockb`) || fileExists(`${cwd}/bun.lock`)) return 'bun';
   if (fileExists(`${cwd}/pnpm-lock.yaml`)) return 'pnpm';
   if (fileExists(`${cwd}/yarn.lock`)) return 'yarn';
   return 'npm';
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

/** Maps package managers to their install command parts */
const INSTALL_CMDS: Record<PackageManager, [string, string[]]> = {
   bun: ['bun', ['add']],
   pnpm: ['pnpm', ['add']],
   yarn: ['yarn', ['add']],
   npm: ['npm', ['install']],
};

/** Install devDependencies using the detected package manager */
export async function installDevDeps(
   packages: string[],
   cwd: string,
   pm?: PackageManager,
): Promise<void> {
   const manager = pm ?? detectPackageManager(cwd);
   const resolvedPackages = resolveVersions(packages);

   const [command, subcommand] = INSTALL_CMDS[manager];
   const args = [...subcommand, '-D', ...resolvedPackages];

   const { stderr, exitCode } = await execFileNoThrow(command, args, { cwd });

   if (exitCode !== 0) {
      throw new Error(`Dependency installation failed (exit code ${exitCode})`);
   }
}
