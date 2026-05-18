import { spawnSync } from 'node:child_process';
import type { Command } from 'commander';
import { logger } from '../utils/logger';
import { getEnvConfig } from '../utils/config';
import { getPlatform, type Platform } from '../utils/platform';

export type Shell = 'cmd' | 'pw' | 'bash';

export function buildCommands(shell: Shell, env: Record<string, string>): string {
   const entries = Object.entries(env);

   if (shell === 'cmd') {
      return entries.map(([k, v]) => `set ${k}=${v}`).join(' && ');
   }

   if (shell === 'bash') {
      return entries.map(([k, v]) => `export ${k}="${v}"`).join(' && ');
   }

   return entries.map(([k, v]) => `$env:${k}="${v}"`).join(' ; ');
}

const CLIPBOARD_COMMANDS: Record<Platform, string> = {
   win32: 'clip',
   darwin: 'pbcopy',
   linux: 'xclip',
};

export function copyToClipboard(text: string): boolean {
   const cmd = CLIPBOARD_COMMANDS[getPlatform()];
   const result = spawnSync(cmd, [], { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
   return result.status === 0;
}

const SHELL_LABELS: Record<Shell, string> = {
   cmd: 'CMD',
   pw: 'PowerShell',
   bash: 'Bash',
};

function handleCopy(shell: Shell): void {
   const config = getEnvConfig();

   if (Object.keys(config).length === 0) {
      logger.warn('No proxy configured. Run `lux set https_proxy=<address>` to configure.');
      return;
   }

   const commands = buildCommands(shell, config);
   if (copyToClipboard(commands)) {
      logger.log(`Copied to clipboard — paste in ${SHELL_LABELS[shell]}`);
   } else {
      logger.error('Failed to copy to clipboard');
      logger.log(commands);
   }
}

export function registerVpnCommand(program: Command): void {
   const vpn = program.command('vpn');

   vpn.command('cmd')
      .description('Copy CMD proxy commands to clipboard')
      .action(() => handleCopy('cmd'));

   vpn.command('pw')
      .description('Copy PowerShell proxy commands to clipboard')
      .action(() => handleCopy('pw'));

   vpn.command('bash')
      .description('Copy Bash proxy commands to clipboard')
      .action(() => handleCopy('bash'));
}
