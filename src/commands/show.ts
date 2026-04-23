import type { Command } from 'commander';
import { logger } from '../utils/logger';
import { getEnvConfig } from '../utils/config';

function handleShowEnv(): void {
   const config = getEnvConfig();
   const entries = Object.entries(config);

   if (entries.length === 0) {
      logger.log('No env config.');
      return;
   }

   for (const [key, value] of entries) {
      logger.log(`${key}=${value}`);
   }
}

export function registerShowCommand(program: Command): void {
   const show = program.command('show');

   show
      .command('env')
      .description('Display stored proxy environment variables')
      .action(() => handleShowEnv());
}
