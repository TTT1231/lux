import { spawnSync } from 'node:child_process';
import type { Command } from 'commander';
import { logger } from '../utils/logger';
import { clearEnvConfig, getEnvConfig, setEnvConfig } from '../utils/config';

const ALLOWED_KEYS = ['https_proxy', 'http_proxy', 'all_proxy'] as const;
type ProxyKey = (typeof ALLOWED_KEYS)[number];

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

function copyToClipboard(text: string): boolean {
   const result = spawnSync('clip', [], { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
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

function isValidKey(key: string): key is ProxyKey {
   return ALLOWED_KEYS.includes(key as ProxyKey);
}

export function handleSet(args: string[]): void {
   if (args.length === 0) {
      logger.log('Usage: lux set <key=value> [key=value ...]');
      return;
   }

   const existing = getEnvConfig();
   const merged = { ...existing };

   for (const arg of args) {
      if (!arg.includes('=')) {
         logger.error(
            `Invalid format: "${arg}". Use key=value (e.g. https_proxy=http://127.0.0.1:7890)`,
         );
         return;
      }

      const eqIndex = arg.indexOf('=');
      const key = arg.slice(0, eqIndex);
      const value = arg.slice(eqIndex + 1).replace(/^["']|["']$/g, '');

      if (!isValidKey(key)) {
         logger.error(`Invalid key: "${key}". Allowed keys: ${ALLOWED_KEYS.join(', ')}`);
         return;
      }

      merged[key] = value;
   }

   setEnvConfig(merged);
   logger.success('Set successfully');
}

export function handleUnset(): void {
   clearEnvConfig();
   logger.success('Proxy configuration cleared');
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
