import { program } from 'commander'
import { registerFmtCommand } from './commands/fmt'
import { registerVscodeCommand } from './commands/vscode'

program
  .name('trw1')
  .description('One-click project formatting & VSCode config CLI')
  .version('1.0.0')

registerFmtCommand(program)
registerVscodeCommand(program)

program.parse()
