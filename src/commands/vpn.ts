import { spawnSync } from 'node:child_process';
import type { Command } from 'commander';
import { logger } from '../utils/logger';

const DEFAULT_PROXY = 'http://127.0.0.1:9876';

export type Shell = 'cmd' | 'pw' | 'bash';

export function buildCommands(shell: Shell, httpProxy: string, socksProxy: string): string {
   if (shell === 'cmd') {
      return [
         `set https_proxy=${httpProxy}`,
         `set http_proxy=${httpProxy}`,
         `set all_proxy=${socksProxy}`,
      ].join('\r\n');
   }

   if (shell === 'bash') {
      return [
         `export https_proxy=${httpProxy}`,
         `export http_proxy=${httpProxy}`,
         `export all_proxy=${socksProxy}`,
      ].join('\n');
   }

   return [
      `$env:https_proxy="${httpProxy}"`,
      `$env:http_proxy="${httpProxy}"`,
      `$env:all_proxy="${socksProxy}"`,
   ].join('\r\n');
}

function copyToClipboard(text: string): boolean {
   const result = spawnSync('clip', [], { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
   return result.status === 0;
}

export function parseProxy(proxy: string): { httpProxy: string; socksProxy: string } {
   const url = new URL(proxy.includes('://') ? proxy : `http://${proxy}`);
   return {
      httpProxy: url.href,
      socksProxy: `socks5://${url.hostname}:${url.port}`,
   };
}

const SHELL_LABELS: Record<Shell, string> = {
   cmd: 'CMD',
   pw: 'PowerShell',
   bash: 'Bash',
};

function handleCopy(shell: Shell, proxy: string): void {
   const { httpProxy, socksProxy } = parseProxy(proxy);
   const commands = buildCommands(shell, httpProxy, socksProxy);

   if (copyToClipboard(commands)) {
      logger.log(`Copied to clipboard — paste in ${SHELL_LABELS[shell]}`);
   } else {
      logger.error('Failed to copy to clipboard');
      console.log(commands);
   }
}

export function registerVpnCommand(program: Command): void {
   const vpn = program.command('vpn');

   vpn.command('cmd')
      .description('Copy CMD proxy commands to clipboard')
      .option('--proxy <addr>', 'Proxy address', DEFAULT_PROXY)
      .action((options: { proxy: string }) => handleCopy('cmd', options.proxy));

   vpn.command('pw')
      .description('Copy PowerShell proxy commands to clipboard')
      .option('--proxy <addr>', 'Proxy address', DEFAULT_PROXY)
      .action((options: { proxy: string }) => handleCopy('pw', options.proxy));

   vpn.command('bash')
      .description('Copy Bash proxy commands to clipboard')
      .option('--proxy <addr>', 'Proxy address', DEFAULT_PROXY)
      .action((options: { proxy: string }) => handleCopy('bash', options.proxy));
}
