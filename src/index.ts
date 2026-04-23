import { program } from 'commander';
import { registerFmtCommand } from './commands/fmt';
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
registerVscodeCommand(program);
registerVpnCommand(program);
registerShowCommand(program);
registerUpdateCommand(program);

program
   .command('set')
   .description('Set proxy env vars using key=value pairs')
   .argument('[args...]', 'key=value pairs (e.g. https_proxy=http://127.0.0.1:7890)')
   .action((args: string[]) => handleSet(args));

program
   .command('unset')
   .description('Clear stored proxy configuration')
   .action(() => handleUnset());

program.parse();
