import { program } from 'commander';
import { registerFmtCommand } from './commands/fmt';
import { registerInitCommand } from './commands/init';
import { registerShowCommand } from './commands/show';
import { registerUpdateCommand } from './commands/update';
import { registerVscodeCommand } from './commands/vscode';
import { registerVpnCommand, handleSet, handleUnset } from './commands/vpn';
import { getCurrentVersion } from './utils/version';

program
   .name('lux')
   .description('One-click project formatting & VSCode config CLI')
   .version(getCurrentVersion());

registerFmtCommand(program);
registerInitCommand(program);
registerVscodeCommand(program);
registerVpnCommand(program);
registerShowCommand(program);
registerUpdateCommand(program);

program
   .command('set')
   .description('Set config values using key=value pairs (proxy, lux_package_manager)')
   .argument(
      '[args...]',
      'key=value pairs (e.g. https_proxy=http://127.0.0.1:7890, lux_package_manager=pnpm)',
   )
   .action((args: string[]) => handleSet(args));

program
   .command('unset')
   .description('Clear stored configuration')
   .action(() => handleUnset());

program.parse();
