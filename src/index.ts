import { program } from 'commander';
import { registerFmtCommand } from './commands/fmt';
import { registerUpdateCommand } from './commands/update';
import { registerVscodeCommand } from './commands/vscode';
import { registerVpnCommand } from './commands/vpn';
import { getCurrentVersion } from './utils/version';

program
   .name('lux')
   .description('One-click project formatting & VSCode config CLI')
   .version(getCurrentVersion());

registerFmtCommand(program);
registerVscodeCommand(program);
registerVpnCommand(program);
registerUpdateCommand(program);

program.parse();
