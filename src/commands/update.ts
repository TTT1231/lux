import type { Command } from 'commander';
import { execFileNoThrow } from '../utils/execFileNoThrow';
import { logger } from '../utils/logger';
import { PACKAGE_NAME, getCurrentVersion } from '../utils/version';

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

type GlobalPm = 'npm' | 'bun';

const GLOBAL_UPDATE_CMDS: Record<GlobalPm, [string, string[]]> = {
   npm: ['npm', ['install', '-g', `${PACKAGE_NAME}@latest`]],
   bun: ['bun', ['install', '-g', `${PACKAGE_NAME}@latest`]],
};

/**
 * Detect which package manager owns the global install by checking the runtime.
 * Bun-installed CLIs run under the Bun runtime; npm-installed ones run under Node.
 */
export function detectGlobalPackageManager(): GlobalPm {
   return process.execPath.toLowerCase().includes('bun') ? 'bun' : 'npm';
}

export async function fetchLatestVersion(): Promise<string> {
   const res = await fetch(`${DEFAULT_REGISTRY}/${PACKAGE_NAME}/latest`, {
      signal: AbortSignal.timeout(15_000),
   });

   if (!res.ok) {
      throw new Error(`Failed to fetch latest version from ${DEFAULT_REGISTRY}.`);
   }

   const data = (await res.json()) as { version?: string };
   if (!data.version) {
      throw new Error(`Unexpected response: missing version field`);
   }
   return data.version;
}

/**
 * Perform the global update using the detected package manager.
 */
async function performUpdate(pm: GlobalPm): Promise<void> {
   const [command, args] = GLOBAL_UPDATE_CMDS[pm];
   const { exitCode, stderr } = await execFileNoThrow(command, args);

   if (exitCode !== 0) {
      const hint = /EACCES|permission/i.test(stderr) ? '\nTry running with elevated privileges (e.g. sudo).' : '';
      throw new Error(`Update failed: ${stderr}${hint}`);
   }
}

export function registerUpdateCommand(program: Command): void {
   program
      .command('update')
      .description('Update @luxkit/cli to the latest version')
      .option('--check', 'Only check for updates without installing')
      .action(async (options: { check?: boolean }) => {
         try {
            const current = getCurrentVersion();
            const latest = await fetchLatestVersion();

            if (current === latest) {
               logger.log(`Already up to date (v${current})`);
               return;
            }

            if (options.check) {
               logger.log(`Update available: v${current} → v${latest}`);
               return;
            }

            const pm = detectGlobalPackageManager();
            await performUpdate(pm);
            logger.log(`Updated to v${latest}`);
         } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(message);
            logger.warn(`You can also update manually: npm install -g ${PACKAGE_NAME}@latest`);
         }
      });
}
