import { spawnSync } from 'node:child_process';
import type { Command } from 'commander';
import { logger } from '../utils/logger';

const DEFAULT_PROXY = 'http://127.0.0.1:9876';

function buildCommands(shell: 'cmd' | 'pw', httpProxy: string, socksProxy: string): string {
   if (shell === 'cmd') {
      return [
         `set https_proxy=${httpProxy}`,
         `set http_proxy=${httpProxy}`,
         `set all_proxy=${socksProxy}`,
      ].join('\r\n');
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

function parseProxy(proxy: string): { httpProxy: string; socksProxy: string } {
   const url = new URL(proxy.includes('://') ? proxy : `http://${proxy}`);
   return {
      httpProxy: url.href,
      socksProxy: `socks5://${url.hostname}:${url.port}`,
   };
}

const SHELL_LABELS: Record<'cmd' | 'pw', string> = {
   cmd: 'CMD',
   pw: 'PowerShell',
};

function handleCopy(shell: 'cmd' | 'pw', proxy: string): void {
   const { httpProxy, socksProxy } = parseProxy(proxy);
   const commands = buildCommands(shell, httpProxy, socksProxy);

   if (copyToClipboard(commands)) {
      logger.success(`已复制到剪贴板，Ctrl+V 粘贴到 ${SHELL_LABELS[shell]} 即可`);
   } else {
      logger.error('复制到剪贴板失败');
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
}
