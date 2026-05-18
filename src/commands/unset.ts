import type { Command } from 'commander';
import { logger } from '../utils/logger';
import { clearEnvConfig } from '../utils/config';

export function handleUnset(): void {
   clearEnvConfig();
   logger.success('Configuration cleared');
}

/**
 * 目前支持的配置项：
 * - https_proxy: 用于 HTTPS 请求的代理地址（例如 http://
 * - http_proxy: 用于 HTTP 请求的代理地址（例如 http://
 * - all_proxy: 用于所有请求的代理地址（例如 http://
 * - lux_package_manager: 指定 lux 使用的包管理器（auto、bun、pnpm、yarn、npm）
 *   auto: 根据lockfile自动选择
 *
 *  !其他的配置项不处理
 */
export function registerUnsetCommand(program: Command): void {
   program
      .command('unset')
      .description('Clear stored configuration')
      .action(() => handleUnset());
}
