import { program } from 'commander';
import { registerFmtCommand } from './commands/fmt';
import { registerInitCommand } from './commands/init';
import { registerShowCommand } from './commands/show';
import { registerUpdateCommand } from './commands/update';
import { registerVscodeCommand } from './commands/vscode';
import { registerVpnCommand } from './commands/vpn';
import { registerSetCommand } from './commands/set';
import { registerUnsetCommand } from './commands/unset';
import { getCurrentVersion } from './utils/version';

program.name('lux').description('One-click project formatting & VSCode config CLI').version(getCurrentVersion());

registerFmtCommand(program);
registerInitCommand(program);
registerVscodeCommand(program);
registerVpnCommand(program);
registerShowCommand(program);
registerUpdateCommand(program);
registerSetCommand(program);
registerUnsetCommand(program);

program.parse();
