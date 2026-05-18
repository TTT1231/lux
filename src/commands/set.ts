import type { Command } from 'commander';
import { logger } from '../utils/logger';
import { getEnvConfig, setEnvConfig } from '../utils/config';

const ALLOWED_KEYS = ['https_proxy', 'http_proxy', 'all_proxy', 'lux_package_manager'] as const;
const VALID_PM_VALUES = ['auto', 'bun', 'pnpm', 'yarn', 'npm'] as const;
type ConfigKey = (typeof ALLOWED_KEYS)[number];

function isValidKey(key: string): key is ConfigKey {
   return ALLOWED_KEYS.includes(key as ConfigKey);
}

/**
 * 目前支持的配置项：
 * - https_proxy: 用于 HTTPS 请求的代理地址（例如 http://
 * - http_proxy: 用于 HTTP 请求的代理地址（例如 http://
 * - all_proxy: 用于所有请求的代理地址（例如 http://
 * - lux_package_manager: 指定 lux 使用的包管理器（auto、bun、pnpm、yarn、npm）
 *   auto: 根据lockfile自动选择
 *
 * !其他的配置项不处理
 */
export function handleSet(args: string[]): void {
   if (args.length === 0) {
      logger.log('Usage: lux set <key=value> [key=value ...]');
      return;
   }

   const existing = getEnvConfig();
   const merged = { ...existing };

   for (const arg of args) {
      if (!arg.includes('=')) {
         logger.error(`Invalid format: "${arg}". Use key=value (e.g. https_proxy="http://127.0.0.1:7890")`);
         return;
      }

      const eqIndex = arg.indexOf('=');
      const key = arg.slice(0, eqIndex);
      const value = arg.slice(eqIndex + 1).replace(/^["']|["']$/g, '');

      if (!isValidKey(key)) {
         logger.error(`Invalid key: "${key}". Allowed keys: ${ALLOWED_KEYS.join(', ')}`);
         return;
      }

      if (key === 'lux_package_manager' && !VALID_PM_VALUES.includes(value as (typeof VALID_PM_VALUES)[number])) {
         logger.error(`Invalid package manager: "${value}". Allowed values: ${VALID_PM_VALUES.join(', ')}`);
         return;
      }

      merged[key] = value;
   }

   setEnvConfig(merged);
   logger.success('Set successfully');
}

export function registerSetCommand(program: Command): void {
   program
      .command('set')
      .description('Set config values using key=value pairs (proxy, lux_package_manager)')
      .argument('[args...]', 'key=value pairs (e.g. https_proxy="http://127.0.0.1:7890", lux_package_manager=pnpm)')
      .action((args: string[]) => handleSet(args));
}
