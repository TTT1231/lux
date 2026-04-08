import type { Command } from 'commander';
import { execFileNoThrow } from '../utils/execFileNoThrow';
import { logger } from '../utils/logger';
import { PACKAGE_NAME, getCurrentVersion } from '../utils/version';

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

/**
 * Fetch the latest published version from npm registry.
 * Takes the last non-empty line of stdout to handle npm warnings.
 */
export async function fetchLatestVersion(): Promise<string> {
   const { stdout, exitCode } = await execFileNoThrow('npm', ['view', PACKAGE_NAME, 'version']);

   if (exitCode !== 0 || !stdout) {
      throw new Error(`Failed to fetch latest version from npm registry.`);
   }

   const lines = stdout.split('\n').filter(line => line.trim().length > 0);
   return lines[lines.length - 1]!.trim();
}

/**
 * Perform the global update using the detected package manager.
 */
async function performUpdate(pm: GlobalPm): Promise<void> {
   const [command, args] = GLOBAL_UPDATE_CMDS[pm];
   const { exitCode, stderr } = await execFileNoThrow(command, args);

   if (exitCode !== 0) {
      const hint = /EACCES|permission/i.test(stderr)
         ? '\nTry running with elevated privileges (e.g. sudo).'
         : '';
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
            logger.info('Checking for updates...');

            const current = getCurrentVersion();
            const latest = await fetchLatestVersion();

            if (current === latest) {
               logger.success(`Already up to date (v${current})`);
               return;
            }

            if (options.check) {
               logger.info(`New version available: v${latest} (current: v${current})`);
               logger.info(`Run \`lux update\` to update.`);
               return;
            }

            const pm = detectGlobalPackageManager();
            logger.info(`Updating via ${pm}...`);

            await performUpdate(pm);
            logger.success(`Successfully updated to v${latest}`);
         } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(message);
            logger.warn(`You can also update manually: npm install -g ${PACKAGE_NAME}@latest`);
         }
      });
}
